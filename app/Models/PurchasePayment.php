<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'purchase_id', 'financial_account_id', 'document_number', 'amount', 'idempotency_key', 'request_hash', 'occurred_at', 'notes', 'created_by_user_id', 'posted_at'])]
/** @property string $amount */
class PurchasePayment extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['amount' => 'decimal:4', 'occurred_at' => 'datetime', 'posted_at' => 'datetime'];
    }
}
