<?php

namespace App\Http\Controllers;

use App\Actions\Subscriptions\SelectSubscriptionPlan;
use App\Models\Plan;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Services\Subscriptions\SubscriptionPeriods;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PricingController extends Controller
{
    public function __invoke(Request $request, SubscriptionAccess $access, SubscriptionPeriods $periods): Response
    {
        $user = $request->user();
        $accountOwner = $user instanceof User && ! $user->isPlatformAdmin() && $user->ownedStores()->exists();
        $subscription = $accountOwner ? $periods->syncForOwner($user->id) : null;
        $operational = $subscription !== null && $access->blockedReason($subscription) === null;
        $nextPeriodStart = $subscription === null ? null : $periods->nextAvailableStart($subscription);
        $trialUsed = $subscription !== null
            && ($subscription->trial_used_at !== null || $subscription->trial_ends_at !== null);
        $plans = Plan::query()
            ->where('is_active', true)
            ->orderBy('monthly_price')
            ->orderBy('id')
            ->get(['id', 'public_id', 'name', 'description', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'is_default', 'is_trial'])
            ->map(function (Plan $plan) use ($user, $accountOwner, $subscription, $operational, $trialUsed, $nextPeriodStart): array {
                $current = $subscription?->plan_id === $plan->id;
                $disabledReason = null;

                if ($user instanceof User && $user->isPlatformAdmin()) {
                    $disabledReason = 'Akun admin platform tidak menggunakan paket toko.';
                } elseif ($user !== null && ! $accountOwner) {
                    $disabledReason = 'Buat toko terlebih dahulu.';
                } elseif ($user !== null && $subscription === null) {
                    $disabledReason = 'Subscription akun belum tersedia.';
                } elseif ($plan->is_trial && $trialUsed && ! ($current && $operational)) {
                    $disabledReason = 'Trial sudah digunakan.';
                } elseif (! $plan->is_trial && $nextPeriodStart === null) {
                    $disabledReason = 'Paket aktif tidak memiliki batas periode.';
                }

                return [
                    ...$plan->only(['public_id', 'name', 'description', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'is_default', 'is_trial']),
                    'is_current' => $current,
                    'can_select' => $user !== null
                        && $accountOwner
                        && $disabledReason === null
                        && (! $plan->is_trial || ! $operational),
                    'disabled_reason' => $disabledReason,
                ];
            });

        return Inertia::render('pricing', [
            'plans' => $plans,
            'account' => [
                'has_store' => $accountOwner,
                'has_subscription' => $subscription !== null,
                'can_access_dashboard' => $operational,
                'trial_used' => $trialUsed,
                'current_plan_id' => $subscription?->plan?->public_id,
                'next_period_start' => $nextPeriodStart?->toDateString(),
            ],
        ]);
    }

    public function subscribe(Request $request, SelectSubscriptionPlan $action): RedirectResponse
    {
        $user = $request->user();
        if (! $user instanceof User || $user->isPlatformAdmin()) {
            abort(403);
        }
        abort_unless($user->ownedStores()->exists(), 403);

        $validated = $request->validate([
            'plan_id' => ['required', 'string', 'exists:plans,public_id'],
        ]);
        $plan = Plan::query()->where('public_id', $validated['plan_id'])->where('is_active', true)->first();
        if ($plan === null) {
            throw ValidationException::withMessages(['plan_id' => __('Plan is unavailable.')]);
        }

        $result = $action->handle($user, $plan, $request->ip());
        if ($result['scheduled']) {
            Inertia::flash('toast', [
                'type' => 'success',
                'message' => __('Plan :name is scheduled to start on :date.', [
                    'name' => $plan->name,
                    'date' => $result['period']->period_start->translatedFormat('d M Y'),
                ]),
            ]);

            return to_route('subscription.index');
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Plan :name activated successfully.', ['name' => $plan->name])]);

        return to_route('dashboard');
    }
}
