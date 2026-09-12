<?php

namespace App\Http\Requests\Api\V1\Inventory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi set minimum stok product unit/variant (Req 14.3). Quantity scale 6.
 */
class SetMinimumStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'variant_public_id' => ['nullable', 'string'],
            'minimum_quantity' => ['required', 'decimal:0,6', 'gte:0', 'lte:999999999999.999999'],
        ];
    }
}
