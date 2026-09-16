<?php

namespace App\Providers;

use App\Enums\PlatformAdminRole;
use App\Models\Store;
use App\Models\User;
use App\Observers\UserObserver;
use App\Support\BusinessCapability;
use App\Support\CurrentBusiness;
use App\Support\CurrentPosDevice;
use App\Support\CurrentStore;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->scoped(CurrentBusiness::class);
        $this->app->scoped(CurrentPosDevice::class);
        $this->app->scoped(CurrentStore::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        User::observe(UserObserver::class);
        Gate::before(fn (User $user, string $ability): ?bool => $user->platform_role === PlatformAdminRole::SuperAdmin
            && str_starts_with($ability, 'platform.')
                ? true
                : null);
        foreach (['business.manage', 'members.manage', 'subscription.manage', 'store.manage', 'catalog.manage', 'inventory.manage', 'inventory.count', 'purchasing.manage', 'cash.view', 'expenses.manage', 'sales.checkout', 'sales.view-all', 'sales.view-own', 'register.use', 'register.approve', 'reports.view', 'devices.manage', 'team.view'] as $ability) {
            Gate::define($ability, function (User $user, Store $store) use ($ability): bool {
                $catalog = app(BusinessCapability::class);
                $member = $catalog->memberFor($user, $store);

                return $member !== null && $catalog->allows($member, $ability, $store);
            });
        }
        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        if (config('security.force_https')) {
            URL::forceScheme('https');
        }

        RateLimiter::for('store-writes', function (Request $request): Limit {
            if ($request->isMethodSafe()) {
                return Limit::none();
            }

            return Limit::perMinute((int) config('security.store_writes_per_minute'))->by(implode('|', [
                $request->user()?->getAuthIdentifier() ?? $request->ip(),
                $request->session()->get('active_store_id', 'no-store'),
            ]));
        });

        RateLimiter::for('platform-writes', function (Request $request): Limit {
            if ($request->isMethodSafe()) {
                return Limit::none();
            }

            return Limit::perMinute((int) config('security.platform_writes_per_minute'))->by(
                ($request->user()?->getAuthIdentifier() ?? $request->ip()).'|platform',
            );
        });

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
