<?php

namespace App\Actions\Expenses;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\ApplyCashTransaction;
use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Ledgers\LedgerTimestamp;
use App\Actions\Ledgers\NextDocumentNumber;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class PostExpense
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyCashTransaction $cash, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    public function handle(Store $store, User $actor, int $categoryId, int $accountId, string $amount, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): Expense
    {
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(['category_id' => $categoryId, 'account_id' => $accountId, 'amount' => $amount, 'occurred_at' => $date->toISOString(), 'notes' => $notes]);

        try {
            return DB::transaction(function () use ($store, $actor, $categoryId, $accountId, $amount, $date, $notes, $idempotencyKey, $requestHash, $ipAddress): Expense {
                $existing = $this->idempotency->existing(fn (): ?Expense => Expense::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing !== null) {
                    return $existing;
                }
                $category = ExpenseCategory::query()->where(['id' => $categoryId, 'store_id' => $store->id, 'is_active' => true])->firstOrFail();
                $account = FinancialAccount::query()->where(['id' => $accountId, 'store_id' => $store->id, 'is_active' => true])->firstOrFail();
                $expense = Expense::create([
                    'store_id' => $store->id, 'expense_category_id' => $category->id, 'financial_account_id' => $account->id,
                    'document_number' => $this->numbers->handle($store->id, 'exp', $date),
                    'category_name' => $category->name, 'account_name' => $account->name, 'amount' => $amount,
                    'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash, 'occurred_at' => $date,
                    'notes' => $notes, 'created_by_user_id' => $actor->id, 'posted_at' => now(),
                ]);
                $this->cash->handle($store->id, $account->id, 'out', $amount, 'expense', $expense, $date, $actor, $notes);
                $this->audit->handle($actor, 'expense.posted', $expense, $store, $ipAddress, ['document_number' => $expense->document_number, 'amount' => $amount]);

                return $expense;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?Expense => Expense::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->first(), $requestHash, $exception);
        }
    }
}
