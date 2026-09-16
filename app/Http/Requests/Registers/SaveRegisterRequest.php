<?php

namespace App\Http\Requests\Registers;

use Illuminate\Foundation\Http\FormRequest;

class SaveRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'cash_account_id' => ['required', 'string', 'size:26'],
        ];
    }
}
