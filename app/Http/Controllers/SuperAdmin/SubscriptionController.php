<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Subscriptions\ActivateAllSubscriptions;
use App\Actions\Subscriptions\ManageSubscription;
use App\Actions\Subscriptions\PostSubscriptionPayment;
use App\Actions\Subscriptions\SavePlan;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use App\Services\Subscriptions\SubscriptionPeriods;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\PlatformPermission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(Request $request, SubscriptionPeriods $periods): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $periods->syncDuePeriods();
        $plans = Plan::query()
            ->withCount(['subscriptions' => fn ($query) => $query->whereNotNull('user_id')])
            ->orderBy('monthly_price')->get()
            ->map(fn (Plan $plan): array => [...$plan->only(['public_id', 'name', 'description', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'is_default', 'is_trial', 'is_active']), 'subscriptions_count' => $plan->subscriptions_count]);
        $subscriptions = Subscription::query()
            ->whereNotNull('user_id')
            ->with([
                'user' => fn ($query) => $query->select(['id', 'name', 'email'])->withCount('ownedStores'),
                'plan:id,public_id,name,monthly_price,duration_months,is_active',
                'periods' => fn ($query) => $query
                    ->with('plan:id,is_trial')
                    ->whereDate('period_start', '>', now()->toDateString())
                    ->orderBy('period_start')
                    ->orderBy('id'),
            ])
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                $query->whereHas('user', fn ($user) => $user->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('user.ownedStores', fn ($store) => $store->where('name', 'like', "%{$search}%"));
            }))
            ->when(in_array($status, array_column(SubscriptionStatus::cases(), 'value'), true), fn ($query) => $query->where('status', $status))
            ->latest('id')->paginate(15)->withQueryString()->through(fn (Subscription $subscription): array => [
                ...$subscription->only(['public_id', 'status', 'starts_at', 'trial_ends_at', 'current_period_start', 'current_period_end', 'notes']),
                'status' => $subscription->status->value,
                'account' => [
                    'name' => $subscription->user->name,
                    'email' => $subscription->user->email,
                    'stores_count' => $subscription->user->owned_stores_count,
                ],
                'plan' => $subscription->plan->only(['public_id', 'name', 'monthly_price', 'duration_months', 'is_active']),
                'scheduled_periods' => $subscription->periods->map(fn ($period): array => [
                    ...$period->only(['public_id', 'plan_name', 'monthly_price', 'duration_months']),
                    'is_trial' => $period->plan->is_trial,
                    'period_start' => $period->period_start->toDateString(),
                    'period_end' => $period->period_end?->toDateString(),
                ])->values()->all(),
            ]);

        return Inertia::render('super-admin/subscriptions/index', [
            'plans' => $plans, 'subscriptions' => $subscriptions,
            'filters' => ['search' => $search, 'status' => $status],
            'access' => [
                'manage_plans' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::PLANS_MANAGE),
                'manage_subscriptions' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::SUBSCRIPTIONS_MANAGE),
                'create_payments' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::PAYMENTS_CREATE),
                'view_payments' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::PAYMENTS_VIEW),
                'activate_all' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::SUBSCRIPTIONS_ACTIVATE_ALL),
            ],
        ]);
    }

    public function storePlan(Request $request, SavePlan $action): RedirectResponse
    {
        $action->handle(AuthenticatedPlatformAdmin::get($request), $this->planData($request), null, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Paket berhasil dibuat.']);

        return back();
    }

    public function updatePlan(Request $request, Plan $plan, SavePlan $action): RedirectResponse
    {
        $action->handle(AuthenticatedPlatformAdmin::get($request), $this->planData($request, $plan), $plan, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Paket berhasil diperbarui.']);

        return back();
    }

    public function updateSubscription(Request $request, Subscription $subscription, ManageSubscription $action): RedirectResponse
    {
        abort_if($subscription->user_id === null, 404);

        $validated = $request->validate([
            'plan_id' => [
                'required',
                Rule::exists('plans', 'public_id')->where(
                    fn ($query) => $query->where('is_active', true)->orWhere('id', $subscription->plan_id),
                ),
            ],
            'status' => ['required', Rule::enum(SubscriptionStatus::class)],
            'starts_at' => ['required', 'date'],
            'trial_ends_at' => [Rule::requiredIf($request->input('status') === SubscriptionStatus::Trialing->value), 'nullable', 'date', 'after_or_equal:starts_at'],
            'current_period_start' => [Rule::requiredIf($request->input('status') === SubscriptionStatus::Active->value), 'nullable', 'date', 'after_or_equal:starts_at'],
            'current_period_end' => ['nullable', 'date', 'after_or_equal:current_period_start'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        $plan = Plan::query()->where('public_id', $validated['plan_id'])->firstOrFail();
        $status = SubscriptionStatus::from($validated['status']);
        if ($plan->is_trial && $status !== SubscriptionStatus::Trialing) {
            throw ValidationException::withMessages(['status' => 'Paket trial harus menggunakan status Trial.']);
        }
        if (! $plan->is_trial && $status === SubscriptionStatus::Trialing) {
            throw ValidationException::withMessages(['status' => 'Status Trial hanya dapat digunakan oleh paket trial.']);
        }
        $action->handle(AuthenticatedPlatformAdmin::get($request), $subscription, [
            'plan_id' => $plan->id,
            'status' => $status,
            'starts_at' => $validated['starts_at'],
            'trial_ends_at' => $status === SubscriptionStatus::Trialing
                ? ($validated['trial_ends_at'] ?? null)
                : null,
            'current_period_start' => $status === SubscriptionStatus::Trialing
                ? null
                : ($validated['current_period_start'] ?? null),
            'current_period_end' => $status === SubscriptionStatus::Trialing
                ? null
                : ($validated['current_period_end'] ?? null),
            'notes' => $validated['notes'] ?? null,
        ], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Subscription akun berhasil diperbarui.']);

        return back();
    }

    public function storePayment(Request $request, Subscription $subscription, PostSubscriptionPayment $action): RedirectResponse
    {
        abort_if($subscription->user_id === null, 404);

        $validated = $request->validate([
            'amount' => ['required', 'decimal:0,4', 'gt:0', 'lte:999999999999999.9999'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'payment_method' => ['required', Rule::in(['cash', 'bank_transfer', 'qris', 'other'])],
            'external_reference' => ['nullable', 'string', 'max:120'],
            'paid_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'idempotency_key' => ['required', 'uuid'],
        ]);
        $action->handle(AuthenticatedPlatformAdmin::get($request), $subscription, $validated['amount'], $validated['period_start'], $validated['period_end'], $validated['payment_method'], $validated['external_reference'] ?? null, $validated['paid_at'], $validated['notes'] ?? null, $validated['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembayaran subscription berhasil diposting.']);

        return back();
    }

    public function activateAll(Request $request, ActivateAllSubscriptions $action): RedirectResponse
    {
        $count = $action->handle(AuthenticatedPlatformAdmin::get($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} subscription aktif mulai hari ini."]);

        return back();
    }

    /** @return array{name:string,description:?string,monthly_price:string,duration_months:int,max_stores:int,max_products:int,max_members:int,is_active:bool} */
    private function planData(Request $request, ?Plan $plan = null): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'monthly_price' => ['required', 'decimal:0,4', 'gte:0', 'lte:999999999999999.9999'],
            'duration_months' => ['required', 'integer', 'between:1,12'],
            'max_stores' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'max_products' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'max_members' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'is_active' => ['required', 'boolean'],
        ]);

        return [
            'name' => $validated['name'], 'description' => $validated['description'] ?? null,
            'monthly_price' => $validated['monthly_price'], 'duration_months' => (int) $validated['duration_months'], 'max_stores' => (int) $validated['max_stores'],
            'max_products' => (int) $validated['max_products'], 'max_members' => (int) $validated['max_members'],
            'is_active' => (bool) $validated['is_active'],
        ];
    }
}
