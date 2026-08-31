<?php

namespace App\Http\Controllers;

use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Services\Subscriptions\SubscriptionPeriods;
use App\Support\CurrentStore;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function __invoke(CurrentStore $currentStore, SubscriptionAccess $access, SubscriptionPeriods $periods): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewSubscription', $store);
        $periods->syncForOwner($store->owner_user_id);
        $subscription = Subscription::query()->with('plan')->where('user_id', $store->owner_user_id)->firstOrFail();
        $today = CarbonImmutable::today();
        $history = $subscription->periods()
            ->with('plan:id,is_trial')
            ->latest('period_start')
            ->latest('id')
            ->paginate(20, ['public_id', 'plan_id', 'plan_name', 'monthly_price', 'duration_months', 'period_start', 'period_end', 'source', 'activated_at'], 'history_page')
            ->through(function ($period) use ($today, $subscription): array {
                $currentStart = $subscription->status->value === 'trialing'
                    ? $subscription->starts_at->toDateString()
                    : $subscription->current_period_start?->toDateString();
                $currentEnd = $subscription->status->value === 'trialing'
                    ? $subscription->trial_ends_at?->toDateString()
                    : $subscription->current_period_end?->toDateString();
                $isCurrent = $period->plan_id === $subscription->plan_id
                    && $period->period_start->toDateString() === $currentStart
                    && $period->period_end?->toDateString() === $currentEnd;
                $status = $period->period_start->gt($today)
                    ? 'scheduled'
                    : ($isCurrent && ! ($period->period_end?->lt($today) ?? false) ? 'active' : 'completed');

                return [
                    ...$period->only(['public_id', 'plan_name', 'monthly_price', 'duration_months', 'period_start', 'period_end', 'source']),
                    'is_trial' => $period->plan->is_trial,
                    'status' => $status,
                ];
            });
        $payments = SubscriptionPayment::query()->where('user_id', $store->owner_user_id)->latest('id')->paginate(20, ['public_id', 'receipt_number', 'amount', 'period_start', 'period_end', 'payment_method', 'external_reference', 'paid_at'], 'payment_page');

        return Inertia::render('subscription/index', [
            'subscription' => [
                ...$subscription->only(['public_id', 'status', 'starts_at', 'trial_ends_at', 'current_period_start', 'current_period_end']),
                'status' => $subscription->status->value,
                'plan' => $subscription->plan->only(['name', 'description', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members']),
            ],
            'usage' => $access->summary($store),
            'history' => $history,
            'payments' => $payments,
        ]);
    }
}
