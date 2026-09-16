<?php

namespace App\Http\Requests\Platform;

use App\Models\Business;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RecoverBusinessOwnershipRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var Business $business */
        $business = $this->route('business');

        return ['member_id' => ['required', Rule::exists('business_memberships', 'public_id')->where('business_id', $business->id)]];
    }
}
