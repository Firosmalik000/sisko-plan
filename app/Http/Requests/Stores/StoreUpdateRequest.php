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
}
