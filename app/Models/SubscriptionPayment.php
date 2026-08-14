<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['store_id', 'subscription_id', 'receipt_number', 'amount', 'period_start', 'period_end', 'payment_method', 'external_reference', 'idempotency_key', 'request_hash', 'paid_at', 'notes', 'created_by_platform_admin_id'])]
class SubscriptionPayment extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;

    /** @return BelongsTo<Subscription, $this> */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'period_start' => 'date',
            'period_end' => 'date',
            'paid_at' => 'datetime',
        ];
    }
}
