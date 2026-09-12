<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $monthly_price
 * @property string $referral_commission_rate
 * @property string $kind
 * @property string|null $offer_category
 * @property string $billing_cycle
 * @property int $duration_months
 * @property int $max_stores
 * @property int $max_products
 * @property int $max_members
 * @property int $max_scans
 * @property bool $is_default
 * @property bool $is_trial
 * @property bool $is_active
 * @property int|null $subscriptions_count
 * @property-read Collection<int, ReferralCommission> $referralCommissions
 */
#[Fillable(['code', 'name', 'description', 'kind', 'offer_category', 'monthly_price', 'referral_commission_rate', 'billing_cycle', 'duration_months', 'max_stores', 'max_products', 'max_members', 'max_scans', 'is_default', 'is_trial', 'is_active'])]
class Plan extends Model
{
    use HasPublicId;

    public const TRIAL_DAYS = 30;

    public const KIND_BASE = 'base';

    public const KIND_ADDON = 'addon';

    public const CATEGORY_STORE = 'store_capacity';

    public const CATEGORY_PRODUCT = 'product_capacity';

    public const CATEGORY_STAFF = 'staff_capacity';

    public const CATEGORY_SCAN = 'scan_capacity';

    public const CATEGORY_GENERAL = 'general';

    public const BILLING_FIXED = 'fixed';

    public const BILLING_LIFETIME = 'lifetime';

    /** @return list<string> */
    public static function offerCategories(): array
    {
        return [self::CATEGORY_STORE, self::CATEGORY_STAFF, self::CATEGORY_SCAN, self::CATEGORY_PRODUCT, self::CATEGORY_GENERAL];
    }

    /** @return HasMany<Subscription, $this> */
    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    /** @return HasMany<SubscriptionAddon, $this> */
    public function subscriptionAddons(): HasMany
    {
        return $this->hasMany(SubscriptionAddon::class);
    }

    /** @return HasMany<ReferralCommission, $this> */
    public function referralCommissions(): HasMany
    {
        return $this->hasMany(ReferralCommission::class);
    }

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:4',
            'referral_commission_rate' => 'decimal:2',
            'duration_months' => 'integer',
            'max_stores' => 'integer',
            'max_products' => 'integer',
            'max_members' => 'integer',
            'max_scans' => 'integer',
            'is_default' => 'boolean',
            'is_trial' => 'boolean',
            'is_active' => 'boolean',
        ];
    }
}
