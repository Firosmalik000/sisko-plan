<?php

namespace App\Http\Controllers;

use App\Actions\Stores\CreateStore;
use App\Enums\StoreStatus;
use App\Http\Requests\Stores\StoreStoreRequest;
use App\Http\Requests\Stores\StoreUpdateRequest;
use App\Models\Store;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function index(Request $request): Response
    {
        $stores = AuthenticatedUser::get($request)->stores()
            ->orderBy('name')
            ->get()
            ->map(fn (Store $store) => [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'status' => $store->status->value,
                'role' => $store->pivot->role,
                'membership_status' => $store->pivot->status,
            ]);

        return Inertia::render('stores/index', ['stores' => $stores]);
    }

    public function create(Request $request, SubscriptionAccess $subscriptionAccess): Response|RedirectResponse
    {
        $state = $subscriptionAccess->storeCreationState(AuthenticatedUser::get($request));
        if (! $state['can_create']) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $state['reason']]);

            return to_route('stores.index');
        }

        return Inertia::render('stores/create');
    }

    public function store(StoreStoreRequest $request, CreateStore $createStore): RedirectResponse
    {
        $store = $createStore->handle(
            AuthenticatedUser::get($request),
            $request->validated('name'),
            $request->ip(),
        );
        $request->session()->put('active_store_id', $store->id);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Toko berhasil dibuat.']);

        return to_route('dashboard');
    }

    public function show(Store $store): Response
    {
        Gate::authorize('manageMembers', $store);

        $store->load(['users' => fn ($query) => $query->orderBy('name')]);

        return Inertia::render('stores/show', [
            'store' => [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'status' => $store->status->value,
                'owner_user_id' => $store->owner_user_id,
                'can_manage' => AuthenticatedUser::get(request())->can('manageMembers', $store),
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

    public function update(StoreUpdateRequest $request, Store $store, SubscriptionAccess $subscriptionAccess): RedirectResponse
    {
        DB::transaction(function () use ($request, $store, $subscriptionAccess): void {
            $lockedStore = Store::query()->lockForUpdate()->findOrFail($store->id);
            abort_unless($lockedStore->status === StoreStatus::Active, 403);
            $subscriptionAccess->assertCanWrite($lockedStore);
            $lockedStore->update($request->validated());
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Nama toko berhasil diperbarui.']);

        return back();
    }

    public function switch(Request $request, Store $store): RedirectResponse
    {
        Gate::authorize('switch', $store);
        $request->session()->put('active_store_id', $store->id);

        return to_route('dashboard');
    }
}
