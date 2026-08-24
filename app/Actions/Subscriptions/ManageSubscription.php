<?php

namespace App\Actions\Subscriptions;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ManageSubscription
{
    public function __construct(private RecordAdminAudit $audit) {}

    /** @param array{plan_id:int,status:SubscriptionStatus,starts_at:string,trial_ends_at:?string,current_period_start:?string,current_period_end:?string,notes:?string} $data */
    public function handle(User $admin, Subscription $subscription, array $data, ?string $ipAddress): Subscription
    {
        return DB::transaction(function () use ($admin, $subscription, $data, $ipAddress): Subscription {
            $subscription = Subscription::query()->whereKey($subscription->id)->lockForUpdate()->firstOrFail();
            Plan::query()
                ->whereKey($data['plan_id'])
                ->where(fn ($query) => $query->where('is_active', true)->orWhere('id', $subscription->plan_id))
                ->firstOrFail();
            $before = $subscription->only(['plan_id', 'status', 'starts_at', 'trial_ends_at', 'trial_used_at', 'current_period_start', 'current_period_end', 'cancelled_at', 'notes']);
            $subscription->update([
                ...$data,
                'trial_used_at' => $data['status'] === SubscriptionStatus::Trialing
                    ? ($subscription->trial_used_at ?? now())
                    : $subscription->trial_used_at,
                'cancelled_at' => $data['status'] === SubscriptionStatus::Cancelled ? now() : null,
                'created_by_user_id' => $admin->id,
            ]);
            $this->audit->handle($admin, 'subscription.updated', $subscription, $ipAddress, ['user_id' => $subscription->user_id, 'before' => $before, 'after' => $subscription->only(['plan_id', 'status', 'starts_at', 'trial_ends_at', 'trial_used_at', 'current_period_start', 'current_period_end', 'cancelled_at', 'notes'])]);

            return $subscription;
        });
    }
}
