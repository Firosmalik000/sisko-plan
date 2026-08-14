<?php

namespace App\Http\Middleware;

use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Store;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\Authentication\AuthenticatedUser;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = AuthenticatedUser::optional($request);
        $stores = collect();
        $activeStore = null;
        $subscription = null;

        if ($user !== null) {
            $storeModels = $user->stores()
                ->where('stores.status', StoreStatus::Active->value)
                ->wherePivot('status', MembershipStatus::Active->value)
                ->orderBy('stores.name')
                ->get(['stores.id', 'stores.public_id', 'stores.name']);

            $activeStoreModel = $storeModels->firstWhere('id', $request->session()->get('active_store_id'))
                ?? $storeModels->first();
            $stores = $storeModels->map(fn (Store $store) => [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'role' => $store->pivot->role,
            ]);
            $activeStore = $activeStoreModel === null ? null : [
                'public_id' => $activeStoreModel->public_id,
                'name' => $activeStoreModel->name,
                'role' => $activeStoreModel->pivot->role,
            ];
            if ($activeStoreModel !== null) {
                $subscription = app(SubscriptionAccess::class)->summary($activeStoreModel);
            }
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
            ],
            'platformAdmin' => ($platformAdmin = AuthenticatedPlatformAdmin::optional($request)) === null ? null : [
                ...$platformAdmin->only(['id', 'name', 'email']),
                'two_factor_enabled' => $platformAdmin->hasEnabledTwoFactorAuthentication(),
            ],
            'stores' => $stores,
            'activeStore' => $activeStore,
            'subscriptionState' => $subscription,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
