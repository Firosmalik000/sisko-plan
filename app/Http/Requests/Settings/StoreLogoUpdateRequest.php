<?php

namespace App\Http\Requests\Settings;

use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;

class StoreLogoUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', app(CurrentStore::class)->get()) ?? false;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
