<?php

namespace App\Actions\Subscriptions;

use App\Actions\Audit\RecordAudit;
use App\Enums\SubscriptionStatus;
use App\Models\BusinessMembership;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Services\Subscriptions\SubscriptionPeriods;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SelectSubscriptionPlan
{
    public function __construct(
        private RecordAudit $audit,
        private SubscriptionAccess $access,
        private SubscriptionPeriods $periods,
    ) {}

    /** @return array{subscription:Subscription,period:SubscriptionPeriod,scheduled:bool} */
    public function handle(BusinessMembership $actor, Plan $plan, ?string $ipAddress): array
    {
        $this->periods->syncForBusiness($actor->business_id);

        return DB::transaction(function () use ($actor, $plan, $ipAddress): array {
            $actor = BusinessMembership::query()->with(['business', 'user'])->whereKey($actor->id)->lockForUpdate()->firstOrFail();
            abort_unless($actor->business_role->value === 'owner' && $actor->user !== null, 403);
            $subscription = Subscription::query()
                ->with(['plan', 'store'])
                ->where('business_id', $actor->business_id)
                ->lockForUpdate()
                ->first();
            $selectedPlan = Plan::query()->whereKey($plan->id)->where('is_active', true)->lockForUpdate()->firstOrFail();

            if ($selectedPlan->kind !== Plan::KIND_BASE) {
                throw ValidationException::withMessages(['plan_id' => __('Penawaran ini bukan paket utama.')]);
            }

            if ($subscription === null) {
                throw ValidationException::withMessages([
                    'plan_id' => __('The account subscription is not available yet. Contact the platform administrator.'),
                ]);
            }
            $operational = $this->access->blockedReason($subscription) === null;
            if ($selectedPlan->is_trial && ($subscription->trial_used_at !== null || $subscription->trial_ends_at !== null)) {
                throw ValidationException::withMessages([
                    'plan_id' => __('A trial can only be used once per account.'),
                ]);
            }
            if ($selectedPlan->is_trial && $operational) {
                throw ValidationException::withMessages([
                    'plan_id' => __('A trial cannot be scheduled while a subscription is active.'),
                ]);
            }

            $this->access->assertPlanCapacity($actor->business, $selectedPlan);

            $now = CarbonImmutable::now();
            $freeLifetimeUpgrade = $operational
                && $subscription->plan->billing_cycle === Plan::BILLING_LIFETIME
                && (float) $subscription->plan->monthly_price === 0.0
                && $subscription->plan_id !== $selectedPlan->id;
            $periodStart = $selectedPlan->is_trial || $freeLifetimeUpgrade
                ? $now->startOfDay()
                : $this->periods->nextAvailableStart($subscription);
            if ($periodStart === null) {
                throw ValidationException::withMessages([
                    'plan_id' => __('A subscription without a defined period cannot be extended.'),
                ]);
            }
            $periodEnd = $selectedPlan->is_trial
                ? $periodStart->addDays(Plan::TRIAL_DAYS)
                : ($selectedPlan->billing_cycle === Plan::BILLING_LIFETIME
                    ? null
                    : $periodStart->addMonthsNoOverflow($selectedPlan->duration_months)->subDay());
            $scheduled = $periodStart->isAfter($now->startOfDay());
            $before = $subscription->only([
                'plan_id', 'status', 'starts_at', 'trial_ends_at', 'trial_used_at',
                'current_period_start', 'current_period_end', 'cancelled_at',
            ]);
            $period = SubscriptionPeriod::create([
                'subscription_id' => $subscription->id,
                'business_id' => $subscription->business_id,
                'plan_id' => $selectedPlan->id,
                'plan_name' => $selectedPlan->name,
                'monthly_price' => $selectedPlan->monthly_price,
                'duration_months' => $selectedPlan->duration_months,
                'was_trial' => $selectedPlan->is_trial,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'source' => 'self_service',
                'activated_at' => $scheduled ? null : $now,
            ]);

            if (! $scheduled) {
                if ($freeLifetimeUpgrade) {
                    $previousStart = $subscription->current_period_start?->toImmutable() ?? $periodStart;
                    SubscriptionPeriod::query()
                        ->where('subscription_id', $subscription->id)
                        ->where('plan_id', $subscription->plan_id)
                        ->whereNull('period_end')
                        ->update(['period_end' => $previousStart->gt($periodStart->subDay()) ? $previousStart : $periodStart->subDay()]);
                }
                $attributes = [
                    'plan_id' => $selectedPlan->id,
                    'starts_at' => $periodStart,
                    'cancelled_at' => null,
                ];
                if ($selectedPlan->is_trial) {
                    $attributes += [
                        'status' => SubscriptionStatus::Trialing,
                        'trial_ends_at' => $periodEnd,
                        'trial_used_at' => $now,
                        'current_period_start' => null,
                        'current_period_end' => null,
                    ];
                } else {
                    $attributes += [
                        'status' => SubscriptionStatus::Active,
                        'trial_ends_at' => null,
                        'current_period_start' => $periodStart,
                        'current_period_end' => $periodEnd,
                    ];
                }
                $subscription->update($attributes);
            }

            $this->audit->handle($actor, 'subscription.plan_selected', $subscription, $subscription->store, $ipAddress, [
                'before' => $before,
                'after' => $subscription->only([
                    'plan_id', 'status', 'starts_at', 'trial_ends_at', 'trial_used_at',
                    'current_period_start', 'current_period_end', 'cancelled_at',
                ]),
                'period' => $period->only(['plan_id', 'period_start', 'period_end', 'source']),
                'scheduled' => $scheduled,
            ]);

            return ['subscription' => $subscription, 'period' => $period, 'scheduled' => $scheduled];
        });
    }
}
