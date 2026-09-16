<?php

namespace App\Actions\Subscriptions;

use App\Actions\Audit\RecordAudit;
use App\Models\BusinessMembership;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionAddon;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Services\Subscriptions\SubscriptionPeriods;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PurchaseSubscriptionAddon
{
    public function __construct(
        private RecordAudit $audit,
        private SubscriptionAccess $access,
        private SubscriptionPeriods $periods,
    ) {}

    /** @param array<string, mixed>|null $purchasedTerms */
    public function handle(BusinessMembership $actor, Plan $plan, ?string $ipAddress, ?array $purchasedTerms = null): SubscriptionAddon
    {
        $this->periods->syncForBusiness($actor->business_id);

        return DB::transaction(function () use ($actor, $plan, $ipAddress, $purchasedTerms): SubscriptionAddon {
            $actor = BusinessMembership::query()->with(['business', 'user'])->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            abort_unless($actor->business_role->value === 'owner' && $actor->user !== null, 403);
            $subscription = Subscription::query()->with(['plan', 'store'])
                ->where('business_id', $actor->business_id)->lockForUpdate()->firstOrFail();
            $planQuery = Plan::query()->whereKey($plan->id);
            if ($purchasedTerms === null) {
                $planQuery->where(['kind' => Plan::KIND_ADDON, 'is_active' => true]);
            }
            $selectedPlan = $planQuery->lockForUpdate()->firstOrFail();
            $terms = $purchasedTerms ?? $selectedPlan->only([
                'name', 'offer_category', 'billing_cycle', 'monthly_price', 'duration_months',
                'max_stores', 'max_products', 'max_members', 'max_scans',
            ]);

            if ($this->access->blockedReason($subscription) !== null) {
                throw ValidationException::withMessages([
                    'plan_id' => __('Add-ons can only be added to an active subscription.'),
                ]);
            }

            $startsOn = CarbonImmutable::today();
            $endsOn = $terms['billing_cycle'] === Plan::BILLING_LIFETIME
                ? null
                : $startsOn->addMonthsNoOverflow((int) $terms['duration_months'])->subDay();
            $addon = SubscriptionAddon::create([
                'subscription_id' => $subscription->id,
                'business_id' => $subscription->business_id,
                'plan_id' => $selectedPlan->id,
                'plan_name' => $terms['name'],
                'offer_category' => $terms['offer_category'],
                'price' => $terms['monthly_price'],
                'duration_months' => $terms['duration_months'],
                'stores' => $terms['max_stores'],
                'products' => $terms['max_products'],
                'members' => $terms['max_members'],
                'scans' => $terms['max_scans'],
                'starts_on' => $startsOn,
                'ends_on' => $endsOn,
                'source' => 'self_service',
            ]);
            $this->audit->handle($actor, 'subscription.addon_selected', $addon, $subscription->store, $ipAddress, [
                'subscription_id' => $subscription->id,
                'plan_id' => $selectedPlan->id,
                'starts_on' => $startsOn->toDateString(),
                'ends_on' => $endsOn?->toDateString(),
                'entitlements' => $addon->only(['stores', 'products', 'members', 'scans']),
            ]);

            return $addon;
        }, 3);
    }
}
