<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Expenses\ExpenseController;
use App\Http\Controllers\MasterData\CategoryController;
use App\Http\Controllers\MasterData\FinancialAccountController;
use App\Http\Controllers\MasterData\ProductController;
use App\Http\Controllers\MasterData\SupplierController;
use App\Http\Controllers\MasterData\UnitController;
use App\Http\Controllers\Operations\LedgerController;
use App\Http\Controllers\Operations\StockCountController;
use App\Http\Controllers\ProductScannerController;
use App\Http\Controllers\PricingController;
use App\Http\Controllers\Purchasing\PurchasingController;
use App\Http\Controllers\Reports\ReportController;
use App\Http\Controllers\Sales\PosController;
use App\Http\Controllers\Sales\SalesController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\StoreMemberController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SuperAdmin\ImpersonationController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');
Route::get('pricing', PricingController::class)->name('pricing');

Route::middleware(['auth', 'throttle:store-writes'])->group(function () {
    Route::post('impersonation/leave', [ImpersonationController::class, 'destroy'])->name('impersonation.leave');
});

Route::middleware(['auth', 'verified', 'throttle:store-writes'])->group(function () {
    Route::post('pricing/subscribe', [PricingController::class, 'subscribe'])->name('pricing.subscribe');
    Route::get('stores', [StoreController::class, 'index'])->name('stores.index');
    Route::get('stores/create', [StoreController::class, 'create'])->name('stores.create');
    Route::post('stores', [StoreController::class, 'store'])->name('stores.store');
    Route::get('stores/{store}', [StoreController::class, 'show'])->name('stores.show');
    Route::patch('stores/{store}', [StoreController::class, 'update'])->name('stores.update');
    Route::post('stores/{store}/switch', [StoreController::class, 'switch'])->name('stores.switch');
    Route::post('stores/{store}/members', [StoreMemberController::class, 'store'])->name('stores.members.store');
    Route::patch('stores/{store}/members/{member}', [StoreMemberController::class, 'update'])->name('stores.members.update');

    Route::middleware(['active.store', 'subscription.access'])->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        Route::post('scanner/catalog-item-lookups', [ProductScannerController::class, 'lookup'])->name('scanner.catalog-items.lookup');
        Route::post('scanner/catalog-item-recognitions', [ProductScannerController::class, 'recognize'])->name('scanner.catalog-items.recognize');
        Route::post('scanner/catalog-item-discoveries', [ProductScannerController::class, 'discover'])->name('scanner.catalog-items.discover');

        Route::get('master-data/categories', [CategoryController::class, 'index'])->name('master-data.categories.index');
        Route::post('master-data/categories', [CategoryController::class, 'store'])->name('master-data.categories.store');
        Route::patch('master-data/categories/{category}', [CategoryController::class, 'update'])->name('master-data.categories.update');

        Route::get('master-data/units', [UnitController::class, 'index'])->name('master-data.units.index');
        Route::post('master-data/units', [UnitController::class, 'store'])->name('master-data.units.store');
        Route::patch('master-data/units/{unit}', [UnitController::class, 'update'])->name('master-data.units.update');

        Route::get('master-data/products', [ProductController::class, 'index'])->name('master-data.products.index');
        Route::post('master-data/products', [ProductController::class, 'store'])->name('master-data.products.store');
        Route::patch('master-data/products/{product}', [ProductController::class, 'update'])->name('master-data.products.update');
        Route::delete('master-data/products/{product}', [ProductController::class, 'destroy'])->name('master-data.products.destroy');
        Route::get('master-data/products/{product}/photo', [ProductController::class, 'photo'])->name('master-data.products.photo');
        Route::get('master-data/products/{product}/variants/{variant}/photo', [ProductController::class, 'variantPhoto'])->name('master-data.products.variants.photo');

        Route::get('master-data/suppliers', [SupplierController::class, 'index'])->name('master-data.suppliers.index');
        Route::post('master-data/suppliers', [SupplierController::class, 'store'])->name('master-data.suppliers.store');
        Route::patch('master-data/suppliers/{supplier}', [SupplierController::class, 'update'])->name('master-data.suppliers.update');

        Route::get('master-data/financial-accounts', [FinancialAccountController::class, 'index'])->name('master-data.financial-accounts.index');
        Route::post('master-data/financial-accounts', [FinancialAccountController::class, 'store'])->name('master-data.financial-accounts.store');
        Route::patch('master-data/financial-accounts/{financialAccount}', [FinancialAccountController::class, 'update'])->name('master-data.financial-accounts.update');

        Route::get('operations/inventory', [LedgerController::class, 'inventory'])->name('operations.inventory');
        Route::post('operations/inventory/adjustments', [LedgerController::class, 'stockAdjustment'])->name('operations.inventory.adjustments.store');
        Route::post('operations/inventory/minimum-stock', [LedgerController::class, 'minimumStock'])->name('operations.inventory.minimum-stock.store');
        Route::get('operations/stock-opnames', [StockCountController::class, 'index'])->name('operations.stock-opnames.index');
        Route::post('operations/stock-opnames', [StockCountController::class, 'store'])->name('operations.stock-opnames.store');
        Route::get('operations/stock-opnames/{stockCount}', [StockCountController::class, 'show'])->name('operations.stock-opnames.show');
        Route::patch('operations/stock-opnames/{stockCount}', [StockCountController::class, 'update'])->name('operations.stock-opnames.update');
        Route::post('operations/stock-opnames/{stockCount}/complete', [StockCountController::class, 'complete'])->name('operations.stock-opnames.complete');
        Route::post('operations/stock-opnames/{stockCount}/reopen', [StockCountController::class, 'reopen'])->name('operations.stock-opnames.reopen');
        Route::post('operations/stock-opnames/{stockCount}/post', [StockCountController::class, 'post'])->name('operations.stock-opnames.post');
        Route::post('operations/stock-opnames/{stockCount}/cancel', [StockCountController::class, 'cancel'])->name('operations.stock-opnames.cancel');
        Route::get('operations/cash', [LedgerController::class, 'cash'])->name('operations.cash');
        Route::post('operations/cash/opening', [LedgerController::class, 'openingCash'])->name('operations.cash.opening.store');
        Route::post('operations/cash/transfers', [LedgerController::class, 'transfer'])->name('operations.cash.transfers.store');
        Route::get('operations/capital', [LedgerController::class, 'capital'])->name('operations.capital');
        Route::post('operations/capital', [LedgerController::class, 'capitalTransaction'])->name('operations.capital.store');

        Route::get('purchasing', [PurchasingController::class, 'index'])->name('purchasing.index');
        Route::post('purchasing', [PurchasingController::class, 'store'])->name('purchasing.store');
        Route::post('purchasing/{purchase}/payments', [PurchasingController::class, 'payment'])->name('purchasing.payments.store');

        Route::get('pos', [PosController::class, 'index'])->name('pos.index');
        Route::post('pos/sales', [PosController::class, 'store'])->name('pos.sales.store');
        Route::get('sales', [SalesController::class, 'index'])->name('sales.index');
        Route::get('sales/{sale}', [SalesController::class, 'show'])->name('sales.show');
        Route::get('sales/{sale}/returns/create', [SalesController::class, 'createReturn'])->name('sales.returns.create');
        Route::post('sales/{sale}/returns', [SalesController::class, 'storeReturn'])->name('sales.returns.store');

        Route::get('expenses', [ExpenseController::class, 'index'])->name('expenses.index');
        Route::post('expenses/categories', [ExpenseController::class, 'storeCategory'])->name('expenses.categories.store');
        Route::patch('expenses/categories/{expenseCategory}', [ExpenseController::class, 'updateCategory'])->name('expenses.categories.update');
        Route::post('expenses', [ExpenseController::class, 'store'])->name('expenses.store');

        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('subscription', SubscriptionController::class)->name('subscription.index');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/super-admin.php';
