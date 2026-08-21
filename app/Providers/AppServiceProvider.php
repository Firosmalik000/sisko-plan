<?php

namespace App\Providers;

use App\Support\CurrentStore;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
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
        $this->app->scoped(CurrentStore::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
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
