<?php

use App\Http\Controllers\Api\V1\Account\MeController;
use App\Http\Controllers\Api\V1\Account\PasskeyController;
use App\Http\Controllers\Api\V1\Account\PasswordController;
use App\Http\Controllers\Api\V1\Account\ProfilePhotoController;
use App\Http\Controllers\Api\V1\Account\TwoFactorController;
use App\Http\Controllers\Api\V1\Auth\ConfirmPasswordController;
use App\Http\Controllers\Api\V1\Auth\EmailVerificationController;
use App\Http\Controllers\Api\V1\Auth\PasswordResetController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\SocialTokenController;
use App\Http\Controllers\Api\V1\Auth\TokenController;
use App\Http\Controllers\Api\V1\Auth\TwoFactorChallengeController;
use App\Http\Controllers\Api\V1\Catalog\CategoryController;
use App\Http\Controllers\Api\V1\Catalog\UnitController;
use App\Http\Controllers\Api\V1\Devices\DeviceController;
use App\Http\Controllers\Api\V1\Distribution\CatalogIndexController;
use App\Http\Controllers\Api\V1\Distribution\CatalogShowController;
use App\Http\Controllers\Api\V1\Finance\CashLedgerController;
use App\Http\Controllers\Api\V1\Finance\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\Finance\ExpenseController;
use App\Http\Controllers\Api\V1\Finance\FinancialAccountController;
use App\Http\Controllers\Api\V1\Inventory\InventoryController;
use App\Http\Controllers\Api\V1\Inventory\StockCountController;
use App\Http\Controllers\Api\V1\Notifications\NotificationIndexController;
use App\Http\Controllers\Api\V1\Notifications\NotificationPreferenceController;
use App\Http\Controllers\Api\V1\Purchasing\PurchaseController;
use App\Http\Controllers\Api\V1\Purchasing\SupplierController;
use App\Http\Controllers\Api\V1\Purchasing\SupplierPaymentController;
use App\Http\Controllers\Api\V1\Reports\ReportController;
use App\Http\Controllers\Api\V1\Sales\SaleIndexController;
use App\Http\Controllers\Api\V1\Sales\SaleReconcileController;
use App\Http\Controllers\Api\V1\Sales\SaleReturnController;
use App\Http\Controllers\Api\V1\Sales\SaleShowController;
use App\Http\Controllers\Api\V1\Sales\SaleStoreController;
use App\Http\Controllers\Api\V1\Scanner\DiscoveriesController;
use App\Http\Controllers\Api\V1\Scanner\QuotaController;
use App\Http\Controllers\Api\V1\Scanner\RecognitionsController;
use App\Http\Controllers\Api\V1\Stores\BootstrapController;
use App\Http\Controllers\Api\V1\Stores\MemberController;
use App\Http\Controllers\Api\V1\Stores\ProductIndexController;
use App\Http\Controllers\Api\V1\Stores\ProductMutationController;
use App\Http\Controllers\Api\V1\Stores\StoreIndexController;
use App\Http\Controllers\Api\V1\Stores\StoreManagementController;
use App\Http\Controllers\Api\V1\Stores\StoreSettingsController;
use App\Http\Controllers\Api\V1\Stores\SyncPullController;
use App\Http\Controllers\Api\V1\Stores\SyncPushController;
use App\Http\Controllers\Api\V1\Subscriptions\SubscriptionController;
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

Route::get('test', function() {
    return 'Hallo World!';
});
/*
|--------------------------------------------------------------------------
| Pendaftaran, reset kata sandi, dan tantangan 2FA (Req 3, 5, 6) — publik
|--------------------------------------------------------------------------
| Semua di-throttle ketat `api-auth` (anti brute force). Pesan reset/forgot
| netral agar tidak membocorkan keberadaan email (Req 5.2).
*/
Route::middleware('throttle:api-auth')->group(function (): void {
    Route::post('auth/register', RegisterController::class);
    Route::post('auth/forgot-password', [PasswordResetController::class, 'forgot']);
    Route::post('auth/reset-password', [PasswordResetController::class, 'reset']);
    Route::post('auth/two-factor/challenge', TwoFactorChallengeController::class);
});

