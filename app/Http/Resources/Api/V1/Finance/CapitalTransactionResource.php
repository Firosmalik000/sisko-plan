<?php

namespace App\Http\Resources\Api\V1\Finance;

use App\Models\CapitalTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * Serialisasi transaksi modal (Req 18.3). Total nilai string decimal scale 4;
 * identifier publik ULID.
 *
 * @mixin CapitalTransaction
 */
class CapitalTransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'document_number' => $this->document_number,
            'type' => $this->type,
            'total_value' => (string) $this->total_value,
            'occurred_at' => $this->occurred_at !== null ? Carbon::parse($this->occurred_at)->toIso8601String() : null,
            'notes' => $this->notes,
        ];
    }
}
