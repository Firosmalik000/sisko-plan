<?php

namespace App\Services\Subscriptions;

use App\Enums\SubscriptionStatus;
use App\Models\Subscription;
use App\Models\SubscriptionPeriod;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class SubscriptionPeriods
{
    public function syncDuePeriods(): void
    {
        SubscriptionPeriod::query()
            ->whereNull('activated_at')
            ->whereDate('period_start', '<=', CarbonImmutable::today())
            ->where(fn ($query) => $query->whereNull('period_end')->orWhereDate('period_end', '>=', CarbonImmutable::today()))
            ->distinct()
            ->pluck('user_id')
            ->each(fn (int $ownerId) => $this->syncForOwner($ownerId));
    }

    public function syncForOwner(int $ownerId): ?Subscription
    {
        return DB::transaction(function () use ($ownerId): ?Subscription {
            User::query()->whereKey($ownerId)->lockForUpdate()->first();
            $subscription = Subscription::query()
                ->where('user_id', $ownerId)
                ->lockForUpdate()
                ->first();

            if ($subscription === null) {
                return null;
            }

            $today = CarbonImmutable::today();
            $period = SubscriptionPeriod::query()
                ->where('subscription_id', $subscription->id)
                ->whereNull('activated_at')
                ->whereDate('period_start', '<=', $today)
                ->where(fn ($query) => $query->whereNull('period_end')->orWhereDate('period_end', '>=', $today))
                ->orderByDesc('period_start')
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            if ($period === null) {
                return $subscription->load('plan');
            }

            $subscription->update([
                'plan_id' => $period->plan_id,
                'status' => SubscriptionStatus::Active,
                'starts_at' => $period->period_start->startOfDay(),
                'trial_ends_at' => null,
                'current_period_start' => $period->period_start,
                'current_period_end' => $period->period_end,
                'cancelled_at' => null,
                'created_by_user_id' => $period->created_by_user_id,
            ]);
            $period->update(['activated_at' => now()]);

            return $subscription->load('plan');
        }, 3);
    }

    public function nextAvailableStart(Subscription $subscription): ?CarbonImmutable
    {
        $today = CarbonImmutable::today();
        $coverageEnd = match ($subscription->status) {
            SubscriptionStatus::Trialing => $subscription->trial_ends_at,
            SubscriptionStatus::Active => $subscription->current_period_end,
            default => null,
        };

        if ($subscription->status === SubscriptionStatus::Active
            && $subscription->current_period_start !== null
            && $subscription->current_period_end === null) {
            return null;
        }

        $queuedEnd = SubscriptionPeriod::query()
            ->where('subscription_id', $subscription->id)
            ->whereNull('activated_at')
            ->whereNotNull('period_end')
            ->max('period_end');
        if ($queuedEnd !== null) {
            $queuedEnd = CarbonImmutable::parse($queuedEnd);
            if ($coverageEnd === null || $queuedEnd->gt($coverageEnd)) {
                $coverageEnd = $queuedEnd;
            }
        }

        return $coverageEnd !== null && $coverageEnd->endOfDay()->gte(CarbonImmutable::now())
            ? CarbonImmutable::parse($coverageEnd)->addDay()->startOfDay()
            : $today;
    }
}
