<?php

namespace App\Actions\Ledgers;

use App\Actions\Audit\RecordAudit;
use App\Models\CapitalTransaction;
use App\Models\CapitalTransactionItem;
use App\Models\FinancialAccount;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostCapitalTransaction
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyCashTransaction $cash, private ApplyStockMovement $stock, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    /** @param array<int, array{product_id:int, quantity:string, unit_cost?:string|null}> $items */
    public function handle(Store $store, User $actor, string $type, ?int $accountId, ?string $amount, array $items, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): CapitalTransaction
    {
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(['type' => $type, 'account_id' => $accountId, 'amount' => $amount, 'items' => $items, 'occurred_at' => $date->toISOString(), 'notes' => $notes]);

        try {
            return DB::transaction(function () use ($store, $actor, $type, $accountId, $amount, $items, $date, $notes, $idempotencyKey, $requestHash, $ipAddress): CapitalTransaction {
                $existing = $this->idempotency->existing(fn (): ?CapitalTransaction => CapitalTransaction::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing) {
                    return $existing;
                }
                if (! in_array($type, ['cash_contribution', 'cash_withdrawal', 'inventory_contribution', 'inventory_withdrawal'], true)) {
                    throw ValidationException::withMessages(['type' => 'Jenis transaksi modal tidak valid.']);
                }
                $cashType = str_starts_with($type, 'cash_');
                if ($cashType && ($accountId === null || $amount === null)) {
                    throw ValidationException::withMessages(['amount' => 'Akun dan nominal wajib diisi untuk modal kas.']);
                }
                if (! $cashType && $items === []) {
                    throw ValidationException::withMessages(['items' => 'Minimal satu produk wajib diisi untuk modal inventory.']);
                }
                if ($accountId !== null) {
                    FinancialAccount::query()->where(['id' => $accountId, 'store_id' => $store->id])->firstOrFail();
                }
                $capital = CapitalTransaction::create([
                    'store_id' => $store->id, 'document_number' => $this->numbers->handle($store->id, 'cap', $date),
                    'type' => $type, 'financial_account_id' => $cashType ? $accountId : null, 'total_value' => '0',
                    'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash, 'occurred_at' => $date, 'notes' => $notes,
                    'created_by_user_id' => $actor->id, 'posted_at' => now(),
                ]);
                $total = '0.0000';
                if ($cashType) {
                    $this->cash->handle($store->id, $accountId, $type === 'cash_contribution' ? 'in' : 'out', $amount, $type, $capital, $date, $actor, $notes);
                    $total = $amount;
                } else {
                    $incoming = $type === 'inventory_contribution';
                    foreach ($items as $item) {
                        if (Decimal::compare($item['quantity'], '0', Decimal::QUANTITY_SCALE) <= 0) {
                            throw ValidationException::withMessages(['items' => 'Kuantitas harus lebih besar dari nol.']);
                        }
                        Product::query()->where(['id' => $item['product_id'], 'store_id' => $store->id])->firstOrFail();
                        $quantityChange = $incoming ? $item['quantity'] : Decimal::subtract('0', $item['quantity'], Decimal::QUANTITY_SCALE);
                        $movement = $this->stock->handle($store->id, $item['product_id'], $quantityChange, $incoming ? ($item['unit_cost'] ?? null) : null, $type, $capital, $date, $actor, $notes);
                        $itemValue = Decimal::absolute($movement->value_change, Decimal::MONEY_SCALE);
                        CapitalTransactionItem::create([
                            'store_id' => $store->id, 'capital_transaction_id' => $capital->id, 'product_id' => $item['product_id'],
                            'quantity' => $item['quantity'], 'unit_cost' => $movement->unit_cost, 'total_value' => $itemValue,
                        ]);
                        $total = Decimal::add($total, $itemValue, Decimal::MONEY_SCALE);
                    }
                }
                DB::table('capital_transactions')->where('id', $capital->id)->update(['total_value' => $total]);
                $capital->total_value = $total;
                $this->audit->handle($actor, 'capital_transaction.posted', $capital, $store, $ipAddress, ['document_number' => $capital->document_number, 'type' => $type, 'total_value' => $total]);

                return $capital;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?CapitalTransaction => CapitalTransaction::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash, $exception);
        }
    }
}
