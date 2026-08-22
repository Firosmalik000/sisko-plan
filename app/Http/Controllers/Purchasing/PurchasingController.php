<?php

namespace App\Http\Controllers\Purchasing;

use App\Actions\Purchasing\PostPurchase;
use App\Actions\Purchasing\PostPurchasePayment;
use App\Http\Controllers\Controller;
use App\Http\Requests\Purchasing\StorePurchasePaymentRequest;
use App\Http\Requests\Purchasing\StorePurchaseRequest;
use App\Models\FinancialAccount;
use App\Models\ProductUnit;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\SupplierPayableTransaction;
use App\Models\User;
use App\Support\CurrentStore;
use App\Support\Decimal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use LogicException;

class PurchasingController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewPurchasing', $store);
        $timezone = $store->settings()->value('timezone') ?? 'Asia/Jakarta';
        $paidSubquery = DB::table('purchase_payments')
            ->select('purchase_id', DB::raw('SUM(amount) as paid_amount'))
            ->where('store_id', $store->id)->groupBy('purchase_id');
        $purchases = Purchase::query()->where('purchases.store_id', $store->id)
            ->join('suppliers', 'suppliers.id', '=', 'purchases.supplier_id')
            ->leftJoinSub($paidSubquery, 'paid', 'paid.purchase_id', '=', 'purchases.id')
            ->select([
                'purchases.id', 'purchases.public_id', 'purchases.document_number', 'purchases.supplier_invoice_number',
                'purchases.total_amount', 'purchases.occurred_at', 'purchases.notes', 'suppliers.name as supplier_name',
            ])->selectRaw('COALESCE(paid.paid_amount, 0) as paid_amount')
            ->latest('purchases.id')->paginate(perPage: 20, pageName: 'purchases_page')->withQueryString();
        $itemGroups = PurchaseItem::query()->whereIn('purchase_id', $purchases->getCollection()->pluck('id'))
            ->orderBy('id')->get(['purchase_id', 'product_name', 'unit_symbol', 'quantity', 'base_quantity', 'unit_price', 'landed_total'])
            ->groupBy('purchase_id');
        $purchases->through(function (Purchase $purchase) use ($itemGroups): array {
            $paid = (string) ($purchase->paid_amount ?? '0');

            return [
                ...$purchase->only(['public_id', 'document_number', 'supplier_invoice_number', 'supplier_name', 'total_amount', 'occurred_at', 'notes']),
                'paid_amount' => $paid,
                'outstanding_amount' => Decimal::subtract($purchase->total_amount, $paid, Decimal::MONEY_SCALE),
                'items' => $itemGroups->get($purchase->id, collect())->map->only(['product_name', 'unit_symbol', 'quantity', 'base_quantity', 'unit_price', 'landed_total'])->values(),
            ];
        });
        $suppliers = Supplier::query()->where('suppliers.store_id', $store->id)
            ->leftJoin('supplier_payable_balances', fn ($join) => $join->on('supplier_payable_balances.supplier_id', '=', 'suppliers.id')->where('supplier_payable_balances.store_id', $store->id))
            ->orderBy('suppliers.name')->get(['suppliers.public_id', 'suppliers.name', 'suppliers.is_active', DB::raw('COALESCE(supplier_payable_balances.balance, 0) as payable_balance')]);
        $products = ProductUnit::query()->where('product_units.store_id', $store->id)
            ->where('product_units.is_active', true)->where('products.is_active', true)->where('units.is_active', true)
            ->join('products', 'products.id', '=', 'product_units.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'product_units.product_variant_id')
            ->join('units', 'units.id', '=', 'product_units.unit_id')
            ->where(fn ($query) => $query->whereNull('product_units.product_variant_id')->orWhere('product_variants.is_active', true))
            ->orderBy('products.name')->orderBy('product_variants.name')->orderBy('units.name')->get([
                DB::raw('COALESCE(product_variants.public_id, products.public_id) as product_id'),
                'products.name as product_name', 'product_variants.name as variant_name', 'product_units.sku',
                'units.public_id as unit_id', 'units.name as unit_name', 'units.symbol as unit_symbol',
                'product_units.conversion_factor', 'product_units.purchase_price',
            ])->map(function (ProductUnit $product): array {
                $data = $product->toArray();
                $variantName = $product->getAttribute('variant_name');
                $productName = (string) $product->getAttribute('product_name');
                $data['product_name'] = $variantName === null ? $productName : "{$productName} - {$variantName}";

                return $data;
            });
        $accounts = FinancialAccount::query()->where(['store_id' => $store->id, 'is_active' => true])->orderBy('name')->get(['public_id', 'name']);
        $payableTransactions = SupplierPayableTransaction::query()->where('supplier_payable_transactions.store_id', $store->id)
            ->join('suppliers', 'suppliers.id', '=', 'supplier_payable_transactions.supplier_id')
            ->latest('supplier_payable_transactions.id')->paginate(20, [
                'supplier_payable_transactions.public_id', 'supplier_payable_transactions.direction', 'supplier_payable_transactions.reason',
                'supplier_payable_transactions.amount', 'supplier_payable_transactions.balance_after', 'supplier_payable_transactions.occurred_at',
                'suppliers.name as supplier_name',
            ], 'payables_page')->withQueryString();

        return Inertia::render('purchasing/index', [
            'purchases' => $purchases, 'suppliers' => $suppliers, 'products' => $products, 'accounts' => $accounts,
            'payableTransactions' => $payableTransactions, 'timezone' => $timezone,
            'totalPayable' => DB::table('supplier_payable_balances')->where('store_id', $store->id)->sum('balance'),
            'canManage' => Gate::allows('managePurchasing', $store),
        ]);
    }

    public function store(StorePurchaseRequest $request, CurrentStore $currentStore, PostPurchase $action): RedirectResponse
    {
        $data = $request->validated();
        $storeId = $currentStore->id();
        $supplierId = Supplier::query()->where(['store_id' => $storeId, 'public_id' => $data['supplier_id']])->valueOrFail('id');
        $accountId = isset($data['account_id']) ? FinancialAccount::query()->where(['store_id' => $storeId, 'public_id' => $data['account_id']])->valueOrFail('id') : null;
        $items = [];
        foreach ($data['items'] as $item) {
            $productUnitId = ProductUnit::query()->where('product_units.store_id', $storeId)
                ->join('products', 'products.id', '=', 'product_units.product_id')
                ->leftJoin('product_variants', 'product_variants.id', '=', 'product_units.product_variant_id')
                ->join('units', 'units.id', '=', 'product_units.unit_id')
                ->where(fn ($query) => $query->where('products.public_id', $item['product_id'])->whereNull('product_units.product_variant_id')->orWhere('product_variants.public_id', $item['product_id']))
                ->where(['units.public_id' => $item['unit_id'], 'product_units.is_active' => true])
                ->valueOrFail('product_units.id');
            $items[] = ['product_unit_id' => $productUnitId, 'quantity' => $item['quantity'], 'unit_price' => $item['unit_price']];
        }
        $action->handle(
            $currentStore->get(), $this->actor($request), $supplierId, $items, $data['discount_amount'], $data['additional_cost'],
            $accountId, $data['paid_amount'], $data['occurred_at'], $data['supplier_invoice_number'] ?? null, $data['notes'] ?? null,
            $data['idempotency_key'], $request->ip(),
        );
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembelian berhasil diposting.']);

        return back();
    }

    public function payment(StorePurchasePaymentRequest $request, Purchase $purchase, CurrentStore $currentStore, PostPurchasePayment $action): RedirectResponse
    {
        $data = $request->validated();
        abort_unless($purchase->store_id === $currentStore->id(), 404);
        $accountId = FinancialAccount::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['account_id']])->valueOrFail('id');
        $action->handle($currentStore->get(), $this->actor($request), $purchase->id, $accountId, $data['amount'], $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pembayaran utang supplier berhasil diposting.']);

        return back();
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
