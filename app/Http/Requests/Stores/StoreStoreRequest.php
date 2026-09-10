<?php

namespace App\Http\Requests\Stores;

use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStoreRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (! $this->filled('country')) {
            $this->merge(['country' => $this->session()->get('market') === 'ms' ? 'MY' : 'ID']);
        }
    }

    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this) !== null;
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:500'],
            'country' => [
                'required',
                'string',
                Rule::exists('countries', 'code')->where(fn ($query) => $query->where('is_active', true)),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'address.string' => __('Alamat toko harus berupa teks.'),
            'address.max' => __('Alamat toko tidak boleh lebih dari 500 karakter.'),
        ];
    }
}
