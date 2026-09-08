<?php

namespace App\Http\Controllers\Customer;

use App\Actions\Audit\RecordAudit;
use App\Actions\Stores\CreateStore;
use App\Enums\StoreStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Stores\DeleteStoreRequest;
use App\Http\Requests\Stores\StoreStoreRequest;
use App\Http\Requests\Stores\StoreUpdateRequest;
use App\Models\Country;
use App\Models\Currency;
use App\Models\Store;
use App\Services\Stores\StoreCountryChange;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function index(Request $request): Response
    {
        $storeModels = AuthenticatedUser::get($request)->stores()
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
            'role' => $store->pivot->role,
            'membership_status' => $store->pivot->status,
            'country' => $store->country?->localizedName(),
            'country_code' => $store->country?->code,
            'currency_code' => $store->settings?->currency ?? $store->country?->currency_code,
            'currency_symbol' => $currencies->get($store->settings?->currency)?->symbol,
        ]);

        return Inertia::render('customer/stores/index', ['stores' => $stores]);
    }

    public function create(Request $request, SubscriptionAccess $subscriptionAccess): Response|RedirectResponse
    {
        $state = $subscriptionAccess->storeCreationState(AuthenticatedUser::get($request));
        if (! $state['can_create']) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $state['reason']]);

            return to_route('stores.index');
        }

        $countries = Country::query()->with('currency')->where('is_active', true)->orderBy('name_id')->get()
            ->map(fn (Country $country): array => [
                'code' => $country->code,
                'name' => $country->localizedName(),
                'currency' => [
                    'code' => $country->currency->code,
                    'name' => $country->currency->name,
                    'symbol' => $country->currency->symbol,
                ],
            ]);
        $preferredCountry = $request->session()->get('market') === 'ms' ? 'MY' : 'ID';

        return Inertia::render('customer/stores/create', [
            'countries' => $countries,
            'defaultCountry' => $countries->contains('code', $preferredCountry)
                ? $preferredCountry
                : $countries->first()['code'] ?? '',
        ]);
    }

    public function store(StoreStoreRequest $request, CreateStore $createStore): RedirectResponse
    {
        $store = $createStore->handle(
            AuthenticatedUser::get($request),
            $request->validated('name'),
            $request->ip(),
            $request->validated('country'),
        );
        $request->session()->put('active_store_id', $store->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store created successfully.')]);

        return to_route('dashboard');
    }

    public function show(Store $store, StoreCountryChange $countryChange): Response
    {
        Gate::authorize('viewManagement', $store);

        $store->load(['country.currency', 'settings', 'users' => fn ($query) => $query->orderBy('name')]);
        $storeCurrency = Currency::query()->find($store->settings?->currency ?? $store->country?->currency_code);
        $countries = Country::query()
            ->with('currency')
            ->where(fn ($query) => $query->where('is_active', true)->orWhereKey($store->country_id))
            ->orderBy('name_id')
            ->get()
            ->map(fn (Country $country): array => [
                'code' => $country->code,
                'name' => $country->localizedName(),
                'currency_code' => $country->currency_code,
                'currency_symbol' => $country->currency->symbol,
                'is_active' => $country->is_active,
            ]);

        return Inertia::render('customer/stores/show', [
            'countries' => $countries,
            'store' => [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'status' => $store->status->value,
                'owner_user_id' => $store->owner_user_id,
                'country_code' => $store->country?->code,
                'country_name' => $store->country?->localizedName(),
                'currency_code' => $store->settings?->currency ?? $store->country?->currency_code,
                'currency_symbol' => $storeCurrency?->symbol,
                'can_manage' => AuthenticatedUser::get(request())->can('update', $store),
                'can_archive' => AuthenticatedUser::get(request())->can('archive', $store),
                'can_restore' => AuthenticatedUser::get(request())->can('restore', $store),
                'can_delete' => AuthenticatedUser::get(request())->can('deletePermanently', $store),
                'country_editable' => $store->status === StoreStatus::Active && $countryChange->allowed($store),
                'members' => $store->users->map(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->pivot->role,
                    'status' => $user->pivot->status,
                ]),
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
            $before = $lockedStore->only(['name', 'country_id']);
            $lockedStore->name = $request->validated('name');

            $countryCode = $request->validated('country');
            if ($countryCode !== null && $countryCode !== $lockedStore->country?->code) {
                $countryChange->assertAllowed($lockedStore);
                $country = Country::query()->with('currency')->where('code', $countryCode)->where('is_active', true)->sharedLock()->firstOrFail();
                $lockedStore->country_id = $country->id;
                $lockedStore->settings()->updateOrCreate([], ['currency' => $country->currency_code]);
            }

            $lockedStore->save();
            $audit->handle(AuthenticatedUser::get($request), 'store.updated', $lockedStore, $lockedStore, $request->ip(), [
                'before' => $before,
                'after' => $lockedStore->only(['name', 'country_id']),
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
            $subscriptionAccess->assertStoreCapacity($store->owner);
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
}
