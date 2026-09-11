<?php

namespace App\Http\Requests\Api\V1\Devices;

use App\Enums\DevicePlatform;
use App\Enums\PushProvider;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi registrasi/update device push (POST /devices, design §10, Req 15.1).
 *
 * `device_id` berasal dari token per-perangkat client. Upsert dilakukan
 * controller berdasarkan (user_id, device_id) sehingga registrasi ulang
 * idempotent.
 */
class RegisterDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'device_id' => ['required', 'string', 'max:255'],
            'platform' => ['required', Rule::enum(DevicePlatform::class)],
            'push_token' => ['required', 'string', 'max:4096'],
            'push_provider' => ['required', Rule::enum(PushProvider::class)],
        ];
    }
}
