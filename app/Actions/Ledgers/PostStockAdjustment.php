<?php

namespace App\Actions\Ledgers;

use App\Actions\Audit\RecordAudit;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockAdjustmentItem;
use App\Models\Store;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostStockAdjustment
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyStockMovement $stock, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    /** @param array<int, array{product_id:int, quantity:string, unit_cost?:string|null}> $items */
    public function handle(Store $store, User $actor, string $type, array $items, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): StockAdjustment
    {
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(['type' => $type, 'items' => $items, 'occurred_at' => $date->toISOString(), 'notes' => $notes]);

        try {
            return DB::transaction(function () use ($store, $actor, $type, $items, $date, $notes, $idempotencyKey, $requestHash, $ipAddress): StockAdjustment {
                $existing = $this->idempotency->existing(fn (): ?StockAdjustment => StockAdjustment::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing) {
                    return $existing;
                }
                if (! in_array($type, ['opening', 'increase', 'decrease', 'damaged', 'lost'], true)) {
                    throw ValidationException::withMessages(['type' => 'Jenis penyesuaian stok tidak valid.']);
                }
                $document = StockAdjustment::create([
                    'store_id' => $store->id, 'document_number' => $this->numbers->handle($store->id, 'adj', $date),
                    'type' => $type, 'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash, 'occurred_at' => $date,
                    'notes' => $notes, 'created_by_user_id' => $actor->id, 'posted_at' => now(),
                ]);
                $incoming = in_array($type, ['opening', 'increase'], true);
                $reason = match ($type) {
                    'opening' => 'opening_stock', 'increase' => 'adjustment_in', 'decrease' => 'adjustment_out',
                    'damaged' => 'damaged', default => 'lost',
                };
                foreach ($items as $item) {
                    if (Decimal::compare($item['quantity'], '0', Decimal::QUANTITY_SCALE) <= 0) {
                        throw ValidationException::withMessages(['items' => 'Kuantitas harus lebih besar dari nol.']);
                    }
                    Product::query()->where(['id' => $item['product_id'], 'store_id' => $store->id])->firstOrFail();
                    $quantity = $incoming ? $item['quantity'] : Decimal::subtract('0', $item['quantity'], Decimal::QUANTITY_SCALE);
                    $movement = $this->stock->handle($store->id, $item['product_id'], $quantity, $incoming ? ($item['unit_cost'] ?? null) : null, $reason, $document, $date, $actor, $notes, $type === 'opening');
                    StockAdjustmentItem::create([
                        'store_id' => $store->id, 'stock_adjustment_id' => $document->id, 'product_id' => $item['product_id'],
                        'quantity_change' => $movement->quantity_change, 'unit_cost' => $movement->unit_cost, 'value_change' => $movement->value_change,
                    ]);
                }
                $this->audit->handle($actor, 'stock_adjustment.posted', $document, $store, $ipAddress, ['document_number' => $document->document_number, 'type' => $type]);

                return $document;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?StockAdjustment => StockAdjustment::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash, $exception);
        }
    }
}
