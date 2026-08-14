<?php

namespace App\Http\Requests\Stores;

use App\Enums\MembershipRole;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this)?->can('manageMembers', $this->route('store')) ?? false;
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'exists:users,email'],
            'role' => ['required', Rule::in([
                MembershipRole::Admin->value,
                MembershipRole::Cashier->value,
            ])],
        ];
    }
}
