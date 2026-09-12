<?php

use App\Http\Controllers\Platform\AuthenticatedSessionController;
use App\Http\Controllers\Platform\DashboardController;
use App\Http\Controllers\Platform\GeographyController;
use App\Http\Controllers\Platform\ImpersonationController;
use App\Http\Controllers\Platform\PaymentController;
use App\Http\Controllers\Platform\PlatformAdminController;
use App\Http\Controllers\Platform\PlatformSettingController;
use App\Http\Controllers\Platform\ReferralCommissionController;
use App\Http\Controllers\Platform\SecurityController;
use App\Http\Controllers\Platform\StoreController;
use App\Http\Controllers\Platform\SubscriptionController;
use App\Http\Controllers\Platform\UserController;
use App\Support\PlatformPermission;
use Illuminate\Support\Facades\Route;

Route::prefix('super-admin')->name('super-admin.')->group(function () {
    Route::get('login', fn () => to_route('login'))->name('login');

    Route::middleware(['auth', 'platform-admin', 'throttle:platform-writes'])->group(function () {
        Route::get('security', [SecurityController::class, 'index'])->name('security.index');
        Route::patch('security/profile', [SecurityController::class, 'updateProfile'])->middleware('throttle:6,1')->name('security.profile.update');
        Route::put('security/password', [SecurityController::class, 'updatePassword'])->middleware('throttle:6,1')->name('security.password.update');
        Route::post('security/two-factor', [SecurityController::class, 'enable'])->middleware('throttle:6,1')->name('security.two-factor.enable');
        Route::post('security/two-factor/confirm', [SecurityController::class, 'confirm'])->middleware('throttle:6,1')->name('security.two-factor.confirm');
        Route::post('security/recovery-codes', [SecurityController::class, 'regenerate'])->middleware('throttle:6,1')->name('security.recovery-codes');
        Route::delete('security/two-factor', [SecurityController::class, 'disable'])->middleware('throttle:6,1')->name('security.two-factor.disable');
        Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

        Route::middleware('platform-admin.2fa')->group(function () {
            Route::get('/', DashboardController::class)->middleware('can:'.PlatformPermission::DASHBOARD_VIEW)->name('dashboard');
            Route::get('users', [UserController::class, 'index'])->middleware('can:'.PlatformPermission::USERS_VIEW)->name('users.index');
            Route::post('users/{user}/impersonate', [ImpersonationController::class, 'store'])->middleware('can:'.PlatformPermission::USERS_IMPERSONATE)->name('users.impersonate');
            Route::patch('users/{user}/status', [UserController::class, 'updateStatus'])->middleware('can:'.PlatformPermission::USERS_STATUS_UPDATE)->name('users.status');
            Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('can:'.PlatformPermission::USERS_DELETE)->name('users.destroy');
            Route::get('stores', [StoreController::class, 'index'])->middleware('can:'.PlatformPermission::STORES_VIEW)->name('stores.index');
            Route::patch('stores/{store}/status', [StoreController::class, 'updateStatus'])->middleware('can:'.PlatformPermission::STORES_STATUS_UPDATE)->name('stores.status');
            Route::get('subscriptions', [SubscriptionController::class, 'index'])->middleware('can:'.PlatformPermission::SUBSCRIPTIONS_VIEW)->name('subscriptions.index');
            Route::get('payments', PaymentController::class)->middleware('can:'.PlatformPermission::PAYMENTS_VIEW)->name('payments.index');
            Route::get('referral-commission', [ReferralCommissionController::class, 'overview'])->middleware('can:'.PlatformPermission::REFERRALS_VIEW)->name('referral-commission.overview');
            Route::get('referral-commission/referrals', [ReferralCommissionController::class, 'referrals'])->middleware('can:'.PlatformPermission::REFERRALS_VIEW)->name('referral-commission.referrals');
            Route::get('referral-commission/commissions', [ReferralCommissionController::class, 'commissions'])->middleware('can:'.PlatformPermission::COMMISSIONS_VIEW)->name('referral-commission.commissions');
            Route::patch('referral-commission/commissions/{commission}', [ReferralCommissionController::class, 'updateCommission'])->middleware('can:'.PlatformPermission::COMMISSIONS_MANAGE)->name('referral-commission.commissions.update');
            Route::get('referral-commission/payouts', [ReferralCommissionController::class, 'payouts'])->middleware('can:'.PlatformPermission::PAYOUTS_VIEW)->name('referral-commission.payouts');
            Route::post('referral-commission/payouts', [ReferralCommissionController::class, 'storePayout'])->middleware('can:'.PlatformPermission::PAYOUTS_MANAGE)->name('referral-commission.payouts.store');
            Route::patch('referral-commission/payouts/{payout}/paid', [ReferralCommissionController::class, 'payPayout'])->middleware('can:'.PlatformPermission::PAYOUTS_MANAGE)->name('referral-commission.payouts.paid');
            Route::post('plans', [SubscriptionController::class, 'storePlan'])->middleware('can:'.PlatformPermission::PLANS_MANAGE)->name('plans.store');
            Route::patch('plans/{plan}', [SubscriptionController::class, 'updatePlan'])->middleware('can:'.PlatformPermission::PLANS_MANAGE)->name('plans.update');
            Route::patch('subscriptions/{subscription}', [SubscriptionController::class, 'updateSubscription'])->middleware('can:'.PlatformPermission::SUBSCRIPTIONS_MANAGE)->name('subscriptions.update');
            Route::post('subscriptions/{subscription}/payments', [SubscriptionController::class, 'storePayment'])->middleware('can:'.PlatformPermission::PAYMENTS_CREATE)->name('subscriptions.payments.store');
            Route::post('subscriptions/activate-all', [SubscriptionController::class, 'activateAll'])->middleware('can:'.PlatformPermission::SUBSCRIPTIONS_ACTIVATE_ALL)->name('subscriptions.activate-all');
            Route::get('platform-admins', [PlatformAdminController::class, 'index'])->middleware('can:'.PlatformPermission::ADMINS_VIEW)->name('platform-admins.index');
            Route::post('platform-admins', [PlatformAdminController::class, 'store'])->middleware('can:'.PlatformPermission::ADMINS_MANAGE)->name('platform-admins.store');
            Route::patch('platform-admins/{platformAdmin}/status', [PlatformAdminController::class, 'updateStatus'])->middleware('can:'.PlatformPermission::ADMINS_MANAGE)->name('platform-admins.status');
            Route::put('platform-admins/{platformAdmin}/permissions', [PlatformAdminController::class, 'updatePermissions'])->middleware('can:'.PlatformPermission::ADMINS_MANAGE)->name('platform-admins.permissions.update');
            Route::get('brand-seo', [PlatformSettingController::class, 'index'])->middleware('can:'.PlatformPermission::BRANDING_VIEW)->name('brand-seo.index');
            Route::patch('brand-seo', [PlatformSettingController::class, 'update'])->middleware('can:'.PlatformPermission::BRANDING_MANAGE)->name('brand-seo.update');
            Route::post('brand-seo/logo', [PlatformSettingController::class, 'updateLogo'])->middleware('can:'.PlatformPermission::BRANDING_MANAGE)->name('brand-seo.logo.update');
            Route::delete('brand-seo/logo', [PlatformSettingController::class, 'destroyLogo'])->middleware('can:'.PlatformPermission::BRANDING_MANAGE)->name('brand-seo.logo.destroy');
            Route::get('geography', [GeographyController::class, 'index'])->middleware('can:'.PlatformPermission::GEOGRAPHY_VIEW)->name('geography.index');
            Route::post('geography/countries', [GeographyController::class, 'storeCountry'])->middleware('can:'.PlatformPermission::GEOGRAPHY_MANAGE)->name('geography.countries.store');
            Route::patch('geography/countries/{country}', [GeographyController::class, 'updateCountry'])->middleware('can:'.PlatformPermission::GEOGRAPHY_MANAGE)->name('geography.countries.update');
            Route::post('geography/currencies', [GeographyController::class, 'storeCurrency'])->middleware('can:'.PlatformPermission::GEOGRAPHY_MANAGE)->name('geography.currencies.store');
            Route::patch('geography/currencies/{currency}', [GeographyController::class, 'updateCurrency'])->middleware('can:'.PlatformPermission::GEOGRAPHY_MANAGE)->name('geography.currencies.update');
        });
    });
});
