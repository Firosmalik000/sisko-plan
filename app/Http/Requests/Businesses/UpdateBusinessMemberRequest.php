<?php

namespace App\Http\Requests\Businesses;

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBusinessMemberRequest extends FormRequest
{
    /** @return array{display_name:string,role:string,status:string,store_ids?:list<string>,pin:?string} */
    public function memberData(): array
    {
        $data = $this->validated();

        return [
            'display_name' => (string) $data['display_name'],
            'role' => (string) $data['role'],
            'status' => (string) $data['status'],
            'store_ids' => array_values($data['store_ids'] ?? []),
            'pin' => isset($data['pin']) ? (string) $data['pin'] : null,
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
            'role' => ['required', Rule::in(['owner', 'admin', 'manager', 'cashier'])],
            'status' => ['required', Rule::in([MembershipStatus::Active->value, MembershipStatus::Suspended->value])],
            'store_ids' => ['array'],
            'store_ids.*' => [Rule::exists('stores', 'public_id')->where('business_id', $business->id)],
            'pin' => ['nullable', 'digits:6'],
        ];
    }
}
