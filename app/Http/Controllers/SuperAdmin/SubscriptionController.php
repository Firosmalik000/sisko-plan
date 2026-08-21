<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Subscriptions\ManageSubscription;
use App\Actions\Subscriptions\PostSubscriptionPayment;
use App\Actions\Subscriptions\SavePlan;
use App\Enums\SubscriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Subscription;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $plans = Plan::query()->withCount('subscriptions')->orderBy('monthly_price')->get()
            ->map(fn (Plan $plan): array => [...$plan->only(['public_id', 'code', 'name', 'description', 'monthly_price', 'max_products', 'max_members', 'is_default', 'is_active']), 'subscriptions_count' => $plan->subscriptions_count]);
        $subscriptions = Subscription::query()->with(['store.owner:id,name,email', 'plan:id,public_id,name'])
            ->when($search !== '', fn ($query) => $query->whereHas('store', fn ($store) => $store->where('name', 'like', "%{$search}%")))
            ->when(in_array($status, array_column(SubscriptionStatus::cases(), 'value'), true), fn ($query) => $query->where('status', $status))
            ->latest('id')->paginate(15)->withQueryString()->through(fn (Subscription $subscription): array => [
                ...$subscription->only(['public_id', 'status', 'starts_at', 'trial_ends_at', 'current_period_start', 'current_period_end', 'notes']),
                'status' => $subscription->status->value,
                'store' => ['public_id' => $subscription->store->public_id, 'name' => $subscription->store->name, 'owner_name' => $subscription->store->owner->name, 'owner_email' => $subscription->store->owner->email],
                'plan' => $subscription->plan->only(['public_id', 'name']),
            ]);

        return Inertia::render('super-admin/subscriptions/index', [
            'plans' => $plans, 'subscriptions' => $subscriptions,
            'filters' => ['search' => $search, 'status' => $status],
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
        $validated = $request->validate([
            'plan_id' => ['required', Rule::exists('plans', 'public_id')->where('is_active', true)],
            'status' => ['required', Rule::enum(SubscriptionStatus::class)],
            'starts_at' => ['required', 'date'],
            'trial_ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'current_period_start' => ['nullable', 'date'],
            'current_period_end' => ['nullable', 'date', 'after_or_equal:current_period_start'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
        $planId = Plan::query()->where('public_id', $validated['plan_id'])->valueOrFail('id');
        $action->handle(AuthenticatedPlatformAdmin::get($request), $subscription->store, [
            'plan_id' => $planId,
            'status' => SubscriptionStatus::from($validated['status']),
            'starts_at' => $validated['starts_at'],
            'trial_ends_at' => $validated['trial_ends_at'] ?? null,
            'current_period_start' => $validated['current_period_start'] ?? null,
            'current_period_end' => $validated['current_period_end'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Subscription toko berhasil diperbarui.']);

        return back();
    }

    public function storePayment(Request $request, Subscription $subscription, PostSubscriptionPayment $action): RedirectResponse
    {
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

    /** @return array{code:string,name:string,description:?string,monthly_price:string,max_products:int,max_members:int,is_default:bool,is_active:bool} */
    private function planData(Request $request, ?Plan $plan = null): array
    {
        $validated = $request->validate([
            'code' => ['required', 'alpha_dash:ascii', 'max:50', Rule::unique('plans', 'code')->ignore($plan?->id)],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'monthly_price' => ['required', 'decimal:0,4', 'gte:0', 'lte:999999999999999.9999'],
            'max_products' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'max_members' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'is_default' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ]);

        return [
            'code' => $validated['code'], 'name' => $validated['name'], 'description' => $validated['description'] ?? null,
            'monthly_price' => $validated['monthly_price'], 'max_products' => (int) $validated['max_products'], 'max_members' => (int) $validated['max_members'],
            'is_default' => (bool) $validated['is_default'], 'is_active' => (bool) $validated['is_active'],
        ];
    }
}
