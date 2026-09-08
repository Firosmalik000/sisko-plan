<?php

namespace App\Actions\Subscriptions;

use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use Carbon\CarbonImmutable;

class StartDefaultSubscription
{
    public function handle(Store|User $subject): Subscription
    {
        $owner = $subject instanceof Store ? $subject->owner : $subject;
        $store = $subject instanceof Store ? $subject : null;
        $plan = Plan::query()->where([
            'kind' => Plan::KIND_BASE,
            'is_default' => true,
            'is_active' => true,
        ])->firstOrFail();
        $now = CarbonImmutable::now();
        $periodStart = $now->startOfDay();
        $periodEnd = $plan->is_trial
            ? $periodStart->addDays(Plan::TRIAL_DAYS)
            : ($plan->billing_cycle === Plan::BILLING_LIFETIME
                ? null
                : $periodStart->addMonthsNoOverflow($plan->duration_months)->subDay());

        $subscription = Subscription::firstOrCreate(['user_id' => $owner->id], [
            'store_id' => $store?->id,
            'plan_id' => $plan->id,
            'status' => $plan->is_trial ? SubscriptionStatus::Trialing : SubscriptionStatus::Active,
            'starts_at' => $now,
            'trial_ends_at' => $plan->is_trial ? $periodEnd : null,
            'trial_used_at' => $plan->is_trial ? $now : null,
            'current_period_start' => $plan->is_trial ? null : $periodStart,
            'current_period_end' => $plan->is_trial ? null : $periodEnd,
        ]);

        if (! $subscription->wasRecentlyCreated && $subscription->store_id === null && $store !== null) {
            $subscription->update(['store_id' => $store->id]);
        }

        if ($subscription->wasRecentlyCreated) {
            SubscriptionPeriod::create([
                'subscription_id' => $subscription->id,
                'user_id' => $owner->id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'monthly_price' => $plan->monthly_price,
                'duration_months' => $plan->duration_months,
                'was_trial' => $plan->is_trial,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'source' => 'provisioning',
                'activated_at' => $subscription->starts_at,
            ]);
        }

        return $subscription;
    }
}
