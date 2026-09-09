<?php

namespace App\Http\Requests\Stores;

use App\Models\Store;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeleteStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this)?->can('deletePermanently', $this->route('store')) ?? false;
    }

    /** @return array<string, array<int, ValidationRule|string>> */
    public function rules(): array
    {
        $store = $this->route('store');
        abort_unless($store instanceof Store, 404);

        return [
            'store_name' => ['required', 'string', Rule::in([$store->name])],
            'confirmation' => ['accepted'],
        ];
    }
}
