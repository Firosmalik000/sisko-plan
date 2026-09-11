<?php

use App\Http\Controllers\Api\V1\Account\MeController;
use App\Http\Controllers\Api\V1\Auth\SocialTokenController;
use App\Http\Controllers\Api\V1\Auth\TokenController;
use App\Http\Controllers\Api\V1\Stores\StoreIndexController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| Autentikasi per-perangkat (Req 2, design §3.2)
|--------------------------------------------------------------------------
| Prefix `api/v1` didaftarkan di bootstrap/app.php; hanya path relatif di sini.
*/
Route::post('auth/tokens', [TokenController::class, 'store']);
Route::delete('auth/tokens/current', [TokenController::class, 'destroyCurrent'])
    ->middleware('auth:sanctum');

/*
|--------------------------------------------------------------------------
| Login sosial mobile (Req 3, design §3.2) — verifikasi credential server-side
|--------------------------------------------------------------------------
*/
Route::post('auth/social/google', [SocialTokenController::class, 'google']);
Route::post('auth/social/apple', [SocialTokenController::class, 'apple']);

/*
|--------------------------------------------------------------------------
| Identitas & akses toko (Req 4, design §3.2)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('me', MeController::class);
    Route::get('stores', StoreIndexController::class);
});
