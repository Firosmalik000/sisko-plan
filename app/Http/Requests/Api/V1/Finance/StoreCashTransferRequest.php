<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi transfer antar akun (POST /stores/{store}/cash/transfers, Req 18.2).
 *
 * Akun sumber (−) & tujuan (+) diresolusi dari public id ke id internal. Nominal
 * string decimal scale 4 (uang), > 0. Akun harus berbeda + saldo cukup ditegakkan
 * di `PostAccountTransfer`/`ApplyCashTransaction` (saldo kurang → VALIDATION_ERROR).
 */
class StoreCashTransferRequest extends FormRequest
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
            'from_account_public_id' => ['required', 'string'],
            'to_account_public_id' => ['required', 'string', 'different:from_account_public_id'],
            'amount' => ['required', 'decimal:0,4', 'gt:0', 'lte:9999999999999.9999'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
