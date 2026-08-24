<?php

namespace App\Actions\Subscriptions;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ActivateAllSubscriptions
{
    public function __construct(private RecordAdminAudit $audit) {}

    public function handle(User $admin, ?string $ipAddress): int
    {
        return DB::transaction(function () use ($admin, $ipAddress): int {
            $subscriptions = Subscription::query()
                ->with('plan:id,monthly_price,duration_months,is_trial')
                ->whereNotNull('user_id')
                ->lockForUpdate()
                ->orderBy('id')
                ->get();
            $now = CarbonImmutable::now();
            $periodStart = $now->startOfDay();

            foreach ($subscriptions as $subscription) {
                $before = $subscription->only([
                    'status', 'starts_at', 'trial_ends_at', 'current_period_start',
                    'current_period_end', 'cancelled_at',
                ]);
                $subscription->update([
                    'status' => $subscription->plan->is_trial
                        ? SubscriptionStatus::Trialing
                        : SubscriptionStatus::Active,
                    'starts_at' => $now,
                    'trial_ends_at' => $subscription->plan->is_trial ? $now->addDays(Plan::TRIAL_DAYS) : null,
                    'trial_used_at' => $subscription->plan->is_trial ? ($subscription->trial_used_at ?? $now) : $subscription->trial_used_at,
                    'current_period_start' => $subscription->plan->is_trial ? null : $periodStart,
                    'current_period_end' => $subscription->plan->is_trial
                        ? null
                        : $periodStart->addMonthsNoOverflow($subscription->plan->duration_months)->subDay(),
                    'cancelled_at' => null,
                    'created_by_user_id' => $admin->id,
                ]);
                $this->audit->handle($admin, 'subscription.activated_from_now', $subscription, $ipAddress, [
                    'user_id' => $subscription->user_id,
                    'before' => $before,
                    'after' => $subscription->only([
                        'status', 'starts_at', 'trial_ends_at', 'current_period_start',
                        'current_period_end', 'cancelled_at',
                    ]),
                ]);
            }

            return $subscriptions->count();
        });
    }
}
