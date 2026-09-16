<?php

namespace App\Http\Requests\Registers;

use Illuminate\Foundation\Http\FormRequest;

class OpenRegisterSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['register_id' => ['required', 'string', 'size:26'], 'opening_cash' => ['required', 'decimal:0,4', 'min:0']];
    }
}
