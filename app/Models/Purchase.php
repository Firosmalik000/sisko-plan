<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $store_id
 * @property int $supplier_id
 * @property string $total_amount
 */
#[Fillable(['store_id', 'supplier_id', 'document_number', 'supplier_invoice_number', 'subtotal', 'discount_amount', 'additional_cost', 'total_amount', 'idempotency_key', 'request_hash', 'occurred_at', 'notes', 'created_by_user_id', 'posted_at'])]
class Purchase extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:4',
            'discount_amount' => 'decimal:4',
            'additional_cost' => 'decimal:4',
            'total_amount' => 'decimal:4',
            'occurred_at' => 'datetime',
            'posted_at' => 'datetime',
        ];
    }
}
