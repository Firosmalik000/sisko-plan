<?php

namespace App\Http\Requests\Stores;

use App\Enums\MembershipRole;
use App\Models\User;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreMemberRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'mode' => $this->input('mode', 'link'),
        ]);
    }

    public function authorize(): bool
    {
        return AuthenticatedUser::optional($this)?->can('manageMembers', $this->route('store')) ?? false;
    }

    /** @return array<string, array<int, ValidationRule|array<mixed>|string>> */
    public function rules(): array
    {
        return [
            'mode' => ['required', Rule::in(['create', 'link'])],
            'name' => [
                Rule::requiredIf($this->input('mode') === 'create'),
                'nullable',
                'string',
                'max:255',
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::when(
                    $this->input('mode') === 'create',
                    Rule::unique(User::class),
                    Rule::exists(User::class),
                ),
            ],
            'password' => [
                Rule::requiredIf($this->input('mode') === 'create'),
                Rule::prohibitedIf($this->input('mode') !== 'create'),
                'nullable',
                'string',
                Password::default(),
                'confirmed',
            ],
            'role' => ['required', Rule::in([
                MembershipRole::Admin->value,
                MembershipRole::Cashier->value,
            ])],
        ];
    }
}
