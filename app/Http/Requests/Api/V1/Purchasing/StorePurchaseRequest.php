<?php

namespace App\Http\Requests\Api\V1\Purchasing;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi pembuatan kulakan (POST /stores/{store}/purchases, Req 16.2).
 *
 * `client_operation_id` = idempotency key. Identifier eksternal:
 * `supplier_public_id`, `account_public_id`, `items[].product_unit_id`
 * (integer string; ProductUnit tanpa public_id). Nominal decimal scale 4,
 * quantity scale 6. Kombinasi/aturan bisnis otoritatif divalidasi di PostPurchase.
 */
class StorePurchaseRequest extends FormRequest
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
        $money = ['decimal:0,4', 'gte:0', 'lte:999999999999999.9999'];

        return [
            'client_operation_id' => ['required', 'string', 'max:64'],
            'supplier_public_id' => ['required', 'string'],
            'account_public_id' => ['nullable', 'string'],
            'occurred_at' => ['required', 'date'],
            'supplier_invoice_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'discount' => ['required', ...$money],
            'additional_cost' => ['required', ...$money],
            'paid_amount' => ['required', ...$money],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_unit_id' => ['required', 'string', 'regex:/^[0-9]+$/'],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
            'items.*.unit_price' => ['required', ...$money],
        ];
    }
}
