<?php

namespace App\Http\Requests\SuperAdmin;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlatformLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
