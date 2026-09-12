<?php

namespace App\Http\Resources\Api\V1\Finance;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi pengeluaran (Req 19.3). Nominal string decimal scale 4; nama kategori
 * & akun di-snapshot pada dokumen (immutable). Identifier publik ULID.
 *
 * @mixin Expense
 */
class ExpenseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'document_number' => $this->document_number,
            'category_name' => $this->category_name,
            'account_name' => $this->account_name,
            'amount' => (string) $this->amount,
            'occurred_at' => $this->occurred_at?->toIso8601String(),
            'notes' => $this->notes,
        ];
    }
}
