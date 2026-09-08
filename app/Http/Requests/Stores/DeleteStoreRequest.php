<?php

namespace App\Http\Requests\Stores;

use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeleteStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this)?->can('deletePermanently', $this->route('store')) ?? false;
    }

    public function rules(): array
    {
        return [
            'store_name' => ['required', 'string', Rule::in([$this->route('store')->name])],
            'confirmation' => ['accepted'],
        ];
    }
}
