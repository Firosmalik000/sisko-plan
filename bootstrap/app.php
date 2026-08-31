<?php

use App\Http\Controllers\ReadinessController;
use App\Http\Middleware\AddRequestId;
use App\Http\Middleware\EnsurePlatformAdminHasTwoFactor;
use App\Http\Middleware\EnsureSubscriptionAllowsWrites;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserIsPlatformAdmin;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetActiveStore;
use App\Models\User;
use App\Support\PlatformPermission;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function (): void {
            Route::get('/ready', ReadinessController::class)->name('ready');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend([
            AddRequestId::class,
            SecurityHeaders::class,
        ]);
        $middleware->trustHosts();
        $middleware->trustProxies(at: '*');
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);
        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(function (Request $request): string {
            $user = $request->user();

            return $user instanceof User && $user->isPlatformAdmin()
                ? route(PlatformPermission::landingRoute($user))
                : route('dashboard');
        });

        $middleware->web(append: [
            HandleAppearance::class,
            EnsureUserIsActive::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'active.store' => SetActiveStore::class,
            'platform-admin' => EnsureUserIsPlatformAdmin::class,
            'platform-admin.2fa' => EnsurePlatformAdminHasTwoFactor::class,
            'subscription.access' => EnsureSubscriptionAllowsWrites::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request): Response {
            $status = $response->getStatusCode();
            $shouldRenderErrorPage = ! $request->expectsJson()
                && ! $request->is('api/*')
                && $status >= 400
                && $status <= 599
                && ! $response->headers->has('X-Inertia-Location')
                && (! config('app.debug') || $status < 500);

            if ($shouldRenderErrorPage) {
                $user = $request->user();
                $isPlatformAdmin = $user instanceof User && $user->isPlatformAdmin();
                $homeUrl = match (true) {
                    $isPlatformAdmin => route('super-admin.security.index'),
                    $user instanceof User => route('dashboard'),
                    default => route('home'),
                };

                $response = Inertia::render('errors/show', [
                    'status' => $status,
                    'requestId' => (string) $request->attributes->get('request_id', 'unavailable'),
                    'homeUrl' => $homeUrl,
                    'loginUrl' => route('login'),
                    'isAuthenticated' => $user instanceof User,
                    'isPlatformAdmin' => $isPlatformAdmin,
                    'appName' => config('app.name'),
                ])->toResponse($request)->setStatusCode($status);
            }

            return SecurityHeaders::apply($request, $response);
        });
    })->create();
