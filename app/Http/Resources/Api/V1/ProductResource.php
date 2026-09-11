<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Product;
use App\Support\Decimal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representasi produk untuk `GET /stores/{store}/products` (design §3.2, Req 10.1,
 * 10.4).
 *
 * Identifier utama produk = `public_id` (ULID); integer internal tidak diekspos.
 * `product_units` mengekspos id ProductUnit sebagai string stabil (ProductUnit
 * tidak punya public_id sendiri). Uang tetap string decimal scale 4 (tanpa
 * float). `stock_summary.total_on_hand` = penjumlahan quantity seluruh
 * inventory balance produk sebagai string decimal scale 6.
 *
 * Relasi `productUnits`, `productUnits.unit`, `category`, dan `inventoryBalances`
 * di-eager load controller untuk menghindari N+1.
 *
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
            'category' => $this->category?->name,
            'product_units' => $this->productUnits
                ->where('is_active', true)
                ->map(fn ($unit): array => [
                    'product_unit_id' => (string) $unit->id,
                    'sku' => $unit->sku,
                    'barcode' => $unit->barcode,
                    'unit_name' => $unit->unit->name,
                    'selling_price' => (string) $unit->selling_price,
                    'is_active' => (bool) $unit->is_active,
                ])
                ->values()
                ->all(),
            'stock_summary' => [
                'total_on_hand' => $this->totalOnHand(),
            ],
            'updated_at' => $this->updated_at?->toIso8601ZuluString(),
        ];
    }

    /**
     * Total on-hand seluruh balance produk sebagai string decimal scale 6.
     *
     * @return numeric-string
     */
    private function totalOnHand(): string
    {
        return $this->inventoryBalances->reduce(
            fn (string $carry, $balance): string => Decimal::add($carry, (string) $balance->quantity, Decimal::QUANTITY_SCALE),
            Decimal::add('0', '0', Decimal::QUANTITY_SCALE),
        );
    }
}
