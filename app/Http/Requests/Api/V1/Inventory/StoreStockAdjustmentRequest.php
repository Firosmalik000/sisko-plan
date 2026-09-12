<?php

namespace App\Http\Requests\Api\V1\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi penyesuaian stok manual (Req 14.2). Reuse PostStockAdjustment.
 * Type opname_in/opname_out dikecualikan (khusus posting stock-count).
 */
class StoreStockAdjustmentRequest extends FormRequest
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
            'client_operation_id' => ['nullable', 'string', 'max:64'],
            'type' => ['required', Rule::in(['opening', 'increase', 'decrease', 'damaged', 'lost'])],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_public_id' => ['required', 'string'],
            'items.*.variant_public_id' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
            'items.*.unit_cost' => ['nullable', 'decimal:0,4', 'gte:0', 'lte:999999999999999.9999'],
        ];
    }
}
