<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'financial_account_id', 'direction', 'reason', 'amount', 'balance_after', 'idempotency_key', 'request_hash', 'reference_type', 'reference_id', 'occurred_at', 'notes', 'created_by_user_id'])]
class CashTransaction extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;
}
