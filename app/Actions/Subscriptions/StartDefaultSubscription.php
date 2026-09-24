<?php

namespace App\Actions\Subscriptions;

use App\Enums\SubscriptionStatus;
use App\Models\Business;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Schema;

class StartDefaultSubscription
{
    public function handle(Business $business): Subscription
    {
        $owner = $business->memberships()->where('business_role', 'owner')->whereNotNull('user_id')->with('user')->oldest('id')->first()?->user;
        if ($owner === null) {
            throw new \LogicException('A claimed Business owner is required to start a subscription.');
        }
        $store = $business->stores()->oldest('id')->first();
        $plan = $this->resolveDefaultPlan();
        $now = CarbonImmutable::now();
        $periodStart = $now->startOfDay();
        $periodEnd = $plan->is_trial
            ? $periodStart->addDays(Plan::TRIAL_DAYS)
            : ($plan->billing_cycle === Plan::BILLING_LIFETIME
                ? null
                : $periodStart->addMonthsNoOverflow($plan->duration_months)->subDay());

        $subscriptionAttributes = [
            'store_id' => $store?->id,
            'plan_id' => $plan->id,
            'status' => $plan->is_trial ? SubscriptionStatus::Trialing : SubscriptionStatus::Active,
            'starts_at' => $now,
            'trial_ends_at' => $plan->is_trial ? $periodEnd : null,
            'trial_used_at' => $plan->is_trial ? $now : null,
            'current_period_start' => $plan->is_trial ? null : $periodStart,
            'current_period_end' => $plan->is_trial ? null : $periodEnd,
        ];

        if (Schema::hasColumn('subscriptions', 'user_id')) {
            $subscriptionAttributes['user_id'] = $owner->id;
        }

        $subscription = Subscription::firstOrCreate(['business_id' => $business->id], $subscriptionAttributes);

        if (! $subscription->wasRecentlyCreated && $subscription->store_id === null && $store !== null) {
            $subscription->update(['store_id' => $store->id]);
        }

        if ($subscription->wasRecentlyCreated) {
            $periodData = [
                'subscription_id' => $subscription->id,
                'business_id' => $business->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'monthly_price' => $plan->monthly_price,
                'duration_months' => $plan->duration_months,
                'was_trial' => $plan->is_trial,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'source' => 'provisioning',
                'activated_at' => $subscription->starts_at,
            ];

            if (Schema::hasColumn('subscription_periods', 'user_id')) {
                $periodData['user_id'] = $owner->id;
            }

            SubscriptionPeriod::create($periodData);
        }

        return $subscription;
    }

    private function resolveDefaultPlan(): Plan
    {
        return Plan::query()->where([
            'kind' => Plan::KIND_BASE,
            'is_default' => true,
            'is_active' => true,
        ])->first()
            ?? Plan::query()->where([
                'is_default' => true,
                'is_active' => true,
            ])->first()
            ?? Plan::query()->where([
                'code' => 'starter-default',
            ])->first()
            ?? Plan::query()->where([
                'kind' => Plan::KIND_BASE,
                'is_active' => true,
            ])->oldest('id')->first()
            ?? Plan::query()->where('is_active', true)->oldest('id')->first()
            ?? Plan::create([
                'code' => 'starter-default',
                'name' => 'Gratis Selamanya',
                'description' => 'Paket dasar untuk memulai operasional toko.',
                'kind' => Plan::KIND_BASE,
                'billing_cycle' => Plan::BILLING_LIFETIME,
                'monthly_price' => '0',
                'duration_months' => 1,
                'max_stores' => 1,
                'max_products' => 1000,
                'max_members' => 1,
                'max_scans' => 100,
                'is_default' => true,
                'is_trial' => false,
                'is_active' => true,
            ]);
    }
}
