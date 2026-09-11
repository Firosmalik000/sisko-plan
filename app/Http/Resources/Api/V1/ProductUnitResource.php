<?php

namespace App\Http\Resources\Api\V1;

use App\Models\ProductUnit;
use App\Support\Decimal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Snapshot ringkas ProductUnit untuk bootstrap & delta sync (design §3.2, §4.2,
 * Req 6.1, 7.1).
 *
 * ProductUnit tidak memiliki `public_id` sendiri, sehingga identifier lokal
 * stabil diekspos sebagai `product_unit_id` (string dari id internal) — bukan
 * kunci `id` mentah. `product_public_id` disertakan untuk relasi ke produk.
 * Uang tetap string decimal scale 4 (tanpa float). `on_hand` diisi controller
 * lewat atribut `on_hand` (ringkasan stok), null bila belum ada balance.
 *
 * @mixin ProductUnit
 */
class ProductUnitResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $onHand = $this->getAttribute('on_hand');

        return [
            'product_unit_id' => (string) $this->id,
            'product_public_id' => $this->product->public_id,
            'name' => $this->product->name,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'unit_name' => $this->unit->name,
            'selling_price' => (string) $this->selling_price,
            'is_active' => (bool) $this->is_active,
            'on_hand' => is_string($onHand) ? $onHand : null,
            'updated_at' => $this->updated_at?->toIso8601ZuluString(),
        ];
    }
}
