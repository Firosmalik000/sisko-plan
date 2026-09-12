<?php

namespace App\Http\Requests\Api\V1\Finance;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi kas awal (POST /stores/{store}/cash/opening, Req 18.1).
 *
 * `idempotency_key` = kunci idempotensi. `account_public_id` diresolusi ke id
 * internal di controller; nominal string decimal scale 4 (uang), > 0. Precondition
 * "akun masih kosong" ditegakkan otoritatif di `PostOpeningCash`.
 */
class StoreCashOpeningRequest extends FormRequest
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
            'account_public_id' => ['required', 'string'],
            'amount' => ['required', 'decimal:0,4', 'gt:0', 'lte:9999999999999.9999'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
