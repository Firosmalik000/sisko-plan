<?php

namespace App\Http\Resources\Api\V1\Finance;

use App\Models\AccountTransfer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * Serialisasi transfer antar akun (Req 18.2). Nominal string decimal scale 4;
 * identifier publik ULID.
 *
 * @mixin AccountTransfer
 */
class AccountTransferResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'document_number' => $this->document_number,
            'amount' => (string) $this->amount,
            'occurred_at' => $this->occurred_at !== null ? Carbon::parse($this->occurred_at)->toIso8601String() : null,
            'notes' => $this->notes,
        ];
    }
}
