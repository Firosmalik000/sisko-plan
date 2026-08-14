<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'supplier_id', 'direction', 'reason', 'amount', 'balance_after', 'reference_type', 'reference_id', 'occurred_at', 'notes', 'created_by_user_id'])]
class SupplierPayableTransaction extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['amount' => 'decimal:4', 'balance_after' => 'decimal:4', 'occurred_at' => 'datetime'];
    }
}
