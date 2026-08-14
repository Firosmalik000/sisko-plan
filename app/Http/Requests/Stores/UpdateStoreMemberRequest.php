<?php

namespace App\Http\Requests\Stores;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStoreMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this)?->can('manageMembers', $this->route('store')) ?? false;
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in([
                MembershipRole::Admin->value,
                MembershipRole::Cashier->value,
            ])],
            'status' => ['required', Rule::enum(MembershipStatus::class)],
        ];
    }
}
