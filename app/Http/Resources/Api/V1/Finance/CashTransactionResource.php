<?php

namespace App\Http\Resources\Api\V1\Finance;

use App\Models\CashTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * Serialisasi ledger kas (kas awal & leg transfer). Nominal + saldo string decimal
 * scale 4; identifier publik ULID.
 *
 * @mixin CashTransaction
 */
class CashTransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'direction' => $this->direction,
            'reason' => $this->reason,
            'amount' => (string) $this->amount,
            'balance_after' => (string) $this->balance_after,
            'occurred_at' => $this->occurred_at !== null ? Carbon::parse($this->occurred_at)->toIso8601String() : null,
            'notes' => $this->notes,
        ];
    }
}
