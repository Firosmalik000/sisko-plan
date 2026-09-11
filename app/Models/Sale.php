<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $store_id
 * @property string $total_amount
 * @property string $paid_amount
 * @property string|null $customer_email
 * @property string $sales_channel
 * @property string|null $marketplace_code
 * @property string|null $external_order_number
 */
#[Fillable(['store_id', 'customer_id', 'document_number', 'customer_name', 'customer_phone', 'customer_email', 'sales_channel', 'marketplace_code', 'external_order_number', 'subtotal', 'item_discount_amount', 'transaction_discount_amount', 'total_amount', 'paid_amount', 'change_amount', 'idempotency_key', 'request_hash', 'occurred_at', 'notes', 'created_by_user_id', 'posted_at'])]
class Sale extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    /** @return BelongsTo<Customer, $this> */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /** @return HasMany<SaleItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    /** @return HasMany<SalePayment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

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
