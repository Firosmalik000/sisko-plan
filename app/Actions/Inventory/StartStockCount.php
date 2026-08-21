<?php

namespace App\Actions\Inventory;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\NextDocumentNumber;
use App\Enums\StockCountStatus;
use App\Models\InventoryBalance;
use App\Models\StockCount;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StartStockCount
{
    public function __construct(private NextDocumentNumber $numbers, private RecordAudit $audit) {}

    public function handle(Store $store, User $actor, ?string $notes, ?string $ipAddress = null): StockCount
    {
        return DB::transaction(function () use ($store, $actor, $notes, $ipAddress): StockCount {
            Store::query()->whereKey($store->id)->lockForUpdate()->firstOrFail();

            $active = StockCount::query()
                ->where('store_id', $store->id)
                ->whereIn('status', [StockCountStatus::Draft->value, StockCountStatus::Counted->value])
                ->lockForUpdate()
                ->first();
            if ($active !== null) {
                throw ValidationException::withMessages([
                    'stock_count' => "Selesaikan {$active->document_number} sebelum memulai opname baru.",
                ]);
            }

            $products = InventoryBalance::query()
                ->where('inventory_balances.store_id', $store->id)
                ->join('products', 'products.id', '=', 'inventory_balances.product_id')
                ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_balances.product_variant_id')
                ->where('products.is_active', true)
                ->where(fn ($query) => $query->whereNull('inventory_balances.product_variant_id')->orWhere('product_variants.is_active', true))
                ->orderBy('inventory_balances.stock_key')
                ->get([
                    'inventory_balances.product_id', 'inventory_balances.product_variant_id',
                    'inventory_balances.quantity as system_quantity',
                    'inventory_balances.average_cost as snapshot_unit_cost',
                ]);

            if ($products->isEmpty()) {
                throw ValidationException::withMessages(['stock_count' => 'Belum ada produk persediaan aktif untuk dihitung.']);
            }

            $snapshotAt = now();
            $stockCount = StockCount::create([
                'store_id' => $store->id,
                'document_number' => $this->numbers->handle($store->id, 'opn', $snapshotAt),
                'status' => StockCountStatus::Draft,
                'snapshot_at' => $snapshotAt,
                'notes' => $notes,
                'created_by_user_id' => $actor->id,
            ]);

            $timestamp = now();
            DB::table('stock_count_items')->insert($products->map(fn (InventoryBalance $product): array => [
                'store_id' => $store->id,
                'stock_count_id' => $stockCount->id,
                'product_id' => $product->product_id,
                'product_variant_id' => $product->product_variant_id,
                'system_quantity' => $product->getAttribute('system_quantity'),
                'counted_quantity' => null,
                'difference_quantity' => null,
                'snapshot_unit_cost' => $product->getAttribute('snapshot_unit_cost'),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ])->all());

            $this->audit->handle($actor, 'stock_count.started', $stockCount, $store, $ipAddress, [
                'document_number' => $stockCount->document_number,
                'item_count' => $products->count(),
            ]);

            return $stockCount;
        }, 3);
    }
}
