<?php

namespace App\Actions\Ledgers;

use App\Actions\Audit\RecordAudit;
use App\Models\CashTransaction;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountBalance;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

class PostOpeningCash
{
    public function __construct(private ApplyCashTransaction $cash, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    public function handle(Store $store, User $actor, int $accountId, string $amount, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): CashTransaction
    {
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(['account_id' => $accountId, 'amount' => $amount, 'occurred_at' => $date->toISOString(), 'notes' => $notes]);

        try {
            return DB::transaction(function () use ($store, $actor, $accountId, $amount, $date, $notes, $idempotencyKey, $requestHash, $ipAddress): CashTransaction {
                FinancialAccount::query()->where(['id' => $accountId, 'store_id' => $store->id])->firstOrFail();
                DB::table('financial_account_balances')->insertOrIgnore([
                    'store_id' => $store->id, 'financial_account_id' => $accountId, 'balance' => 0,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                FinancialAccountBalance::query()->where(['store_id' => $store->id, 'financial_account_id' => $accountId])->lockForUpdate()->firstOrFail();
                $existing = $this->idempotency->existing(fn (): ?CashTransaction => CashTransaction::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing) {
                    return $existing;
                }
                $transaction = $this->cash->handle($store->id, $accountId, 'in', $amount, 'opening_balance', null, $date, $actor, $notes, $idempotencyKey, $requestHash, true);
                $this->audit->handle($actor, 'cash_opening.posted', $transaction, $store, $ipAddress, ['amount' => $amount]);

                return $transaction;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?CashTransaction => CashTransaction::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash, $exception);
        }
    }
}
