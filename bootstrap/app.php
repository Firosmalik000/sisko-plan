<?php

use App\Http\Controllers\ReadinessController;
use App\Http\Middleware\AddRequestId;
use App\Http\Middleware\EnsurePlatformAdminHasTwoFactor;
use App\Http\Middleware\EnsurePlatformAdminIsActive;
use App\Http\Middleware\EnsureSubscriptionAllowsWrites;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetActiveStore;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
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
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);
        $middleware->redirectGuestsTo(fn (Request $request) => $request->is('super-admin*')
            ? route('super-admin.login')
            : route('login'));
        $middleware->redirectUsersTo(fn (Request $request) => $request->is('super-admin*')
            ? route('super-admin.dashboard')
            : route('dashboard'));

        $middleware->web(append: [
            HandleAppearance::class,
            EnsureUserIsActive::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'active.store' => SetActiveStore::class,
            'active.platform-admin' => EnsurePlatformAdminIsActive::class,
            'platform-admin.2fa' => EnsurePlatformAdminHasTwoFactor::class,
            'subscription.access' => EnsureSubscriptionAllowsWrites::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->respond(fn (Response $response, Throwable $exception, Request $request): Response => SecurityHeaders::apply($request, $response));
    })->create();
