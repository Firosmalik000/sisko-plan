<?php

namespace App\Http\Resources\Api\V1\Catalog;

use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi unit/satuan untuk Api_V1 (Req 10).
 *
 * @mixin Unit
 */
class UnitResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'symbol' => $this->symbol,
            'unit_type' => $this->unit_type->value,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
