<?php

namespace App\Http\Controllers\SuperAdmin;

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
            ->where(function ($query) use ($today): void {
                $query->where(function ($active) use ($today): void {
                    $active->where('status', SubscriptionStatus::Active->value)
                        ->where(fn ($period) => $period->whereNull('current_period_end')->orWhere('current_period_end', '>=', $today));
                })->orWhere(function ($trialing) use ($today): void {
                    $trialing->where('status', SubscriptionStatus::Trialing->value)
                        ->where(fn ($period) => $period->whereNull('trial_ends_at')->orWhere('trial_ends_at', '>=', $today));
                });
            });

        return Inertia::render('super-admin/dashboard', [
            'metrics' => [
                'users' => User::query()->count(),
                'active_users' => User::query()->where('status', UserStatus::Active->value)->count(),
                'stores' => Store::query()->count(),
                'active_stores' => Store::query()->where('status', StoreStatus::Active->value)->count(),
                'operational_subscriptions' => (clone $operationalSubscriptions)->count(),
                'monthly_recurring_revenue' => (clone $operationalSubscriptions)->where('status', SubscriptionStatus::Active->value)->join('plans', 'plans.id', '=', 'subscriptions.plan_id')->sum('plans.monthly_price'),
                'payments_this_month' => SubscriptionPayment::query()->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])->sum('amount'),
            ],
            'recent_activity' => AdminAuditLog::query()
                ->with('platformAdmin:id,name')
                ->latest('id')
                ->limit(8)
                ->get()
                ->map(fn (AdminAuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'admin' => $log->platformAdmin->name,
                    'created_at' => $log->created_at->toIso8601String(),
                ]),
        ]);
    }
}
