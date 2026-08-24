<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Enums\PlatformAdminRole;
use App\Enums\StoreStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $today = now()->startOfDay();
        $operationalSubscriptions = Subscription::query()
            ->whereNotNull('user_id')
            ->where(function ($query) use ($today): void {
                $query->where(function ($active) use ($today): void {
                    $active->where('status', SubscriptionStatus::Active->value)
                        ->where(fn ($period) => $period->whereNull('current_period_end')->orWhere('current_period_end', '>=', $today));
                })->orWhere(function ($trialing) use ($today): void {
                    $trialing->where('status', SubscriptionStatus::Trialing->value)
                        ->where(fn ($period) => $period->whereNull('trial_ends_at')->orWhere('trial_ends_at', '>=', $today));
                });
            });

        $paymentTrend = collect(range(5, 0))->map(function (int $monthsAgo): array {
            $month = now()->startOfMonth()->subMonths($monthsAgo);

            return [
                'label' => $month->translatedFormat('M'),
                'amount' => SubscriptionPayment::query()
                    ->whereBetween('paid_at', [$month, $month->endOfMonth()])
                    ->sum('amount'),
            ];
        });
        $subscriptionBreakdown = collect(SubscriptionStatus::cases())->mapWithKeys(
            fn (SubscriptionStatus $status): array => [
                $status->value => Subscription::query()->whereNotNull('user_id')->where('status', $status)->count(),
            ],
        );

        return Inertia::render('super-admin/dashboard', [
            'metrics' => [
                'users' => User::query()->count(),
                'active_users' => User::query()->where('status', UserStatus::Active->value)->count(),
                'stores' => Store::query()->count(),
                'active_stores' => Store::query()->where('status', StoreStatus::Active->value)->count(),
                'operational_subscriptions' => (clone $operationalSubscriptions)->count(),
                'monthly_recurring_revenue' => (clone $operationalSubscriptions)->where('status', SubscriptionStatus::Active->value)->join('plans', 'plans.id', '=', 'subscriptions.plan_id')->sum('plans.monthly_price'),
                'payments_this_month' => SubscriptionPayment::query()->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'),
                'new_users_this_month' => User::query()->where('created_at', '>=', now()->startOfMonth())->count(),
                'new_stores_this_month' => Store::query()->where('created_at', '>=', now()->startOfMonth())->count(),
            ],
            'subscription_breakdown' => $subscriptionBreakdown,
            'payment_trend' => $paymentTrend,
            'security' => [
                'platform_admins' => User::query()->whereNotNull('platform_role')->count(),
                'super_admins' => User::query()->where('platform_role', PlatformAdminRole::SuperAdmin)->count(),
                'two_factor_enabled' => User::query()->whereNotNull('platform_role')->whereNotNull('two_factor_confirmed_at')->count(),
            ],
            'recent_payments' => SubscriptionPayment::query()
                ->with(['user:id,name', 'store:id,name'])
                ->latest('paid_at')
                ->limit(5)
                ->get()
                ->map(fn (SubscriptionPayment $payment): array => [
                    'public_id' => $payment->public_id,
                    'receipt_number' => $payment->receipt_number,
                    'account' => $payment->user?->name ?? $payment->store->name,
                    'amount' => $payment->amount,
                    'paid_at' => $payment->paid_at->toIso8601String(),
                ]),
            'recent_activity' => AdminAuditLog::query()
                ->with('user:id,name')
                ->latest('id')
                ->limit(8)
                ->get()
                ->map(fn (AdminAuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'admin' => $log->user->name,
                    'created_at' => $log->created_at->toIso8601String(),
                ]),
        ]);
    }
}
