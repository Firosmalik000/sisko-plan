<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi transaksi modal (POST /stores/{store}/capital, Req 18.3).
 *
 * `type` menentukan bentuk payload: `cash_*` memakai akun + nominal; `inventory_*`
 * memakai daftar produk (kuantitas + harga pokok opsional). Identifier produk/akun
 * publik diresolusi ke id internal di controller. Validasi domain (akun/produk milik
 * toko, kuantitas > 0, saldo cukup) otoritatif di `PostCapitalTransaction`.
 */
class StoreCapitalTransactionRequest extends FormRequest
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
        $isCash = str_starts_with((string) $this->input('type'), 'cash_');

        return [
            'idempotency_key' => ['required', 'string', 'max:64'],
            'type' => ['required', Rule::in(['cash_contribution', 'cash_withdrawal', 'inventory_contribution', 'inventory_withdrawal'])],
            'account_public_id' => [Rule::requiredIf($isCash), 'nullable', 'string'],
            'amount' => [Rule::requiredIf($isCash), 'nullable', 'decimal:0,4', 'gt:0', 'lte:9999999999999.9999'],
            'items' => [Rule::requiredIf(! $isCash), 'nullable', 'array', 'max:200'],
            'items.*.product_public_id' => ['required_with:items', 'string'],
            'items.*.variant_public_id' => ['nullable', 'string'],
            'items.*.quantity' => ['required_with:items', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
            'items.*.unit_cost' => ['nullable', 'decimal:0,4', 'gte:0', 'lte:9999999999999.9999'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
