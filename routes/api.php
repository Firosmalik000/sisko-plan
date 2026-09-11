<?php

use App\Http\Controllers\Api\V1\Account\MeController;
use App\Http\Controllers\Api\V1\Auth\SocialTokenController;
use App\Http\Controllers\Api\V1\Auth\TokenController;
use App\Http\Controllers\Api\V1\Devices\DeviceController;
use App\Http\Controllers\Api\V1\Distribution\CatalogIndexController;
use App\Http\Controllers\Api\V1\Distribution\CatalogShowController;
use App\Http\Controllers\Api\V1\Notifications\NotificationIndexController;
use App\Http\Controllers\Api\V1\Sales\SaleIndexController;
use App\Http\Controllers\Api\V1\Sales\SaleReconcileController;
use App\Http\Controllers\Api\V1\Sales\SaleShowController;
use App\Http\Controllers\Api\V1\Sales\SaleStoreController;
use App\Http\Controllers\Api\V1\Scanner\DiscoveriesController;
use App\Http\Controllers\Api\V1\Scanner\QuotaController;
use App\Http\Controllers\Api\V1\Scanner\RecognitionsController;
use App\Http\Controllers\Api\V1\Stores\BootstrapController;
use App\Http\Controllers\Api\V1\Stores\ProductIndexController;
use App\Http\Controllers\Api\V1\Stores\ProductMutationController;
use App\Http\Controllers\Api\V1\Stores\StoreIndexController;
use App\Http\Controllers\Api\V1\Stores\StoreSettingsController;
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
Route::post('auth/tokens', [TokenController::class, 'store'])
    ->middleware('throttle:api-auth');
Route::delete('auth/tokens/current', [TokenController::class, 'destroyCurrent'])
    ->middleware(['auth:sanctum', 'throttle:api-auth']);

/*
|--------------------------------------------------------------------------
| Login sosial mobile (Req 3, design §3.2) — verifikasi credential server-side
|--------------------------------------------------------------------------
*/
Route::post('auth/social/google', [SocialTokenController::class, 'google'])
    ->middleware('throttle:api-auth');
Route::post('auth/social/apple', [SocialTokenController::class, 'apple'])
    ->middleware('throttle:api-auth');

/*
|--------------------------------------------------------------------------
| Identitas & akses toko (Req 4, design §3.2)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'throttle:api-read'])->group(function (): void {
    Route::get('me', MeController::class);
    Route::patch('me/profile', [MeController::class, 'update']);
    Route::get('stores', StoreIndexController::class);

    // Registrasi push per-perangkat (Req 15.1/15.6) — bukan store-scoped.
    Route::post('devices', [DeviceController::class, 'store']);
    Route::delete('devices/{device}', [DeviceController::class, 'destroy']);

    // Katalog distribusi READ-ONLY market-aware (Req 20.1/20.2/20.9) — bukan
    // store-scoped; market context dari query/header/negara toko aktif.
    Route::get('distribution/catalog', CatalogIndexController::class);
    Route::get('distribution/catalog/{item}', CatalogShowController::class);
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
        // Read/bootstrap — limiter longgar `api-read`.
        Route::middleware('throttle:api-read')->group(function (): void {
            Route::get('bootstrap', BootstrapController::class);
            Route::get('products', ProductIndexController::class);
            Route::get('sales', SaleIndexController::class);
            Route::get('sales/{sale}', SaleShowController::class);
            Route::get('scanner/quota', QuotaController::class);
            Route::post('scanner/recognitions', RecognitionsController::class);
            Route::post('scanner/discoveries', DiscoveriesController::class);
            Route::get('notifications', NotificationIndexController::class);

            // Mutasi produk (ability product.write) — bagian read/tooling toko.
            Route::post('products', [ProductMutationController::class, 'store']);
            Route::patch('products/{product}', [ProductMutationController::class, 'update']);

            // Pengaturan toko + struk (ability store.settings/owner, Req 21.2).
            Route::patch('settings', StoreSettingsController::class);
        });

        // Sinkronisasi (pull/push) — limiter sedang `api-sync`.
        Route::middleware('throttle:api-sync')->group(function (): void {
            Route::get('sync/pull', SyncPullController::class);
            Route::post('sync/push', SyncPushController::class);
        });

        // Penjualan online + rekonsiliasi konflik — limiter sedang `api-sales`.
        Route::middleware('throttle:api-sales')->group(function (): void {
            Route::post('sales', SaleStoreController::class);
            Route::post('sales/{sale}/reconcile', SaleReconcileController::class);
        });
    });
