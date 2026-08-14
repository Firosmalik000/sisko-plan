<?php

namespace App\Actions\Subscriptions;

use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;

class StartDefaultSubscription
{
    public function handle(Store $store): Subscription
    {
        $plan = Plan::query()->where(['is_default' => true, 'is_active' => true])->firstOrFail();

        return Subscription::firstOrCreate(['store_id' => $store->id], [
            'plan_id' => $plan->id,
            'status' => SubscriptionStatus::Active,
            'starts_at' => now(),
        ]);
    }
}
