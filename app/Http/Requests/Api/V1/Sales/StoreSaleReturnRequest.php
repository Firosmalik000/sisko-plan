<?php

namespace App\Http\Requests\Api\V1\Sales;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi retur penjualan (POST /stores/{store}/sales/{sale}/returns, Req 17.6).
 *
 * `client_operation_id` = idempotency key. `sale_item_public_id` merujuk item
 * pada dokumen sale yang di-retur; qty divalidasi otoritatif di PostSaleReturn.
 */
class StoreSaleReturnRequest extends FormRequest
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
            'client_operation_id' => ['required', 'string', 'max:64'],
            'account_public_id' => ['required', 'string'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.sale_item_public_id' => ['required', 'string'],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
        ];
    }
}
