<?php

namespace App\Http\Requests\Platform;

use App\Support\PlatformPermission;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePlatformLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(PlatformPermission::BRANDING_MANAGE) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
