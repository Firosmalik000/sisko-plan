<?php

namespace App\Http\Middleware;

use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Store;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\Authentication\Impersonation;
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
                'theme_color' => $activeStoreModel->settings()->value('theme_color') ?? '#1f6653',
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
                'role' => $platformAdmin->platform_role?->value,
                'two_factor_enabled' => $platformAdmin->hasEnabledTwoFactorAuthentication(),
            ],
            'impersonation' => Impersonation::current($request),
            'stores' => $stores,
            'activeStore' => $activeStore,
            'subscriptionState' => $subscription,
            'scanner' => [
                'max_images_per_request' => (int) config('services.catalog_intelligence.max_images'),
                'auto_capture_enabled' => (bool) config('security.smart_scanner_auto_capture'),
                'visual_recognition_enabled' => (bool) config('services.catalog_intelligence.enabled')
                    && filled(config('services.catalog_intelligence.url'))
                    && filled(config('services.catalog_intelligence.token')),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
