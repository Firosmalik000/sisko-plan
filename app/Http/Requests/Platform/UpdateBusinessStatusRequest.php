<?php

namespace App\Http\Requests\Platform;

use App\Enums\BusinessStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBusinessStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['status' => ['required', Rule::in([BusinessStatus::Active->value, BusinessStatus::Suspended->value])]];
    }
}
