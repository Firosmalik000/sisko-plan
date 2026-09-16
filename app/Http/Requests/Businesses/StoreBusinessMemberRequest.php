<?php

namespace App\Http\Requests\Businesses;

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBusinessMemberRequest extends FormRequest
{
    /** @return array{display_name:string,role:string,store_ids?:list<string>,pin:?string,personal_device_access:bool,email:?string} */
    public function memberData(): array
    {
        $data = $this->validated();

        return [
            'display_name' => (string) $data['display_name'],
            'role' => (string) $data['role'],
            'store_ids' => array_values($data['store_ids'] ?? []),
            'pin' => isset($data['pin']) ? (string) $data['pin'] : null,
            'personal_device_access' => (bool) $data['personal_device_access'],
            'email' => isset($data['email']) ? (string) $data['email'] : null,
        ];
    }

    public function authorize(): bool
    {
        $business = $this->route('business');

        return $business instanceof Business && $this->user() !== null
            && BusinessMembership::query()->where('business_id', $business->id)
                ->where('user_id', $this->user()->id)
                ->whereIn('business_role', [BusinessRole::Owner->value, BusinessRole::Admin->value])
                ->where('status', MembershipStatus::Active->value)->exists();
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var Business $business */
        $business = $this->route('business');

        return [
            'display_name' => ['required', 'string', 'max:120'],
            'role' => ['required', Rule::in(['admin', 'manager', 'cashier'])],
            'store_ids' => ['array'],
            'store_ids.*' => [Rule::exists('stores', 'public_id')->where('business_id', $business->id)],
            'personal_device_access' => ['required', 'boolean'],
            'pin' => ['required_if:personal_device_access,false', 'nullable', 'digits:6'],
            'email' => ['required_if:personal_device_access,true', 'nullable', 'email:rfc', 'max:254', Rule::unique(User::class)],
        ];
    }
}
