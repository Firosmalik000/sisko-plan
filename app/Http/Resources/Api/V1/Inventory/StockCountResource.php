<?php

namespace App\Http\Resources\Api\V1\Inventory;

use App\Models\StockCount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi sesi stok opname untuk Api_V1 (Req 15). Status enum
 * draft/counted/posted/cancelled; `items` disertakan bila relasi dimuat (detail),
 * dengan qty string decimal scale 6 (system/counted/difference).
 *
 * @mixin StockCount
 */
class StockCountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $data = [
            'public_id' => $this->public_id,
            'document_number' => $this->document_number,
            'status' => $this->status->value,
            'notes' => $this->notes,
            'snapshot_at' => $this->snapshot_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'posted_at' => $this->posted_at?->toIso8601String(),
            'cancelled_at' => $this->cancelled_at?->toIso8601String(),
        ];

        if ($this->relationLoaded('items')) {
            $data['items'] = $this->items->map(fn ($item): array => [
                'product_public_id' => $item->product?->public_id,
                'product_name' => $item->product?->name,
                'system_quantity' => (string) $item->system_quantity,
                'counted_quantity' => $item->counted_quantity === null ? null : (string) $item->counted_quantity,
                'difference_quantity' => $item->difference_quantity === null ? null : (string) $item->difference_quantity,
            ])->all();
        }

        return $data;
    }
}
