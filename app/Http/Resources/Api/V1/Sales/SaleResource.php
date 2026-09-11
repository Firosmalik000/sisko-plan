<?php

namespace App\Http\Resources\Api\V1\Sales;

use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representasi ringkas Sale untuk `GET /stores/{store}/sales` (riwayat)
 * (design §3.6, Req 12.9).
 *
 * Identifier publik = `public_id` (ULID); integer internal tidak diekspos. Uang
 * tetap string decimal scale 4 (tanpa float). Waktu disimpan UTC, diekspos ISO
 * 8601 Zulu — klien menampilkan per timezone toko.
 *
 * @mixin Sale
 */
class SaleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'document_number' => $this->document_number,
            'total_amount' => (string) $this->total_amount,
            'occurred_at' => $this->occurred_at?->toIso8601ZuluString(),
            'customer_name' => $this->customer_name,
            'sales_channel' => $this->sales_channel,
            'marketplace_code' => $this->marketplace_code,
        ];
    }
}
