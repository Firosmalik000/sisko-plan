<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $commission_payout_id
 * @property int $referral_commission_id
 * @property string $amount
 * @property-read CommissionPayout $payout
 * @property-read ReferralCommission $commission
 */
#[Fillable(['commission_payout_id', 'referral_commission_id', 'amount'])]
class CommissionPayoutItem extends Model
{
    public const UPDATED_AT = null;

    /** @return BelongsTo<CommissionPayout, $this> */
    public function payout(): BelongsTo
    {
        return $this->belongsTo(CommissionPayout::class, 'commission_payout_id');
    }

    /** @return BelongsTo<ReferralCommission, $this> */
    public function commission(): BelongsTo
    {
        return $this->belongsTo(ReferralCommission::class, 'referral_commission_id');
    }

    protected function casts(): array
    {
        return ['amount' => 'decimal:4'];
    }
}
