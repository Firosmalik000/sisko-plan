<?php

namespace App\Http\Controllers\PublicSite;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Services\Subscriptions\SubscriptionPeriods;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PricingController extends Controller
{
    public function __invoke(Request $request, SubscriptionAccess $access, SubscriptionPeriods $periods): Response
    {
        $focusCategory = in_array($request->string('category')->toString(), Plan::offerCategories(), true)
            ? $request->string('category')->toString()
            : null;
        $user = $request->user();
        $accountOwner = $user instanceof User && ! $user->isPlatformAdmin() && $user->ownedStores()->exists();
        $subscription = $accountOwner ? $periods->syncForOwner($user->id) : null;
        $operational = $subscription !== null && $access->blockedReason($subscription) === null;
        $nextPeriodStart = $subscription === null ? null : $periods->nextAvailableStart($subscription);
        $trialUsed = $subscription !== null
            && ($subscription->trial_used_at !== null || $subscription->trial_ends_at !== null);
        $plans = Plan::query()
            ->where('is_active', true)
            ->where('is_default', false)
            ->orderBy('monthly_price')
            ->orderBy('id')
            ->get(['id', 'public_id', 'name', 'description', 'kind', 'offer_category', 'billing_cycle', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'max_scans', 'is_default', 'is_trial'])
            ->map(function (Plan $plan) use ($user, $accountOwner, $subscription, $operational, $trialUsed, $nextPeriodStart): array {
                $current = $subscription?->plan_id === $plan->id;
                $disabledReason = null;

                if ($user instanceof User && $user->isPlatformAdmin()) {
                    $disabledReason = __('Akun admin platform tidak menggunakan paket toko.');
                } elseif ($user !== null && ! $accountOwner) {
                    $disabledReason = __('Buat toko terlebih dahulu.');
                } elseif ($user !== null && $subscription === null) {
                    $disabledReason = __('Subscription akun belum tersedia.');
                } elseif ($plan->kind === Plan::KIND_ADDON && ! $operational) {
                    $disabledReason = __('Add-on memerlukan subscription aktif.');
                } elseif ($plan->is_trial && $trialUsed && ! ($current && $operational)) {
                    $disabledReason = __('Trial sudah digunakan.');
                } elseif ($current && $plan->billing_cycle === Plan::BILLING_LIFETIME) {
                    $disabledReason = __('Paket ini sedang digunakan.');
                } elseif ($plan->kind === Plan::KIND_BASE && ! $plan->is_trial && $nextPeriodStart === null
                    && ! ($subscription?->plan->billing_cycle === Plan::BILLING_LIFETIME
                        && (float) $subscription->plan->monthly_price === 0.0)) {
                    $disabledReason = __('Paket aktif tidak memiliki batas periode.');
                }

                return [
                    ...$plan->only(['public_id', 'name', 'description', 'kind', 'offer_category', 'billing_cycle', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'max_scans', 'is_default', 'is_trial']),
                    'is_current' => $current,
                    'can_select' => $user !== null
                        && $accountOwner
                        && $disabledReason === null
                        && (! $plan->is_trial || ! $operational),
                    'disabled_reason' => $disabledReason,
                ];
            });

        return Inertia::render('public/pricing', [
            'plans' => $plans,
            'focus_category' => $focusCategory,
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
}
