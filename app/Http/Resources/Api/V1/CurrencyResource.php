<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi Currency untuk formatting uang di klien (design §3.2, Req 18.2).
 *
 * @mixin Currency
 */
class CurrencyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'code' => $this->code,
            'symbol' => $this->symbol,
            'decimal_places' => (int) $this->decimal_places,
            'symbol_position' => $this->symbol_position,
        ];
    }
}
