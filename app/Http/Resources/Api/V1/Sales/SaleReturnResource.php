<?php

namespace App\Http\Resources\Api\V1\Sales;

use App\Models\SaleReturn;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi retur penjualan untuk Api_V1 (Req 17.6). Nominal string decimal
 * scale 4; identifier publik ULID.
 *
 * @mixin SaleReturn
 */
class SaleReturnResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'document_number' => $this->document_number,
            'refund_amount' => (string) $this->refund_amount,
            'occurred_at' => $this->occurred_at?->toIso8601String(),
            'notes' => $this->notes,
        ];
    }
}
