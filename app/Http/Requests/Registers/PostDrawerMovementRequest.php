<?php

namespace App\Http\Requests\Registers;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PostDrawerMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'direction' => ['required', Rule::in(['cash_in', 'cash_out'])],
            'amount' => ['required', 'decimal:0,4', 'gt:0'],
            'reason' => ['required', 'string', 'max:255'],
            'approval_id' => ['nullable', 'string', 'size:26'],
        ];
    }
}
