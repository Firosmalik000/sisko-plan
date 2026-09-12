<?php

namespace App\Http\Requests\Api\V1\Finance;

use App\Enums\FinancialAccountType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi create/update akun keuangan (Req 13.2). PATCH parsial. Saldo tidak
 * diatur langsung di sini — mutasi saldo lewat ledger action (kas/modal/expense).
 */
class SaveFinancialAccountRequest extends FormRequest
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
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:255'],
            'type' => [$required, Rule::enum(FinancialAccountType::class)],
            'account_number' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