/*
|--------------------------------------------------------------------------
| Identitas & akses toko (Req 4, design §3.2)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'throttle:api-read'])->group(function (): void {
    Route::get('me', MeController::class);
    Route::patch('me/profile', [MeController::class, 'update']);

    // Foto profil + keamanan akun (Req 25.3, 26.1–26.4). Bukan store-scoped.
    Route::post('me/photo', ProfilePhotoController::class);
    Route::post('me/password', PasswordController::class);
    Route::post('me/two-factor', [TwoFactorController::class, 'enable']);
    Route::post('me/two-factor/confirm', [TwoFactorController::class, 'confirm']);
    Route::delete('me/two-factor', [TwoFactorController::class, 'disable']);
    Route::get('me/passkeys', [PasskeyController::class, 'index']);
    Route::post('me/passkeys/options', [PasskeyController::class, 'options']);
    Route::delete('me/passkeys/{passkey}', [PasskeyController::class, 'destroy']);

    Route::get('stores', StoreIndexController::class);

    // Buat toko baru (Req 21.2, 22.1) — bukan store-scoped; REUSE CreateStore.
    Route::post('stores', [StoreManagementController::class, 'store']);

    // Verifikasi email (kirim ulang) + konfirmasi kata sandi (Req 6.3–6.5).
    Route::post('auth/email/verification-notification', EmailVerificationController::class);
    Route::post('auth/confirm-password', ConfirmPasswordController::class);

    // Preferensi notifikasi per-pengguna (Req 29.1, 29.3).
    Route::get('me/notification-preferences', [NotificationPreferenceController::class, 'show']);
    Route::patch('me/notification-preferences', [NotificationPreferenceController::class, 'update']);

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

            // Catalog master data: kategori & unit (Req 9, 10). Baca store.read,
            // mutasi catalog.write; DELETE = soft-deactivate.
            Route::get('categories', [CategoryController::class, 'index']);
            Route::post('categories', [CategoryController::class, 'store']);
            Route::patch('categories/{category}', [CategoryController::class, 'update']);
            Route::delete('categories/{category}', [CategoryController::class, 'destroy']);

            Route::get('units', [UnitController::class, 'index']);
            Route::post('units', [UnitController::class, 'store']);
            Route::patch('units/{unit}', [UnitController::class, 'update']);
            Route::delete('units/{unit}', [UnitController::class, 'destroy']);

            // Purchasing: supplier privat toko (Req 12). Mutasi purchasing.write.
            Route::get('suppliers', [SupplierController::class, 'index']);
            Route::post('suppliers', [SupplierController::class, 'store']);
            Route::patch('suppliers/{supplier}', [SupplierController::class, 'update']);
            Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy']);

            // Finance: akun keuangan + saldo (Req 13). Mutasi finance.write.
            Route::get('financial-accounts', [FinancialAccountController::class, 'index']);
            Route::post('financial-accounts', [FinancialAccountController::class, 'store']);
            Route::patch('financial-accounts/{account}', [FinancialAccountController::class, 'update']);
            Route::delete('financial-accounts/{account}', [FinancialAccountController::class, 'destroy']);

            // Finance: kategori pengeluaran (Req 19.1) + baca daftar pengeluaran
            // (Req 19.4). Mutasi kategori finance.write; DELETE = soft-deactivate.
            Route::get('expense-categories', [ExpenseCategoryController::class, 'index']);
            Route::post('expense-categories', [ExpenseCategoryController::class, 'store']);
            Route::patch('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'update']);
            Route::delete('expense-categories/{expenseCategory}', [ExpenseCategoryController::class, 'destroy']);
            Route::get('expenses', [ExpenseController::class, 'index']);

            // Laporan bisnis (Req 20): penjualan (partisi kasir/periode), laba,
            // stok, kas. REUSE BusinessMetrics; baca store.read.
            Route::get('reports/sales', [ReportController::class, 'sales']);
            Route::get('reports/profit', [ReportController::class, 'profit']);
            Route::get('reports/stock', [ReportController::class, 'stock']);
            Route::get('reports/cash', [ReportController::class, 'cash']);

            // Purchasing: kulakan (baca) (Req 16.1). Detail + list.
            Route::get('purchases', [PurchaseController::class, 'index']);
            Route::get('purchases/{purchase}', [PurchaseController::class, 'show']);

            // Inventory: posisi stok + sesi opname (baca) (Req 14.1, 15.1).
            Route::get('inventory', [InventoryController::class, 'index']);
            Route::get('stock-counts', [StockCountController::class, 'index']);
            Route::get('stock-counts/{count}', [StockCountController::class, 'show']);

            // Pengaturan toko + struk (ability store.settings/owner, Req 21.2).
            Route::patch('settings', StoreSettingsController::class);

            // Manajemen toko: update identitas, nonaktif (arsip), pulihkan
            // (Req 21.3). Ability store.settings.
            Route::patch('/', [StoreManagementController::class, 'update']);
            Route::delete('/', [StoreManagementController::class, 'destroy']);
            Route::post('restore', [StoreManagementController::class, 'restore']);

            // Anggota toko (Req 22.1–22.5). Ability store.settings; owner terkunci
            // (OWNERSHIP_LOCKED); nonaktif = Suspended (jaga histori).
            Route::get('members', [MemberController::class, 'index']);
            Route::post('members', [MemberController::class, 'store']);
            Route::patch('members/{member}', [MemberController::class, 'update']);
            Route::delete('members/{member}', [MemberController::class, 'destroy']);

            // Langganan: overview (paket + aktif + kuota AI) & pilih paket
            // (owner, Req 24). REUSE SelectSubscriptionPlan + ScannerQuotaSnapshot.
            Route::get('subscription', [SubscriptionController::class, 'show']);
            Route::post('subscription', [SubscriptionController::class, 'store']);
        });

        // Sinkronisasi (pull/push) — limiter sedang `api-sync`.
        Route::middleware('throttle:api-sync')->group(function (): void {
            Route::get('sync/pull', SyncPullController::class);
            Route::post('sync/push', SyncPushController::class);
        });

        // Penjualan online + rekonsiliasi konflik + retur + kulakan + pembayaran
        // hutang — operasi tulis transaksional, limiter sedang `api-sales`.
        Route::middleware('throttle:api-sales')->group(function (): void {
            Route::post('sales', SaleStoreController::class);
            Route::post('sales/{sale}/reconcile', SaleReconcileController::class);

            // Retur penjualan (Req 17.6) — ability sale.reconcile.
            Route::post('sales/{sale}/returns', SaleReturnController::class);

            // Kulakan (create) + pembayaran hutang supplier (Req 16.2, 16.4).
            Route::post('purchases', [PurchaseController::class, 'store']);
            Route::post('suppliers/{supplier}/payments', SupplierPaymentController::class);

            // Kas: kas awal, transfer antar akun, modal (Req 18.1–18.3). Reuse
            // ledger action; ability finance.write. Saldo kurang → VALIDATION_ERROR.
            Route::post('cash/opening', [CashLedgerController::class, 'opening']);
            Route::post('cash/transfers', [CashLedgerController::class, 'transfer']);
            Route::post('capital', [CashLedgerController::class, 'capital']);

            // Pengeluaran (create) — REUSE PostExpense (Req 19.3). finance.write.
            Route::post('expenses', [ExpenseController::class, 'store']);

            // Inventory: penyesuaian stok + minimum (Req 14.2, 14.3).
            Route::post('inventory/adjustments', [InventoryController::class, 'adjust']);
            Route::patch('inventory/{product}/minimum', [InventoryController::class, 'setMinimum']);

            // Stok opname: lifecycle state machine (Req 15).
            Route::post('stock-counts', [StockCountController::class, 'store']);
            Route::patch('stock-counts/{count}', [StockCountController::class, 'update']);
            Route::post('stock-counts/{count}/complete', [StockCountController::class, 'complete']);
            Route::post('stock-counts/{count}/reopen', [StockCountController::class, 'reopen']);
            Route::post('stock-counts/{count}/cancel', [StockCountController::class, 'cancel']);
            Route::post('stock-counts/{count}/post', [StockCountController::class, 'post']);
        });
    });
