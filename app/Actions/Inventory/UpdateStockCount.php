<?php

namespace App\Actions\Inventory;

use App\Actions\Audit\RecordAudit;
use App\Enums\StockCountStatus;
use App\Models\InventoryBalance;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Models\Store;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UpdateStockCount
{
    public function __construct(private RecordAudit $audit) {}

    /** @param array<int, array{product_id:string, counted_quantity:?string}> $items */
    public function save(Store $store, StockCount $stockCount, User $actor, array $items, ?string $ipAddress = null): void
    {
        DB::transaction(function () use ($store, $stockCount, $actor, $items, $ipAddress): void {
            $locked = $this->lockDraft($store, $stockCount);
            $identities = InventoryBalance::query()->where('inventory_balances.store_id', $store->id)
                ->join('products', 'products.id', '=', 'inventory_balances.product_id')
                ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_balances.product_variant_id')
                ->where(fn ($query) => $query->whereIn('products.public_id', array_column($items, 'product_id'))->whereNull('inventory_balances.product_variant_id')
                    ->orWhereIn('product_variants.public_id', array_column($items, 'product_id')))
                ->get(['inventory_balances.product_id', 'inventory_balances.product_variant_id', 'products.public_id as product_public_id', 'product_variants.public_id as variant_public_id'])
                ->keyBy(fn (InventoryBalance $balance): string => (string) ($balance->getAttribute('variant_public_id') ?? $balance->getAttribute('product_public_id')));

            if ($identities->count() !== count($items)) {
                throw ValidationException::withMessages(['items' => 'Salah satu produk tidak termasuk toko aktif.']);
            }

            foreach ($items as $index => $input) {
                $identity = $identities->get($input['product_id']);
                $item = StockCountItem::query()
                    ->where(['store_id' => $store->id, 'stock_count_id' => $locked->id, 'product_id' => $identity->product_id])
                    ->where('product_variant_id', $identity->product_variant_id)
                    ->lockForUpdate()
                    ->first();
                if ($item === null) {
                    throw ValidationException::withMessages(["items.{$index}.product_id" => 'Produk tidak terdapat dalam sesi opname ini.']);
                }
                $countedQuantity = $input['counted_quantity'];
                $item->update([
                    'counted_quantity' => $countedQuantity,
                    'difference_quantity' => $countedQuantity === null
                        ? null
                        : Decimal::subtract($countedQuantity, (string) $item->system_quantity, Decimal::QUANTITY_SCALE),
                ]);
            }

            $this->audit->handle($actor, 'stock_count.saved', $locked, $store, $ipAddress, ['saved_items' => count($items)]);
        }, 3);
    }

    public function complete(Store $store, StockCount $stockCount, User $actor, ?string $ipAddress = null): void
    {
        DB::transaction(function () use ($store, $stockCount, $actor, $ipAddress): void {
            $locked = $this->lockDraft($store, $stockCount);
            $remaining = StockCountItem::query()
                ->where(['store_id' => $store->id, 'stock_count_id' => $locked->id])
                ->whereNull('counted_quantity')
                ->count();
            if ($remaining > 0) {
                throw ValidationException::withMessages(['items' => "Masih ada {$remaining} produk yang belum dihitung."]);
            }

            $locked->update([
                'status' => StockCountStatus::Counted,
                'completed_at' => now(),
                'completed_by_user_id' => $actor->id,
            ]);
            $this->audit->handle($actor, 'stock_count.completed', $locked, $store, $ipAddress);
        }, 3);
    }

    public function reopen(Store $store, StockCount $stockCount, User $actor, ?string $ipAddress = null): void
    {
        DB::transaction(function () use ($store, $stockCount, $actor, $ipAddress): void {
            $locked = $this->lock($store, $stockCount);
            if ($locked->status !== StockCountStatus::Counted) {
                throw ValidationException::withMessages(['stock_count' => 'Hanya opname selesai dihitung yang dapat dibuka kembali.']);
            }
            $locked->update(['status' => StockCountStatus::Draft, 'completed_at' => null, 'completed_by_user_id' => null]);
            $this->audit->handle($actor, 'stock_count.reopened', $locked, $store, $ipAddress);
        }, 3);
    }

    public function cancel(Store $store, StockCount $stockCount, User $actor, ?string $ipAddress = null): void
    {
        DB::transaction(function () use ($store, $stockCount, $actor, $ipAddress): void {
            $locked = $this->lock($store, $stockCount);
            if (! in_array($locked->status, [StockCountStatus::Draft, StockCountStatus::Counted], true)) {
                throw ValidationException::withMessages(['stock_count' => 'Opname ini tidak dapat dibatalkan.']);
            }
            $locked->update([
                'status' => StockCountStatus::Cancelled,
                'cancelled_at' => now(),
                'cancelled_by_user_id' => $actor->id,
            ]);
            $this->audit->handle($actor, 'stock_count.cancelled', $locked, $store, $ipAddress);
        }, 3);
    }

    private function lockDraft(Store $store, StockCount $stockCount): StockCount
    {
        $locked = $this->lock($store, $stockCount);
        if ($locked->status !== StockCountStatus::Draft) {
            throw ValidationException::withMessages(['stock_count' => 'Penghitungan hanya dapat diubah saat opname berstatus Draft.']);
        }

        return $locked;
    }

    private function lock(Store $store, StockCount $stockCount): StockCount
    {
        return StockCount::query()->where(['id' => $stockCount->id, 'store_id' => $store->id])->lockForUpdate()->firstOrFail();
    }
}
