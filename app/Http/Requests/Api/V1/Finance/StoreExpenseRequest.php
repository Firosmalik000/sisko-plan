<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi pencatatan pengeluaran (POST /stores/{store}/expenses, Req 19.3).
 *
 * `idempotency_key` = kunci idempotensi. Kategori & akun (public id) diresolusi ke
 * id internal di controller; validasi domain (aktif, milik toko, saldo cukup)
 * otoritatif di `PostExpense`. Nominal string decimal scale 4, > 0.
 */
class StoreExpenseRequest extends FormRequest
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
            'idempotency_key' => ['required', 'string', 'max:64'],
            'category_public_id' => ['required', 'string'],
            'account_public_id' => ['required', 'string'],
            'amount' => ['required', 'decimal:0,4', 'gt:0', 'lte:9999999999999.9999'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
