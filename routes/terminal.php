<?php

use App\Http\Controllers\Sales\PosController;
use App\Http\Controllers\Sales\PosDeviceController;
use App\Http\Controllers\Sales\RegisterSessionController;
use Illuminate\Support\Facades\Route;

Route::prefix('terminal')->name('terminal.')->middleware('pos.device')->group(function (): void {
    Route::get('lock', [PosDeviceController::class, 'lock'])->name('lock');
    Route::post('unlock', [PosDeviceController::class, 'unlock'])->name('unlock');

    Route::middleware('pos.actor')->group(function (): void {
        Route::get('/', [PosDeviceController::class, 'home'])->name('home');
        Route::post('lock', [PosDeviceController::class, 'relock'])->name('lock.store');
        Route::post('register-sessions', [RegisterSessionController::class, 'store'])->name('register-sessions.store');
        Route::post('register-sessions/{registerSession}/close', [RegisterSessionController::class, 'close'])->name('register-sessions.close');
        Route::post('register-sessions/{registerSession}/movements', [RegisterSessionController::class, 'movement'])->name('register-sessions.movements.store');
        Route::post('sales', [PosController::class, 'store'])->name('sales.store');
    });
});
