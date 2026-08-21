<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'sale_id', 'financial_account_id', 'payment_method', 'amount', 'tendered_amount', 'change_amount', 'occurred_at', 'created_by_user_id'])]
class SalePayment extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return ['amount' => 'decimal:4', 'tendered_amount' => 'decimal:4', 'change_amount' => 'decimal:4', 'occurred_at' => 'datetime'];
    }
}
