<?php

use App\Http\Controllers\Auth\GoogleAuthenticationController;
use App\Http\Controllers\PublicSite\BrandLogoController;
use App\Http\Controllers\PublicSite\LocaleController;
use App\Http\Controllers\PublicSite\PricingController;
use App\Http\Controllers\Sales\NativeReceiptController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'public/welcome')->name('home');
Route::get('app', fn () => auth()->check()
    ? to_route('dashboard')
    : to_route('login'))->name('app.entry');
Route::get('brand/logo', BrandLogoController::class)->name('platform.logo');
Route::get('pricing', PricingController::class)->name('pricing');
Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');
Route::get('native-print/sales/{sale}', NativeReceiptController::class)
    ->middleware(['signed', 'throttle:30,1'])
    ->name('sales.native-print');

Route::middleware(['guest', 'throttle:10,1'])->group(function () {
    Route::get('auth/google/redirect', [GoogleAuthenticationController::class, 'redirect'])->name('auth.google.redirect');
    Route::get('auth/google/callback', [GoogleAuthenticationController::class, 'callback'])->name('auth.google.callback');
});
