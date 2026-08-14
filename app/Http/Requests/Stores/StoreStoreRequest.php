<?php

namespace App\Http\Requests\Stores;

use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this) !== null;
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:120']];
    }
}
