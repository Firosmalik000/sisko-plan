<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $public_id
 * @property int $referrer_user_id
 * @property int $referred_user_id
 * @property int $referral_code_id
 * @property Carbon $attributed_at
 * @property string|null $revenue
 * @property string|null $commission_total
 * @property-read User $referrer
 * @property-read User $referred
 * @property-read ReferralCode $referralCode
 * @property-read Collection<int, ReferralCommission> $commissions
 */
#[Fillable(['referrer_user_id', 'referred_user_id', 'referral_code_id', 'attributed_at'])]
class ReferralAttribution extends Model
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

    /** @return BelongsTo<ReferralCode, $this> */
    public function referralCode(): BelongsTo
    {
        return $this->belongsTo(ReferralCode::class);
    }

    /** @return HasMany<ReferralCommission, $this> */
    public function commissions(): HasMany
    {
        return $this->hasMany(ReferralCommission::class);
    }

    protected function casts(): array
    {
        return ['attributed_at' => 'datetime'];
    }
}
