<?php

namespace App\Support\Sync;

use App\Models\InventoryBalance;
use App\Models\ProductUnit;
use App\Models\Store;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Perakit snapshot katalog toko untuk bootstrap & delta pull (design §3.2, §5.3).
 *
 * Semua query store-scoped (tenant isolation, Req 7.1). ProductUnit dihidrasi
 * dengan relasi `product`/`unit` dan ringkasan stok `on_hand` dari
 * `inventory_balances` (keyed via `product:{id}` / `variant:{id}`), tanpa
 * mengekspos integer id internal balance.
 */
class StoreCatalogSnapshot
{
    /**
     * Product units milik store dengan `updated_at` lebih baru dari watermark
     * (strict `>`); watermark null → seluruh unit. Setiap unit mendapat atribut
     * `on_hand` (string decimal scale 6) atau null bila tidak ada balance.
     *
     * @return Collection<int, ProductUnit>
     */
    public function productUnits(Store $store, ?CarbonImmutable $since = null): Collection
    {
        $query = ProductUnit::query()
            ->with(['product:id,public_id,name,variant_mode', 'unit:id,name'])
            ->where('store_id', $store->id)
            ->orderBy('updated_at')
            ->orderBy('id');

        if ($since !== null) {
            $query->where('updated_at', '>', $since);
        }

        /** @var Collection<int, ProductUnit> $units */
        $units = $query->get();

        $this->attachOnHand($store, $units);

        return $units;
    }

    /**
     * High-water-mark `updated_at` seluruh product units store (untuk cursor awal).
     */
    public function productUnitsWatermark(Store $store): ?CarbonImmutable
    {
        $max = ProductUnit::query()
            ->where('store_id', $store->id)
            ->max('updated_at');

        return $max === null ? null : CarbonImmutable::parse((string) $max);
    }

    /**
     * Isi atribut `on_hand` tiap unit dari inventory_balances store-scoped.
     *
     * @param  Collection<int, ProductUnit>  $units
     */
    private function attachOnHand(Store $store, Collection $units): void
    {
        if ($units->isEmpty()) {
            return;
        }

        $stockKeys = $units
            ->map(fn (ProductUnit $unit): string => $this->stockKey($unit))
            ->unique()
            ->values()
            ->all();

        $balances = InventoryBalance::query()
            ->where('store_id', $store->id)
            ->whereIn('stock_key', $stockKeys)
            ->get(['stock_key', 'quantity'])
            ->keyBy('stock_key');

        foreach ($units as $unit) {
            $balance = $balances->get($this->stockKey($unit));
            $unit->setAttribute('on_hand', $balance === null ? null : (string) $balance->quantity);
        }
    }

    private function stockKey(ProductUnit $unit): string
    {
        return $unit->product_variant_id === null
            ? "product:{$unit->product_id}"
            : "variant:{$unit->product_variant_id}";
    }
}
