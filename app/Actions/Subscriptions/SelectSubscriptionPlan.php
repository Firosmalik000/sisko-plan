<?php

namespace App\Actions\Subscriptions;

use App\Actions\Audit\RecordAudit;
use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Models\User;
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
    public function handle(User $owner, Plan $plan, ?string $ipAddress): array
    {
        $this->periods->syncForOwner($owner->id);

        return DB::transaction(function () use ($owner, $plan, $ipAddress): array {
            User::query()->whereKey($owner->id)->lockForUpdate()->firstOrFail();
            $subscription = Subscription::query()
                ->with(['plan', 'store'])
                ->where('user_id', $owner->id)
                ->lockForUpdate()
                ->first();
            $selectedPlan = Plan::query()->whereKey($plan->id)->where('is_active', true)->lockForUpdate()->firstOrFail();

            if ($subscription === null) {
                throw ValidationException::withMessages([
                    'plan_id' => 'Subscription akun belum tersedia. Hubungi pengelola platform.',
                ]);
            }
            $operational = $this->access->blockedReason($subscription) === null;
            if ($selectedPlan->is_trial && ($subscription->trial_used_at !== null || $subscription->trial_ends_at !== null)) {
                throw ValidationException::withMessages([
                    'plan_id' => 'Trial hanya dapat digunakan satu kali per akun.',
                ]);
            }
            if ($selectedPlan->is_trial && $operational) {
                throw ValidationException::withMessages([
                    'plan_id' => 'Trial tidak dapat dijadwalkan saat subscription masih aktif.',
                ]);
            }

            $this->access->assertPlanCapacity($owner, $selectedPlan);

            $now = CarbonImmutable::now();
            $periodStart = $selectedPlan->is_trial
                ? $now->startOfDay()
                : $this->periods->nextAvailableStart($subscription);
            if ($periodStart === null) {
                throw ValidationException::withMessages([
                    'plan_id' => 'Subscription tanpa batas periode tidak dapat diperpanjang.',
                ]);
            }
            $periodEnd = $selectedPlan->is_trial
                ? $periodStart->addDays(Plan::TRIAL_DAYS)
                : $periodStart->addMonthsNoOverflow($selectedPlan->duration_months)->subDay();
            $scheduled = $periodStart->isAfter($now->startOfDay());
            $before = $subscription->only([
                'plan_id', 'status', 'starts_at', 'trial_ends_at', 'trial_used_at',
                'current_period_start', 'current_period_end', 'cancelled_at',
            ]);
            $period = SubscriptionPeriod::create([
                'subscription_id' => $subscription->id,
                'user_id' => $owner->id,
                'plan_id' => $selectedPlan->id,
                'plan_name' => $selectedPlan->name,
                'monthly_price' => $selectedPlan->monthly_price,
                'duration_months' => $selectedPlan->duration_months,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'source' => 'self_service',
                'activated_at' => $scheduled ? null : $now,
                'created_by_user_id' => $owner->id,
            ]);

            if (! $scheduled) {
                $attributes = [
                    'plan_id' => $selectedPlan->id,
                    'starts_at' => $periodStart,
                    'cancelled_at' => null,
                    'created_by_user_id' => $owner->id,
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

            $this->audit->handle($owner, 'subscription.plan_selected', $subscription, $subscription->store, $ipAddress, [
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
