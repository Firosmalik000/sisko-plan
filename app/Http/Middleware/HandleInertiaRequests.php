<?php

namespace App\Http\Middleware;

use App\Enums\BusinessRole;
use App\Enums\BusinessStatus;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\BusinessMembership;
use App\Models\Currency;
use App\Models\PlatformSetting;
use App\Models\Store;
use App\Services\Notifications\StockAlertNotifications;
use App\Services\Promotions\PromotionDelivery;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\Authentication\Impersonation;
use App\Support\BusinessCapability;
use App\Support\LocaleContext;
use App\Support\PlatformPermission;
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
        $businesses = collect();
        $activeBusiness = null;
        $capabilities = [];
        $activeStore = null;
        $subscription = null;
        $storeCreation = null;
        $stockAlerts = ['count' => 0, 'unread_count' => 0, 'items' => []];
        $branding = PlatformSetting::current()->publicPayload();
        $appOpenPromotions = [];

        if ($user !== null) {
            $businessMemberships = $user->businessMemberships()
                ->where('status', MembershipStatus::Active->value)
                ->whereHas('business', fn ($query) => $query->where('status', BusinessStatus::Active->value))
                ->with('business')
                ->orderBy('id')
                ->get();
            $activeBusinessMembership = $businessMemberships
                ->firstWhere('business_id', (int) $request->session()->get('active_business_id'))
                ?? $businessMemberships->first();
            $businesses = $businessMemberships->map(fn (BusinessMembership $membership): array => [
                'public_id' => $membership->business->public_id,
                'name' => $membership->business->name,
                'role' => $membership->business_role->value,
            ]);
            $activeBusiness = $activeBusinessMembership === null ? null : [
                'public_id' => $activeBusinessMembership->business->public_id,
                'name' => $activeBusinessMembership->business->name,
                'role' => $activeBusinessMembership->business_role->value,
            ];

            $storeQuery = Store::query()
                ->where('stores.status', StoreStatus::Active->value)
                ->orderBy('stores.name')
                ->with(['country.currency', 'settings']);
            if ($activeBusinessMembership === null) {
                $storeModels = collect();
            } elseif ($activeBusinessMembership->business_role === BusinessRole::Staff) {
                $storeModels = $storeQuery
                    ->where('business_id', $activeBusinessMembership->business_id)
                    ->whereHas('assignments', fn ($query) => $query
                        ->where('business_membership_id', $activeBusinessMembership->id)
                        ->where('status', MembershipStatus::Active->value))
                    ->get(['stores.id', 'stores.public_id', 'stores.business_id', 'stores.country_id', 'stores.name']);
            } else {
                $storeModels = $storeQuery
                    ->where('business_id', $activeBusinessMembership->business_id)
                    ->get(['stores.id', 'stores.public_id', 'stores.business_id', 'stores.country_id', 'stores.name']);
            }

            $activeStoreModel = $storeModels->firstWhere('id', $request->session()->get('active_store_id'))
                ?? $storeModels->first();
            $currencyCodes = $storeModels
                ->map(fn (Store $store): string => $store->settings->currency ?? $store->country->currency_code)
                ->filter()
                ->unique();
            $currencies = Currency::query()->whereIn('code', $currencyCodes)->get()->keyBy('code');
            $stores = $storeModels->map(function (Store $store) use ($currencies, $activeBusinessMembership): array {
                $currencyCode = $store->settings->currency ?? $store->country->currency_code ?? 'IDR';
                $currency = $currencies->get($currencyCode);
                $role = $activeBusinessMembership?->business_role === BusinessRole::Staff
                    ? $store->assignments()->where('business_membership_id', $activeBusinessMembership->id)->value('role')
                    : $activeBusinessMembership?->business_role->value;

                return [
                    'public_id' => $store->public_id,
                    'name' => $store->name,
                    'role' => $role,
                    'country_code' => $store->country->code ?? 'ID',
                    'currency_code' => $currencyCode,
                    'currency_symbol' => $currency->symbol ?? 'Rp',
                    'currency_decimal_places' => $currency->decimal_places ?? 0,
                    'currency_symbol_position' => $currency->symbol_position ?? 'before',
                ];
            });
            $activeCurrency = $activeStoreModel === null
                ? null
                : $currencies->get($activeStoreModel->settings->currency ?? $activeStoreModel->country->currency_code);
            $activeStore = $activeStoreModel === null ? null : [
                'public_id' => $activeStoreModel->public_id,
                'name' => $activeStoreModel->name,
                'role' => $activeBusinessMembership?->business_role === BusinessRole::Staff
                    ? $activeStoreModel->assignments()->where('business_membership_id', $activeBusinessMembership->id)->value('role')
                    : $activeBusinessMembership?->business_role->value,
                'theme_color' => $activeStoreModel->settings()->value('theme_color') ?? '#ee4d2d',
                'country_code' => $activeStoreModel->country->code ?? 'ID',
                'currency_code' => $activeStoreModel->settings->currency ?? $activeStoreModel->country->currency_code ?? 'IDR',
                'currency_symbol' => $activeCurrency->symbol ?? 'Rp',
                'currency_decimal_places' => $activeCurrency->decimal_places ?? 0,
                'currency_symbol_position' => $activeCurrency->symbol_position ?? 'before',
            ];
            if ($activeStoreModel !== null) {
                if ($activeBusinessMembership !== null) {
                    $capabilities = app(BusinessCapability::class)->for($activeBusinessMembership, $activeStoreModel);
                }
                $subscription = app(SubscriptionAccess::class)->summary($activeStoreModel);
                $stockAlerts = app(StockAlertNotifications::class)->summary($user, $activeStoreModel);
            }
            if (! $user->isPlatformAdmin() && $activeBusinessMembership !== null) {
                $storeCreation = app(SubscriptionAccess::class)->storeCreationState($activeBusinessMembership->business);
                if ($this->isCustomerPortalRequest($request)) {
                    $delivery = app(PromotionDelivery::class);
                    $appOpenPromotions = $delivery->appOpenPromotions(LocaleContext::locale($request))
                        ->map(fn ($promotion): array => $delivery->appOpenPayload($promotion))
                        ->values();
                }
            }
        }

        return [
            ...parent::share($request),
            'name' => $branding['brand_name'],
            'branding' => $branding,
            'locale' => LocaleContext::locale($request),
            'market' => LocaleContext::market($request),
            'locales' => LocaleContext::options($request),
            'auth' => [
                'user' => $user,
            ],
            'businesses' => $businesses,
            'activeBusiness' => $activeBusiness,
            'capabilities' => $capabilities,
            'platformAdmin' => ($platformAdmin = AuthenticatedPlatformAdmin::optional($request)) === null ? null : [
                ...$platformAdmin->only(['id', 'name', 'email']),
                'role' => $platformAdmin->platform_role?->value,
                'two_factor_enabled' => $platformAdmin->hasEnabledTwoFactorAuthentication(),
                'permissions' => $platformAdmin->getAllPermissions()->pluck('name')->values(),
                'home_url' => route(PlatformPermission::landingRoute($platformAdmin)),
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
                'ai_scan_limit' => (int) ($subscription['max_scans'] ?? 0),
                'ai_scans_used' => (int) ($subscription['scans_used'] ?? 0),
                'ai_scans_remaining' => ($subscription['max_scans'] ?? 0) === 0
                    ? null
                    : max(0, (int) $subscription['max_scans'] - (int) $subscription['scans_used']),
                'ai_scan_unlimited' => ($subscription['max_scans'] ?? 0) === 0,
                'ai_scan_available' => ($subscription['max_scans'] ?? 0) === 0
                    || (int) $subscription['scans_used'] < (int) $subscription['max_scans'],
            ],
            'storeCreation' => $storeCreation,
            'stockAlerts' => $stockAlerts,
            'appOpenPromotions' => $appOpenPromotions,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    private function isCustomerPortalRequest(Request $request): bool
    {
        return $request->routeIs(
            'dashboard',
            'referral.*',
            'stores.*',
            'master-data.*',
            'operations.*',
            'purchasing.*',
            'pos.*',
            'sales.*',
            'expenses.*',
            'reports.*',
            'subscription.*',
            'notifications.*',
        );
    }
}
