<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCommerceReferenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'country_code' => ['required', Rule::exists('countries', 'code')],
            'is_enabled' => ['required', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
