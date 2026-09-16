<?php

namespace App\Http\Controllers\Customer;

use App\Actions\Audit\RecordAudit;
use App\Actions\Businesses\ProvisionBusinessOwner;
use App\Actions\Stores\CreateStore;
use App\Enums\BusinessRole;
use App\Enums\StoreStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stores\DeleteStoreRequest;
use App\Http\Requests\Stores\StoreStoreRequest;
use App\Http\Requests\Stores\StoreUpdateRequest;
use App\Models\Business;
use App\Models\Country;
use App\Models\Currency;
use App\Models\Store;
use App\Services\Stores\StoreCountryChange;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\CurrentBusiness;
use App\Support\LocaleContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function index(Request $request, CurrentBusiness $currentBusiness, SubscriptionAccess $subscriptionAccess): Response
    {
        $membership = $currentBusiness->membership();
        $storeModels = $currentBusiness->get()->stores()
            ->orderBy('name')
            ->with(['country.currency', 'settings'])
            ->get();
        $currencies = Currency::query()
            ->whereIn('code', $storeModels->pluck('settings.currency')->filter()->unique())
            ->get()
            ->keyBy('code');
        $stores = $storeModels->map(fn (Store $store) => [
            'public_id' => $store->public_id,
            'name' => $store->name,
            'status' => $store->status->value,
            'role' => $membership->business_role === BusinessRole::Staff
                ? $store->assignments()->where('business_membership_id', $membership->id)->value('role')
                : $membership->business_role->value,
            'membership_status' => $membership->status->value,
            'country' => $store->country?->localizedName(),
            'country_code' => $store->country?->code,
            'currency_code' => $store->settings->currency ?? $store->country->currency_code,
            'currency_symbol' => $currencies->get($store->settings?->currency)?->symbol,
            'address' => $store->settings?->address,
        ]);

        return Inertia::render('customer/stores/index', [
            'stores' => $stores,
            'usage' => $subscriptionAccess->summary($currentBusiness->get()),
        ]);
    }

    public function create(Request $request, ProvisionBusinessOwner $provision, SubscriptionAccess $subscriptionAccess): Response|RedirectResponse
    {
        $membership = $provision->handle(AuthenticatedUser::get($request));
        $state = $subscriptionAccess->storeCreationState($membership->business);
        if (! $state['can_create']) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $state['reason']]);

            return to_route('stores.index');
        }

        $marketPriority = array_flip(array_keys(config('localization.countries', [])));
        $countries = Country::query()->with('currency')->where('is_active', true)->orderBy('name')->get()
            ->sortBy(fn (Country $country): array => [$marketPriority[$country->code] ?? PHP_INT_MAX, $country->name])
            ->values()
            ->map(fn (Country $country): array => [
                'code' => $country->code,
                'name' => $country->localizedName(),
                'currency' => [
                    'code' => $country->currency->code,
                    'name' => $country->currency->name,
                    'symbol' => $country->currency->symbol,
                ],
                'default_timezone' => $country->default_timezone,
                'timezones' => $country->timezones(),
            ]);
        $preferredCountry = LocaleContext::market($request);
        $defaultCountry = $countries->contains('code', $preferredCountry)
            ? $preferredCountry
            : ($countries->firstWhere('code', 'ID')['code'] ?? $countries->first()['code'] ?? '');

        return Inertia::render('customer/stores/create', [
            'countries' => $countries,
            'defaultCountry' => $defaultCountry,
        ]);
    }

    public function store(StoreStoreRequest $request, ProvisionBusinessOwner $provision, CreateStore $createStore): RedirectResponse
    {
        $membership = $provision->handle(AuthenticatedUser::get($request));

        $store = $createStore->handle(
            $membership->business,
            $membership,
            $request->validated('name'),
            $request->ip(),
            $request->validated('country') ?? 'ID',
            $request->validated('address'),
            $request->validated('timezone'),
        );
        $request->session()->put('active_business_id', $membership->business_id);
        $request->session()->put('active_store_id', $store->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store created successfully.')]);

        return to_route('dashboard');
    }

    public function show(Store $store, StoreCountryChange $countryChange): Response
    {
        Gate::authorize('viewManagement', $store);

        $store->load(['country.currency', 'settings']);
        $storeCurrency = Currency::query()->find($store->settings->currency ?? $store->country->currency_code);
        $marketPriority = array_flip(array_keys(config('localization.countries', [])));
        $countries = Country::query()
            ->with('currency')
            ->where(fn ($query) => $query->where('is_active', true)->orWhereKey($store->country_id))
            ->orderBy('name')
            ->get()
            ->sortBy(fn (Country $country): array => [$marketPriority[$country->code] ?? PHP_INT_MAX, $country->name])
            ->values()
            ->map(fn (Country $country): array => [
                'code' => $country->code,
                'name' => $country->localizedName(),
                'currency_code' => $country->currency_code,
                'currency_symbol' => $country->currency->symbol,
                'is_active' => $country->is_active,
                'default_timezone' => $country->default_timezone,
                'timezones' => $country->timezones(),
            ]);

        return Inertia::render('customer/stores/show', [
            'countries' => $countries,
            'store' => [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'status' => $store->status->value,
                'country_code' => $store->country?->code,
                'country_name' => $store->country?->localizedName(),
                'currency_code' => $store->settings->currency ?? $store->country->currency_code,
                'currency_symbol' => $storeCurrency?->symbol,
                'address' => $store->settings?->address,
                'timezone' => $store->settings->timezone ?? $store->country?->default_timezone,
                'can_manage' => AuthenticatedUser::get(request())->can('update', $store),
                'can_archive' => AuthenticatedUser::get(request())->can('archive', $store),
                'can_restore' => AuthenticatedUser::get(request())->can('restore', $store),
                'can_delete' => AuthenticatedUser::get(request())->can('deletePermanently', $store),
                'country_editable' => $store->status === StoreStatus::Active && $countryChange->allowed($store),
            ],
        ]);
    }

    public function update(
        StoreUpdateRequest $request,
        Store $store,
        SubscriptionAccess $subscriptionAccess,
        StoreCountryChange $countryChange,
        RecordAudit $audit,
    ): RedirectResponse {
        DB::transaction(function () use ($request, $store, $subscriptionAccess, $countryChange, $audit): void {
            $lockedStore = Store::query()->lockForUpdate()->findOrFail($store->id);
            abort_unless($lockedStore->status === StoreStatus::Active, 403);
            $subscriptionAccess->assertCanWrite($lockedStore);
            $lockedStore->loadMissing(['country', 'settings']);
            $before = [
                ...$lockedStore->only(['name', 'country_id']),
                'address' => $lockedStore->settings?->address,
                'timezone' => $lockedStore->settings?->timezone,
            ];
            $lockedStore->name = $request->validated('name');

            $settings = [];
            if ($request->has('address')) {
                $settings['address'] = $request->validated('address');
            }
            if ($request->has('timezone')) {
                $settings['timezone'] = $request->validated('timezone');
            }

            $countryCode = $request->validated('country');
            if ($countryCode !== null && $countryCode !== $lockedStore->country?->code) {
                $countryChange->assertAllowed($lockedStore);
                $country = Country::query()->with('currency')->where('code', $countryCode)->where('is_active', true)->sharedLock()->firstOrFail();
                $lockedStore->country()->associate($country);
                $settings['currency'] = $country->currency_code;
                $settings['timezone'] = $request->validated('timezone') ?? $country->default_timezone;
            }

            $lockedStore->save();
            $storeSettings = $settings === []
                ? $lockedStore->settings
                : $lockedStore->settings()->updateOrCreate([], $settings);
            $audit->handle(AuthenticatedUser::get($request), 'store.updated', $lockedStore, $lockedStore, $request->ip(), [
                'before' => $before,
                'after' => [
                    ...$lockedStore->only(['name', 'country_id']),
                    'address' => $storeSettings?->address,
                    'timezone' => $storeSettings?->timezone,
                ],
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store identity updated successfully.')]);

        return back();
    }

    public function destroy(Request $request, Store $store, RecordAudit $audit): RedirectResponse
    {
        Gate::authorize('archive', $store);

        DB::transaction(function () use ($request, $store, $audit): void {
            $lockedStore = Store::query()->lockForUpdate()->findOrFail($store->id);
            abort_unless($lockedStore->status === StoreStatus::Active, 409);
            $lockedStore->update(['status' => StoreStatus::Archived]);
            $audit->handle(AuthenticatedUser::get($request), 'store.archived', $lockedStore, $lockedStore, $request->ip());
        });

        if ((int) $request->session()->get('active_store_id') === $store->id) {
            $request->session()->forget('active_store_id');
        }
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store archived successfully.')]);

        return to_route('stores.index');
    }

    public function restore(Request $request, Store $store, SubscriptionAccess $subscriptionAccess, RecordAudit $audit): RedirectResponse
    {
        Gate::authorize('restore', $store);

        DB::transaction(function () use ($request, $store, $subscriptionAccess, $audit): void {
            $subscriptionAccess->assertStoreCapacity($store->business);
            $lockedStore = Store::query()->lockForUpdate()->findOrFail($store->id);
            abort_unless($lockedStore->status === StoreStatus::Archived, 409);
            $lockedStore->update(['status' => StoreStatus::Active]);
            $audit->handle(AuthenticatedUser::get($request), 'store.restored', $lockedStore, $lockedStore, $request->ip());
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store restored successfully.')]);

        return back();
    }

    public function forceDestroy(DeleteStoreRequest $request, Store $store, RecordAudit $audit): RedirectResponse
    {
        DB::transaction(function () use ($request, $store, $audit): void {
            $lockedStore = Store::query()->lockForUpdate()->findOrFail($store->id);
            abort_unless($lockedStore->status === StoreStatus::Archived, 409);
            $audit->handle(AuthenticatedUser::get($request), 'store.deleted', null, null, $request->ip(), [
                'store_id' => $lockedStore->id,
                'store_public_id' => $lockedStore->public_id,
                'store_name' => $lockedStore->name,
            ]);
            $publicId = $lockedStore->public_id;
            // Remove dependent records before store cascades reach their restricted masters.
            // Keep every delete tenant-scoped and inside the existing transaction.
            foreach ([
                'sale_returns', 'sale_payments', 'sales',
                'purchase_payments', 'purchases',
                'stock_adjustments', 'stock_counts',
                'capital_transactions', 'account_transfers', 'expenses',
                'cash_transactions', 'stock_movements',
                'inventory_balances', 'financial_account_balances',
                'supplier_payable_transactions', 'supplier_payable_balances',
                'products',
            ] as $table) {
                DB::table($table)->where('store_id', $lockedStore->id)->delete();
            }
            $lockedStore->delete();
            DB::afterCommit(function () use ($publicId): void {
                Storage::disk('local')->deleteDirectory("product-photos/{$publicId}");
                Storage::disk('local')->deleteDirectory("product-variant-photos/{$publicId}");
            });
        });

        $request->session()->forget('active_store_id');
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store permanently deleted.')]);

        return to_route('stores.index');
    }

    public function switch(Request $request, Store $store): RedirectResponse
    {
        Gate::authorize('switch', $store);
        $request->session()->put('active_store_id', $store->id);

        return to_route('dashboard');
    }

    public function switchBusiness(Request $request, Business $business): RedirectResponse
    {
        $allowed = $business->memberships()
            ->where('user_id', AuthenticatedUser::get($request)->id)
            ->where('status', 'active')
            ->exists();
        abort_unless($allowed, 403);

        $request->session()->put('active_business_id', $business->id);
        $request->session()->forget(['active_store_id', 'pos_actor_membership_id', 'register_session_id']);

        return to_route('dashboard');
    }
}
