<?php

namespace App\Http\Requests\Api\V1\Inventory;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi update hitungan item sesi opname (Req 15.3). `product_id` di sini
 * adalah public_id produk/variant (sesuai UpdateStockCount::save). `counted`
 * boleh null (belum dihitung); selisih dihitung otoritatif oleh Action.
 */
class UpdateStockCountItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Normalisasi payload klien {product_public_id, counted_quantity} ke bentuk
        // {product_id, counted_quantity} yang dikonsumsi UpdateStockCount::save.
        $items = $this->input('items');
        if (is_array($items)) {
            $this->merge([
                'items' => array_map(function ($item): array {
                    if (! is_array($item)) {
                        return [];
                    }

                    return [
                        'product_id' => $item['product_public_id'] ?? ($item['product_id'] ?? null),
                        'counted_quantity' => $item['counted_quantity'] ?? null,
                    ];
                }, $items),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:500'],
            'items.*.product_id' => ['required', 'string'],
            'items.*.counted_quantity' => ['nullable', 'decimal:0,6', 'gte:0', 'lte:999999999999.999999'],
        ];
    }
}
