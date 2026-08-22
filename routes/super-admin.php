<?php

use App\Http\Controllers\SuperAdmin\AuthenticatedSessionController;
use App\Http\Controllers\SuperAdmin\DashboardController;
use App\Http\Controllers\SuperAdmin\ImpersonationController;
use App\Http\Controllers\SuperAdmin\PaymentController;
use App\Http\Controllers\SuperAdmin\PlatformAdminController;
use App\Http\Controllers\SuperAdmin\SecurityController;
use App\Http\Controllers\SuperAdmin\StoreController;
use App\Http\Controllers\SuperAdmin\SubscriptionController;
use App\Http\Controllers\SuperAdmin\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('super-admin')->name('super-admin.')->group(function () {
    Route::get('login', fn () => to_route('login'))->name('login');

    Route::middleware(['auth', 'platform-admin', 'throttle:platform-writes'])->group(function () {
        Route::get('security', [SecurityController::class, 'index'])->name('security.index');
        Route::post('security/two-factor', [SecurityController::class, 'enable'])->middleware('throttle:6,1')->name('security.two-factor.enable');
        Route::post('security/two-factor/confirm', [SecurityController::class, 'confirm'])->middleware('throttle:6,1')->name('security.two-factor.confirm');
        Route::post('security/recovery-codes', [SecurityController::class, 'regenerate'])->middleware('throttle:6,1')->name('security.recovery-codes');
        Route::delete('security/two-factor', [SecurityController::class, 'disable'])->middleware('throttle:6,1')->name('security.two-factor.disable');
        Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

        Route::middleware('platform-admin.2fa')->group(function () {
            Route::get('/', DashboardController::class)->name('dashboard');
            Route::get('users', [UserController::class, 'index'])->name('users.index');
            Route::post('users/{user}/impersonate', [ImpersonationController::class, 'store'])->name('users.impersonate');
            Route::patch('users/{user}/status', [UserController::class, 'updateStatus'])->name('users.status');
            Route::get('stores', [StoreController::class, 'index'])->name('stores.index');
            Route::patch('stores/{store}/status', [StoreController::class, 'updateStatus'])->name('stores.status');
            Route::get('subscriptions', [SubscriptionController::class, 'index'])->name('subscriptions.index');
            Route::get('payments', PaymentController::class)->name('payments.index');
            Route::post('plans', [SubscriptionController::class, 'storePlan'])->name('plans.store');
            Route::patch('plans/{plan}', [SubscriptionController::class, 'updatePlan'])->name('plans.update');
            Route::patch('subscriptions/{subscription}', [SubscriptionController::class, 'updateSubscription'])->name('subscriptions.update');
            Route::post('subscriptions/{subscription}/payments', [SubscriptionController::class, 'storePayment'])->name('subscriptions.payments.store');

            Route::middleware('platform-admin.super')->group(function () {
                Route::get('platform-admins', [PlatformAdminController::class, 'index'])->name('platform-admins.index');
                Route::post('platform-admins', [PlatformAdminController::class, 'store'])->name('platform-admins.store');
                Route::patch('platform-admins/{platformAdmin}/status', [PlatformAdminController::class, 'updateStatus'])->name('platform-admins.status');
            });
        });
    });
});
