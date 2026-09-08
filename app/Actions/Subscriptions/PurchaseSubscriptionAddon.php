<?php

namespace App\Actions\Subscriptions;

use App\Actions\Audit\RecordAudit;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionAddon;
use App\Models\User;
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

    public function handle(User $owner, Plan $plan, ?string $ipAddress): SubscriptionAddon
    {
        $this->periods->syncForOwner($owner->id);

        return DB::transaction(function () use ($owner, $plan, $ipAddress): SubscriptionAddon {
            User::query()->whereKey($owner->id)->lockForUpdate()->firstOrFail();
            $subscription = Subscription::query()->with(['plan', 'store'])
                ->where('user_id', $owner->id)->lockForUpdate()->firstOrFail();
            $selectedPlan = Plan::query()->whereKey($plan->id)
                ->where(['kind' => Plan::KIND_ADDON, 'is_active' => true])
                ->lockForUpdate()->firstOrFail();

            if ($this->access->blockedReason($subscription) !== null) {
                throw ValidationException::withMessages([
                    'plan_id' => __('Add-on hanya dapat ditambahkan pada subscription yang aktif.'),
                ]);
            }

            $startsOn = CarbonImmutable::today();
            $endsOn = $selectedPlan->billing_cycle === Plan::BILLING_LIFETIME
                ? null
                : $startsOn->addMonthsNoOverflow($selectedPlan->duration_months)->subDay();
            $addon = SubscriptionAddon::create([
                'subscription_id' => $subscription->id,
                'user_id' => $owner->id,
                'plan_id' => $selectedPlan->id,
                'plan_name' => $selectedPlan->name,
                'offer_category' => $selectedPlan->offer_category,
                'price' => $selectedPlan->monthly_price,
                'duration_months' => $selectedPlan->duration_months,
                'stores' => $selectedPlan->max_stores,
                'products' => $selectedPlan->max_products,
                'members' => $selectedPlan->max_members,
                'scans' => $selectedPlan->max_scans,
                'starts_on' => $startsOn,
                'ends_on' => $endsOn,
                'source' => 'self_service',
                'created_by_user_id' => $owner->id,
            ]);
            $this->audit->handle($owner, 'subscription.addon_selected', $addon, $subscription->store, $ipAddress, [
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
