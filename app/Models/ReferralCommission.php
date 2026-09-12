<?php

namespace App\Models;

use App\Enums\ReferralCommissionStatus;
use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $public_id
 * @property int $referrer_user_id
 * @property int $referred_user_id
 * @property int $referral_attribution_id
 * @property int $subscription_payment_id
 * @property int $plan_id
 * @property string $plan_name
 * @property string $plan_kind
 * @property string $payment_receipt_number
 * @property string $commissionable_amount
 * @property string $commission_rate
 * @property string $commission_amount
 * @property ReferralCommissionStatus $status
 * @property Carbon $earned_at
 * @property Carbon|null $approved_at
 * @property Carbon|null $paid_at
 * @property Carbon|null $reversed_at
 * @property string|null $reversal_reason
 * @property-read User $referrer
 * @property-read User $referred
 * @property-read ReferralAttribution $attribution
 * @property-read SubscriptionPayment $payment
 * @property-read Plan $plan
 * @property-read CommissionPayoutItem|null $payoutItem
 */
#[Fillable(['referrer_user_id', 'referred_user_id', 'referral_attribution_id', 'subscription_payment_id', 'plan_id', 'plan_name', 'plan_kind', 'payment_receipt_number', 'commissionable_amount', 'commission_rate', 'commission_amount', 'status', 'earned_at', 'approved_at', 'paid_at', 'reversed_at', 'reversal_reason'])]
class ReferralCommission extends Model
{
    use HasPublicId;

    /** @return BelongsTo<User, $this> */
    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function referred(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }

    /** @return BelongsTo<ReferralAttribution, $this> */
    public function attribution(): BelongsTo
    {
        return $this->belongsTo(ReferralAttribution::class, 'referral_attribution_id');
    }

    /** @return BelongsTo<SubscriptionPayment, $this> */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPayment::class, 'subscription_payment_id');
    }

    /** @return BelongsTo<Plan, $this> */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /** @return HasOne<CommissionPayoutItem, $this> */
    public function payoutItem(): HasOne
    {
        return $this->hasOne(CommissionPayoutItem::class);
    }

    protected static function booted(): void
    {
        static::deleting(fn () => throw new \LogicException('Financial ledger records cannot be deleted.'));
    }

    protected function casts(): array
    {
        return [
            'commissionable_amount' => 'decimal:4', 'commission_rate' => 'decimal:2', 'commission_amount' => 'decimal:4',
            'status' => ReferralCommissionStatus::class, 'earned_at' => 'datetime', 'approved_at' => 'datetime',
            'paid_at' => 'datetime', 'reversed_at' => 'datetime',
        ];
    }
}
