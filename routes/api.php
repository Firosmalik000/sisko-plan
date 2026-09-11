<?php

use App\Http\Controllers\Api\V1\Account\MeController;
use App\Http\Controllers\Api\V1\Auth\SocialTokenController;
use App\Http\Controllers\Api\V1\Auth\TokenController;
use App\Http\Controllers\Api\V1\Stores\BootstrapController;
use App\Http\Controllers\Api\V1\Stores\ProductIndexController;
use App\Http\Controllers\Api\V1\Stores\ProductMutationController;
use App\Http\Controllers\Api\V1\Stores\StoreIndexController;
use App\Http\Controllers\Api\V1\Stores\SyncPullController;
use App\Http\Controllers\Api\V1\Stores\SyncPushController;
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

/*
|--------------------------------------------------------------------------
| Bootstrap & sinkronisasi store-scoped (Req 6, 7, design §3.2, §5)
|--------------------------------------------------------------------------
| Middleware `store.membership` memverifikasi membership aktif + tenant
| isolation; controller re-check ability (store.read / sale.create per-op).
*/
Route::middleware(['auth:sanctum', 'store.membership'])
    ->prefix('stores/{store}')
    ->group(function (): void {
        Route::get('bootstrap', BootstrapController::class);
        Route::get('sync/pull', SyncPullController::class);
        Route::post('sync/push', SyncPushController::class);

        // Produk: read/search (ability store.read) + mutasi (ability product.write).
        Route::get('products', ProductIndexController::class);
        Route::post('products', [ProductMutationController::class, 'store']);
        Route::patch('products/{product}', [ProductMutationController::class, 'update']);
    });
