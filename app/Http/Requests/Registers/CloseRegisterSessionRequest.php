<?php

namespace App\Http\Requests\Registers;

use Illuminate\Foundation\Http\FormRequest;

class CloseRegisterSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['counted_cash' => ['required', 'decimal:0,4', 'min:0']];
    }
}
