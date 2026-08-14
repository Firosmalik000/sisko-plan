<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'document_number', 'from_account_id', 'to_account_id', 'amount', 'idempotency_key', 'request_hash', 'occurred_at', 'notes', 'created_by_user_id', 'posted_at'])]
class AccountTransfer extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;
}
