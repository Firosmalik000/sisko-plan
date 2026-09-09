<?php

namespace App\Http\Controllers\Platform;

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
            ->withCount([
                'subscriptions' => fn ($query) => $query->whereNotNull('user_id'),
                'subscriptionAddons',
            ])
            ->orderBy('monthly_price')->get()
            ->map(fn (Plan $plan): array => [
                ...$plan->only(['public_id', 'name', 'description', 'kind', 'offer_category', 'billing_cycle', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'max_scans', 'is_default', 'is_trial', 'is_active']),
                'subscriptions_count' => $plan->kind === Plan::KIND_ADDON ? $plan->subscription_addons_count : $plan->subscriptions_count,
            ]);
        $subscriptions = Subscription::query()
            ->whereNotNull('user_id')
            ->with([
                'user' => fn ($query) => $query->select(['id', 'name', 'email'])->withCount('ownedStores'),
                'plan:id,public_id,name,monthly_price,duration_months,max_stores,max_products,max_members,max_scans,is_active',
                'addons' => fn ($query) => $query
                    ->where(fn ($addons) => $addons->whereNull('ends_on')->orWhereDate('ends_on', '>=', now()->toDateString()))
                    ->with('plan:id,public_id,is_active')
                    ->orderBy('starts_on')
                    ->orderBy('id'),
                'periods' => fn ($query) => $query
                    ->whereDate('period_start', '>', now()->toDateString())
                    ->orderBy('period_start')
                    ->orderBy('id'),
            ])
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search): void {
                $query->whereHas('user', fn ($user) => $user->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                    ->orWhereHas('user.ownedStores', fn ($store) => $store->where('name', 'like', "%{$search}%"));
            }))
            ->when(in_array($status, array_column(SubscriptionStatus::cases(), 'value'), true), fn ($query) => $query->where('status', $status))
            ->latest('id')->paginate(15)->withQueryString()->through(function (Subscription $subscription): array {
                $scheduledPeriods = [];
                foreach ($subscription->periods as $period) {
                    $scheduledPeriods[] = [
                        ...$period->only(['public_id', 'plan_name', 'monthly_price', 'duration_months']),
                        'is_trial' => $period->was_trial,
                        'period_start' => $period->period_start->toDateString(),
                        'period_end' => $period->period_end?->toDateString(),
                    ];
                }

                return [
                    ...$subscription->only(['public_id', 'status', 'starts_at', 'trial_ends_at', 'current_period_start', 'current_period_end', 'notes']),
                    'status' => $subscription->status->value,
                    'account' => [
                        'name' => $subscription->user->name,
                        'email' => $subscription->user->email,
                        'stores_count' => $subscription->user->owned_stores_count,
                    ],
                    'plan' => $subscription->plan->only(['public_id', 'name', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'max_scans', 'is_active']),
                    'active_addons' => $subscription->addons
                        ->filter(fn ($addon): bool => $addon->starts_on->lte(now()->toDateString()))
                        ->map(fn ($addon): array => [
                            ...$addon->only(['public_id', 'plan_name', 'offer_category', 'stores', 'products', 'members', 'scans']),
                            'starts_on' => $addon->starts_on->toDateString(),
                            'ends_on' => $addon->ends_on?->toDateString(),
                        ])->values()->all(),
                    'scheduled_addons' => $subscription->addons
                        ->filter(fn ($addon): bool => $addon->starts_on->gt(now()->toDateString()))
                        ->map(fn ($addon): array => [
                            ...$addon->only(['public_id', 'plan_name', 'offer_category', 'stores', 'products', 'members', 'scans']),
                            'starts_on' => $addon->starts_on->toDateString(),
                            'ends_on' => $addon->ends_on?->toDateString(),
                        ])->values()->all(),
                    'assigned_addons' => $subscription->addons->map(fn ($addon): array => [
                        ...$addon->only(['public_id', 'plan_name', 'offer_category', 'stores', 'products', 'members', 'scans']),
                        'plan_id' => $addon->plan->public_id,
                        'plan_is_active' => $addon->plan->is_active,
                        'starts_on' => $addon->starts_on->toDateString(),
                        'ends_on' => $addon->ends_on?->toDateString(),
                    ])->values()->all(),
                    'scheduled_periods' => $scheduledPeriods,
                ];
            });

        return Inertia::render('platform/subscriptions/index', [
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
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Plan created successfully.')]);

        return back();
    }

    public function updatePlan(Request $request, Plan $plan, SavePlan $action): RedirectResponse
    {
        $action->handle(AuthenticatedPlatformAdmin::get($request), $this->planData($request, $plan), $plan, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Plan updated successfully.')]);

        return back();
    }

    public function updateSubscription(Request $request, Subscription $subscription, ManageSubscription $action): RedirectResponse
    {
        abort_if($subscription->user_id === null, 404);

        $validated = $request->validate([
            'plan_id' => [
                'required',
                Rule::exists('plans', 'public_id')->where(
                    fn ($query) => $query->where('kind', Plan::KIND_BASE)->where(fn ($plans) => $plans->where('is_active', true)->orWhere('id', $subscription->plan_id)),
                ),
            ],
            'status' => ['required', Rule::enum(SubscriptionStatus::class)],
            'starts_at' => ['required', 'date'],
            'trial_ends_at' => [Rule::requiredIf($request->input('status') === SubscriptionStatus::Trialing->value), 'nullable', 'date', 'after_or_equal:starts_at'],
            'current_period_start' => [Rule::requiredIf($request->input('status') === SubscriptionStatus::Active->value), 'nullable', 'date', 'after_or_equal:starts_at'],
            'current_period_end' => ['nullable', 'date', 'after_or_equal:current_period_start'],
            'notes' => ['nullable', 'string', 'max:500'],
            'addons' => ['sometimes', 'array', 'max:50'],
            'addons.*.public_id' => [
                'nullable',
                'string',
                'size:26',
                'distinct',
                Rule::exists('subscription_addons', 'public_id')->where(fn ($query) => $query->where('subscription_id', $subscription->id)),
            ],
            'addons.*.plan_id' => [
                'required',
                'string',
                Rule::exists('plans', 'public_id')->where(fn ($query) => $query->where('kind', Plan::KIND_ADDON)),
            ],
            'addons.*.starts_on' => ['required', 'date'],
            'addons.*.ends_on' => ['nullable', 'date', 'after_or_equal:addons.*.starts_on'],
        ]);
        $plan = Plan::query()->where('public_id', $validated['plan_id'])->firstOrFail();
        $status = SubscriptionStatus::from($validated['status']);
        if ($plan->is_trial && $status !== SubscriptionStatus::Trialing) {
            throw ValidationException::withMessages(['status' => __('A trial plan must use Trial status.')]);
        }
        if (! $plan->is_trial && $status === SubscriptionStatus::Trialing) {
            throw ValidationException::withMessages(['status' => __('Trial status can only be used by a trial plan.')]);
        }
        $addons = null;
        if (array_key_exists('addons', $validated)) {
            $addonInput = $validated['addons'];
            if (! is_array($addonInput)) {
                throw ValidationException::withMessages(['addons' => __('Invalid add-ons.')]);
            }
            $existingAddons = $subscription->addons()
                ->where(fn ($query) => $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', now()->toDateString()))
                ->get(['id', 'public_id', 'plan_id'])
                ->keyBy('public_id');
            $addonPlans = Plan::query()
                ->where('kind', Plan::KIND_ADDON)
                ->whereIn('public_id', collect($addonInput)->pluck('plan_id')->unique())
                ->get()
                ->keyBy('public_id');
            $addons = [];
            foreach ($addonInput as $index => $addon) {
                $selectedPlan = $addonPlans->get($addon['plan_id']);
                $existingAddon = isset($addon['public_id']) ? $existingAddons->get($addon['public_id']) : null;
                if ($selectedPlan === null || (! $selectedPlan->is_active && $existingAddon?->plan_id !== $selectedPlan->id)) {
                    throw ValidationException::withMessages([
                        "addons.{$index}.plan_id" => __('Pilih add-on yang masih aktif.'),
                    ]);
                }

                $addons[] = [
                    'id' => $existingAddon?->id,
                    'plan_id' => $selectedPlan->id,
                    'starts_on' => $addon['starts_on'],
                    'ends_on' => $addon['ends_on'] ?? null,
                ];
            }
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
            'addons' => $addons,
        ], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Account subscription updated successfully.')]);

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
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subscription payment posted successfully.')]);

        return back();
    }

    public function activateAll(Request $request, ActivateAllSubscriptions $action): RedirectResponse
    {
        $count = $action->handle(AuthenticatedPlatformAdmin::get($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __(':count subscriptions are active starting today.', ['count' => $count])]);

        return back();
    }

    /** @return array{name:string,description:?string,kind:string,offer_category:?string,billing_cycle:string,monthly_price:string,duration_months:int,max_stores:int,max_products:int,max_members:int,max_scans:int,is_active:bool} */
    private function planData(Request $request, ?Plan $plan = null): array
    {
        $request->merge([
            'kind' => $request->input('kind', Plan::KIND_BASE),
            'offer_category' => $request->input('offer_category'),
            'billing_cycle' => $request->input('billing_cycle', Plan::BILLING_FIXED),
            'max_scans' => $request->input('max_scans', 0),
        ]);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'kind' => ['required', Rule::in([Plan::KIND_BASE, Plan::KIND_ADDON])],
            'offer_category' => [
                Rule::requiredIf($request->input('kind') === Plan::KIND_ADDON),
                'nullable',
                Rule::in(Plan::offerCategories()),
            ],
            'billing_cycle' => ['required', Rule::in([Plan::BILLING_FIXED, Plan::BILLING_LIFETIME])],
            'monthly_price' => ['required', 'decimal:0,4', 'gte:0', 'lte:999999999999999.9999'],
            'duration_months' => ['required', 'integer', 'between:1,12'],
            'max_stores' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'max_products' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'max_members' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'max_scans' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'is_active' => ['required', 'boolean'],
        ]);
        if ($validated['kind'] === Plan::KIND_ADDON
            && collect(['max_stores', 'max_products', 'max_members', 'max_scans'])
                ->every(fn (string $field): bool => (int) $validated[$field] === 0)) {
            throw ValidationException::withMessages([
                'max_scans' => __('Add-on harus menambah sedikitnya satu kapasitas.'),
            ]);
        }
        if ($validated['kind'] === Plan::KIND_ADDON) {
            $fieldByCategory = [
                Plan::CATEGORY_STORE => 'max_stores',
                Plan::CATEGORY_PRODUCT => 'max_products',
                Plan::CATEGORY_STAFF => 'max_members',
                Plan::CATEGORY_SCAN => 'max_scans',
            ];
            $category = $validated['offer_category'];
            if (isset($fieldByCategory[$category])) {
                $primaryField = $fieldByCategory[$category];
                $otherFields = array_values(array_diff(array_values($fieldByCategory), [$primaryField]));
                if ((int) $validated[$primaryField] === 0
                    || collect($otherFields)->contains(fn (string $field): bool => (int) $validated[$field] > 0)) {
                    throw ValidationException::withMessages([
                        'offer_category' => __('Kategori add-on harus sesuai dengan satu jenis kapasitas yang ditambahkan.'),
                    ]);
                }
            }
        }

        return [
            'name' => $validated['name'], 'description' => $validated['description'] ?? null,
            'kind' => $validated['kind'],
            'offer_category' => $validated['kind'] === Plan::KIND_ADDON ? $validated['offer_category'] : null,
            'billing_cycle' => $validated['billing_cycle'],
            'monthly_price' => $validated['monthly_price'], 'duration_months' => (int) $validated['duration_months'], 'max_stores' => (int) $validated['max_stores'],
            'max_products' => (int) $validated['max_products'], 'max_members' => (int) $validated['max_members'],
            'max_scans' => (int) $validated['max_scans'],
            'is_active' => (bool) $validated['is_active'],
        ];
    }
}
