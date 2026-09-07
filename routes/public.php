<?php

use App\Http\Controllers\Auth\GoogleAuthenticationController;
use App\Http\Controllers\PublicSite\BrandLogoController;
use App\Http\Controllers\PublicSite\LocaleController;
use App\Http\Controllers\PublicSite\PricingController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'public/welcome')->name('home');
Route::get('brand/logo', BrandLogoController::class)->name('platform.logo');
Route::get('pricing', PricingController::class)->name('pricing');
Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['guest', 'throttle:10,1'])->group(function () {
    Route::get('auth/google/redirect', [GoogleAuthenticationController::class, 'redirect'])->name('auth.google.redirect');
    Route::get('auth/google/callback', [GoogleAuthenticationController::class, 'callback'])->name('auth.google.callback');
});
