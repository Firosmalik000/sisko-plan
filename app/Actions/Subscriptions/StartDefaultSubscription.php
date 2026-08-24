<?php

namespace App\Actions\Subscriptions;

use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;

class StartDefaultSubscription
{
    public function handle(Store $store): Subscription
    {
        $plan = Plan::query()->where(['is_default' => true, 'is_trial' => true, 'is_active' => true])->firstOrFail();

        $subscription = Subscription::firstOrCreate(['user_id' => $store->owner_user_id], [
            'store_id' => $store->id,
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Trialing,
            'starts_at' => now(),
            'trial_ends_at' => now()->addDays(Plan::TRIAL_DAYS),
            'trial_used_at' => now(),
        ]);

        if ($subscription->wasRecentlyCreated) {
            SubscriptionPeriod::create([
                'subscription_id' => $subscription->id,
                'user_id' => $store->owner_user_id,
                'plan_id' => $plan->id,
                'plan_name' => $plan->name,
                'monthly_price' => $plan->monthly_price,
                'duration_months' => $plan->duration_months,
                'period_start' => $subscription->starts_at->toDateString(),
                'period_end' => $subscription->trial_ends_at?->toDateString(),
                'source' => 'provisioning',
                'activated_at' => $subscription->starts_at,
            ]);
        }

        return $subscription;
    }
}
