<?php

namespace App\Http\Resources\Api\V1\Subscriptions;

use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi langganan aktif akun (Req 24.2). Menyertakan paket berjalan (nama +
 * harga) dan jendela periode. Identifier publik ULID.
 *
 * @mixin Subscription
 */
class SubscriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'status' => $this->status->value,
            'plan' => $this->plan === null ? null : [
                'public_id' => $this->plan->public_id,
                'name' => $this->plan->name,
                'monthly_price' => (string) $this->plan->monthly_price,
                'billing_cycle' => $this->plan->billing_cycle,
            ],
            'starts_at' => $this->starts_at?->toIso8601String(),
            'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
            'current_period_start' => $this->current_period_start?->toDateString(),
            'current_period_end' => $this->current_period_end?->toDateString(),
        ];
    }
}
