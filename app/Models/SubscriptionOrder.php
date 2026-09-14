<?php

namespace App\Models;

use App\Enums\SubscriptionOrderStatus;
use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $public_id
 * @property int $user_id
 * @property int $subscription_id
 * @property int $plan_id
 * @property int|null $subscription_period_id
 * @property int|null $subscription_addon_id
 * @property int|null $subscription_payment_id
 * @property string $plan_name
 * @property string $plan_kind
 * @property string $amount
 * @property string $referral_commission_rate
 * @property array<string, mixed> $plan_snapshot
 * @property SubscriptionOrderStatus $status
 * @property string $provider
 * @property string|null $provider_reference
 * @property string $idempotency_key
 * @property string $request_hash
 * @property Carbon|null $paid_at
 * @property Carbon|null $failed_at
 * @property Carbon|null $cancelled_at
 */
#[Fillable(['user_id', 'subscription_id', 'plan_id', 'subscription_period_id', 'subscription_addon_id', 'subscription_payment_id', 'plan_name', 'plan_kind', 'amount', 'referral_commission_rate', 'plan_snapshot', 'status', 'provider', 'provider_reference', 'idempotency_key', 'request_hash', 'paid_at', 'failed_at', 'cancelled_at', 'created_by_user_id'])]
class SubscriptionOrder extends Model
{
    use HasPublicId;

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Subscription, $this> */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /** @return BelongsTo<Plan, $this> */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /** @return BelongsTo<SubscriptionPeriod, $this> */
    public function period(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPeriod::class, 'subscription_period_id');
    }

    /** @return BelongsTo<SubscriptionAddon, $this> */
    public function addon(): BelongsTo
    {
        return $this->belongsTo(SubscriptionAddon::class, 'subscription_addon_id');
    }

    /** @return BelongsTo<SubscriptionPayment, $this> */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPayment::class, 'subscription_payment_id');
    }

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:4',
            'referral_commission_rate' => 'decimal:2',
            'plan_snapshot' => 'array',
            'status' => SubscriptionOrderStatus::class,
            'paid_at' => 'datetime',
            'failed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }
}
