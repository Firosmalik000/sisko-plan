<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** @property int $store_id */
#[Fillable(['store_id', 'sale_id', 'financial_account_id', 'document_number', 'refund_amount', 'cogs_reversed', 'gross_profit_reversed', 'idempotency_key', 'request_hash', 'occurred_at', 'notes', 'created_by_user_id', 'posted_at'])]
class SaleReturn extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'refund_amount' => 'decimal:4', 'cogs_reversed' => 'decimal:4', 'gross_profit_reversed' => 'decimal:4',
            'occurred_at' => 'datetime', 'posted_at' => 'datetime',
        ];
    }
}
