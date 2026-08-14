<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'document_number', 'type', 'idempotency_key', 'request_hash', 'occurred_at', 'notes', 'created_by_user_id', 'posted_at'])]
class StockAdjustment extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['occurred_at' => 'immutable_datetime', 'posted_at' => 'immutable_datetime'];
    }
}
