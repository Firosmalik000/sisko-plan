<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $public_id
 * @property string $receipt_number
 * @property string $amount
 * @property Carbon $period_start
 * @property Carbon $period_end
 * @property string $payment_method
 * @property string|null $external_reference
 * @property Carbon $paid_at
 * @property string|null $notes
 * @property-read Store $store
 * @property-read Subscription $subscription
 * @property-read User|null $creator
 */
#[Fillable(['user_id', 'store_id', 'subscription_id', 'receipt_number', 'amount', 'period_start', 'period_end', 'payment_method', 'external_reference', 'idempotency_key', 'request_hash', 'paid_at', 'notes', 'created_by_user_id'])]
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

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
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
