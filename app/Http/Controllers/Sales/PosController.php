<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\PostSale;
use App\Enums\FinancialAccountType;
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
        $this->ensurePaymentMethods($store->id);

        $products = ProductUnit::query()->where('product_units.store_id', $store->id)
            ->where('product_units.is_active', true)->where('products.is_active', true)->where('units.is_active', true)
            ->join('products', 'products.id', '=', 'product_units.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'product_units.product_variant_id')
            ->join('units', 'units.id', '=', 'product_units.unit_id')
            ->where(fn ($query) => $query->whereNull('product_units.product_variant_id')->orWhere('product_variants.is_active', true))
            ->leftJoin('inventory_balances', function ($join) use ($store): void {
                $join->on('inventory_balances.product_id', '=', 'products.id')
                    ->where('inventory_balances.store_id', $store->id)
                    ->whereRaw("((products.variant_mode = 'separate' AND inventory_balances.product_variant_id = product_variants.id) OR (products.variant_mode <> 'separate' AND inventory_balances.product_variant_id IS NULL))");
            })
            ->orderBy('products.name')->orderBy('product_variants.name')->orderBy('units.name')->get([
                'products.public_id as catalog_product_id', 'products.name as catalog_product_name',
                'products.photo_path as catalog_product_photo_path',
                DB::raw('COALESCE(product_variants.public_id, products.public_id) as product_id'),
                'products.name as product_name', 'product_variants.name as variant_name',
                'product_units.sku', 'product_units.barcode',
                'units.public_id as unit_id', 'units.name as unit_name', 'units.symbol as unit_symbol',
                'product_units.conversion_factor', 'product_units.selling_price',
                DB::raw('CASE WHEN product_units.unit_id = products.base_unit_id THEN 1 ELSE 0 END as is_base_unit'),
                DB::raw('COALESCE(inventory_balances.quantity, 0) as stock_quantity'),
                DB::raw('COALESCE(inventory_balances.minimum_quantity, 0) as minimum_quantity'),
            ])->map(function ($product) {
                $photoPublicId = $product->getAttribute('catalog_product_photo_path')
                    ? $product->getAttribute('catalog_product_id')
                    : null;

                return [
                    ...$product->toArray(),
                    'photo_url' => $photoPublicId
                        ? route('master-data.products.photo', [
                            'product' => $photoPublicId,
                            'v' => substr(hash('sha256', (string) $product->getAttribute('catalog_product_photo_path')), 0, 12),
                        ])
                        : null,
                ];
            });
        $activeAccounts = FinancialAccount::query()->where(['store_id' => $store->id, 'is_active' => true]);
        $cash = (clone $activeAccounts)->where('type', FinancialAccountType::Cash->value)->orderBy('name')->first(['public_id', 'name']);
        $qris = (clone $activeAccounts)
            ->whereIn('type', [FinancialAccountType::EWallet->value, FinancialAccountType::Bank->value])
            ->orderByRaw("CASE WHEN LOWER(name) LIKE '%qris%' THEN 0 WHEN type = ? THEN 1 ELSE 2 END", [FinancialAccountType::EWallet->value])
            ->orderBy('name')->first(['public_id', 'name']);
        $paymentMethods = collect([
            $cash ? ['method' => 'cash', 'label' => __('Cash'), 'account_id' => $cash->public_id] : null,
            $qris ? ['method' => 'qris', 'label' => 'QRIS', 'account_id' => $qris->public_id] : null,
        ])->filter()->values();

        return Inertia::render('pos/index', [
            'products' => $products, 'paymentMethods' => $paymentMethods,
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
                ->leftJoin('product_variants', 'product_variants.id', '=', 'product_units.product_variant_id')
                ->join('units', 'units.id', '=', 'product_units.unit_id')
                ->where('products.is_active', true)
                ->where(fn ($query) => $query->where('products.public_id', $item['product_id'])->whereNull('product_units.product_variant_id')->orWhere('product_variants.public_id', $item['product_id']))
                ->where([
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
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sale posted successfully.')]);

        return to_route('sales.show', $sale);
    }

    private function ensurePaymentMethods(int $storeId): void
    {
        $cash = FinancialAccount::query()
            ->where('store_id', $storeId)
            ->where('type', FinancialAccountType::Cash->value)
            ->orderByDesc('is_active')
            ->orderBy('id')
            ->first();

        if ($cash) {
            if (! $cash->is_active) {
                $cash->forceFill(['is_active' => true])->save();
            }
        } else {
            FinancialAccount::query()->create([
                'store_id' => $storeId,
                'name' => 'Kas',
                'type' => FinancialAccountType::Cash->value,
                'is_active' => true,
            ]);
        }

        $qris = FinancialAccount::query()
            ->where('store_id', $storeId)
            ->whereIn('type', [FinancialAccountType::EWallet->value, FinancialAccountType::Bank->value])
            ->orderByRaw("CASE WHEN LOWER(name) LIKE '%qris%' THEN 0 WHEN type = ? THEN 1 ELSE 2 END", [FinancialAccountType::EWallet->value])
            ->orderByDesc('is_active')
            ->orderBy('id')
            ->first();

        if ($qris) {
            if (! $qris->is_active) {
                $qris->forceFill(['is_active' => true])->save();
            }
        } else {
            FinancialAccount::query()->create([
                'store_id' => $storeId,
                'name' => 'QRIS',
                'type' => FinancialAccountType::EWallet->value,
                'is_active' => true,
            ]);
        }
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
