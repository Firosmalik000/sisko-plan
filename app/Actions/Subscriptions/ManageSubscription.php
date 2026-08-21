<?php

namespace App\Actions\Subscriptions;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ManageSubscription
{
    public function __construct(private RecordAdminAudit $audit) {}

    /** @param array{plan_id:int,status:SubscriptionStatus,starts_at:string,trial_ends_at:?string,current_period_start:?string,current_period_end:?string,notes:?string} $data */
    public function handle(User $admin, Store $store, array $data, ?string $ipAddress): Subscription
    {
        return DB::transaction(function () use ($admin, $store, $data, $ipAddress): Subscription {
            Store::query()->whereKey($store->id)->lockForUpdate()->firstOrFail();
            Plan::query()->where(['id' => $data['plan_id'], 'is_active' => true])->firstOrFail();
            $subscription = Subscription::query()->where('store_id', $store->id)->lockForUpdate()->firstOrFail();
            $before = $subscription->only(['plan_id', 'status', 'starts_at', 'trial_ends_at', 'current_period_start', 'current_period_end', 'cancelled_at', 'notes']);
            $subscription->update([
                ...$data,
                'cancelled_at' => $data['status'] === SubscriptionStatus::Cancelled ? now() : null,
                'created_by_user_id' => $admin->id,
            ]);
            $this->audit->handle($admin, 'subscription.updated', $subscription, $ipAddress, ['store_id' => $store->id, 'before' => $before, 'after' => $subscription->only(['plan_id', 'status', 'starts_at', 'trial_ends_at', 'current_period_start', 'current_period_end', 'cancelled_at', 'notes'])]);

            return $subscription;
        });
    }
}
