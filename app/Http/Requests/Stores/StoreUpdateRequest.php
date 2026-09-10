<?php

namespace App\Http\Requests\Stores;

use App\Models\Store;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this)?->can('update', $this->route('store')) ?? false;
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        $store = $this->route('store');
        abort_unless($store instanceof Store, 404);

        return [
            'name' => ['required', 'string', 'max:120'],
            'address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'country' => [
                'sometimes',
                'required',
                'string',
                Rule::exists('countries', 'code')->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->when($store, fn ($query) => $query->orWhere('id', $store->country_id))),
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
