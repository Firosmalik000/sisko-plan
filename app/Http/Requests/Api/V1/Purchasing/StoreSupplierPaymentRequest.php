<?php

namespace App\Http\Requests\Api\V1\Purchasing;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi pembayaran hutang atas sebuah kulakan (Req 16.4).
 *
 * `client_operation_id` = idempotency key. Batas jumlah (positif, ≤ sisa
 * tagihan) divalidasi otoritatif di PostPurchasePayment.
 */
class StoreSupplierPaymentRequest extends FormRequest
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
            'purchase_public_id' => ['required', 'string'],
            'account_public_id' => ['required', 'string'],
            'amount' => ['required', 'decimal:0,4', 'gt:0', 'lte:999999999999999.9999'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
