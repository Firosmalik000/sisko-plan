<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\PostSale;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreSaleRequest;
use App\Models\FinancialAccount;
use App\Models\ProductUnit;
use App\Models\User;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use LogicException;

class PosController extends Controller
{
    public function index(CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        Gate::authorize('manageSales', $store);
        $products = ProductUnit::query()->where('product_units.store_id', $store->id)
            ->where('product_units.is_active', true)->where('products.is_active', true)->where('units.is_active', true)
            ->join('products', 'products.id', '=', 'product_units.product_id')
            ->join('units', 'units.id', '=', 'product_units.unit_id')
            ->leftJoin('inventory_balances', fn ($join) => $join->on('inventory_balances.product_id', '=', 'products.id')->where('inventory_balances.store_id', $store->id))
            ->orderBy('products.name')->orderBy('units.name')->get([
                'products.public_id as product_id', 'products.name as product_name', 'products.sku', 'products.barcode',
                'units.public_id as unit_id', 'units.name as unit_name', 'units.symbol as unit_symbol',
                'product_units.conversion_factor', 'product_units.selling_price',
                DB::raw('CASE WHEN product_units.unit_id = products.base_unit_id THEN 1 ELSE 0 END as is_base_unit'),
                DB::raw('COALESCE(inventory_balances.quantity, 0) as stock_quantity'),
            ]);
        $accounts = FinancialAccount::query()->where(['store_id' => $store->id, 'is_active' => true])->orderBy('name')->get(['public_id', 'name', 'type']);

        return Inertia::render('pos/index', [
            'products' => $products, 'accounts' => $accounts,
            'timezone' => $store->settings()->value('timezone') ?? 'Asia/Jakarta',
        ]);
    }

    public function store(StoreSaleRequest $request, CurrentStore $currentStore, PostSale $action): RedirectResponse
    {
        $data = $request->validated();
        $storeId = $currentStore->id();
        $accountId = FinancialAccount::query()->where(['store_id' => $storeId, 'public_id' => $data['account_id']])->valueOrFail('id');
        $items = [];
        foreach ($data['items'] as $item) {
            $productUnitId = ProductUnit::query()->where('product_units.store_id', $storeId)
                ->join('products', 'products.id', '=', 'product_units.product_id')
                ->join('units', 'units.id', '=', 'product_units.unit_id')
                ->where([
                    'products.public_id' => $item['product_id'], 'products.is_active' => true,
                    'units.public_id' => $item['unit_id'], 'units.is_active' => true,
                    'product_units.is_active' => true,
                ])->valueOrFail('product_units.id');
            $items[] = ['product_unit_id' => $productUnitId, 'quantity' => $item['quantity'], 'item_discount' => $item['discount_amount']];
        }
        $sale = $action->handle(
            $currentStore->get(), $this->actor($request), $accountId, $items,
            $data['transaction_discount_amount'], $data['paid_amount'], $data['occurred_at'],
            $data['notes'] ?? null, $data['idempotency_key'], $request->ip(),
        );
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Penjualan berhasil diposting.']);

        return to_route('sales.show', $sale);
    }

    private function actor(Request $request): User
    {
        $user = $request->user();
        if (! $user instanceof User) {
            throw new LogicException('An authenticated store user is required.');
        }

        return $user;
    }
}
