<?php

namespace App\Http\Resources\Api\V1;

use App\Models\FinancialAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi FinancialAccount untuk snapshot & delta sync (design §3.2, Req 6.1, 7.1).
 * Identifier publik = ULID; integer id internal tidak diekspos.
 *
 * @mixin FinancialAccount
 */
class FinancialAccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'type' => $this->type->value,
            'is_active' => (bool) $this->is_active,
        ];
    }
}
