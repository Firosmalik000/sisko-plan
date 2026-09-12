<?php

namespace App\Http\Requests\Api\V1\Subscriptions;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi pemilihan paket langganan (POST /stores/{store}/subscription,
 * Req 24.3). Paket diidentifikasi via `plan_public_id`; validasi domain (paket
 * utama, kapasitas, trial sekali) otoritatif di `SelectSubscriptionPlan`.
 */
class SelectPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'plan_public_id' => ['required', 'string'],
        ];
    }
}
