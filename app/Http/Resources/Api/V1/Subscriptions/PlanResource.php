<?php

namespace App\Http\Resources\Api\V1\Subscriptions;

use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi paket langganan (Req 24.1). Harga string decimal scale 4; kapasitas
 * integer. Identifier publik ULID.
 *
 * @mixin Plan
 */
class PlanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'description' => $this->description,
            'kind' => $this->kind,
            'offer_category' => $this->offer_category,
            'monthly_price' => (string) $this->monthly_price,
            'billing_cycle' => $this->billing_cycle,
            'duration_months' => (int) $this->duration_months,
            'max_stores' => (int) $this->max_stores,
            'max_products' => (int) $this->max_products,
            'max_members' => (int) $this->max_members,
            'max_scans' => (int) $this->max_scans,
            'is_trial' => (bool) $this->is_trial,
            'is_default' => (bool) $this->is_default,
        ];
    }
}
