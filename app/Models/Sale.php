<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $store_id
 * @property string $total_amount
 * @property string $paid_amount
 */
#[Fillable(['store_id', 'document_number', 'subtotal', 'item_discount_amount', 'transaction_discount_amount', 'total_amount', 'paid_amount', 'change_amount', 'idempotency_key', 'request_hash', 'occurred_at', 'notes', 'created_by_user_id', 'posted_at'])]
class Sale extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:4', 'item_discount_amount' => 'decimal:4',
            'transaction_discount_amount' => 'decimal:4', 'total_amount' => 'decimal:4',
            'paid_amount' => 'decimal:4', 'change_amount' => 'decimal:4',
            'occurred_at' => 'datetime', 'posted_at' => 'datetime',
        ];
    }
}
