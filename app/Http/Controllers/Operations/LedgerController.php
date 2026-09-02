<?php

namespace App\Http\Controllers\Operations;

use App\Actions\Ledgers\PostAccountTransfer;
use App\Actions\Ledgers\PostCapitalTransaction;
use App\Actions\Ledgers\PostOpeningCash;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Http\Controllers\Controller;
use App\Http\Requests\Operations\AccountTransferRequest;
use App\Http\Requests\Operations\CapitalTransactionRequest;
use App\Http\Requests\Operations\LedgerRequest;
use App\Http\Requests\Operations\MinimumStockRequest;
use App\Http\Requests\Operations\OpeningCashRequest;
use App\Http\Requests\Operations\StockAdjustmentRequest;
use App\Models\CapitalTransaction;
use App\Models\CashTransaction;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountBalance;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
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

class LedgerController extends Controller
{
    public function inventory(Request $request, CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        $timezone = $store->settings()->value('timezone') ?? 'Asia/Jakarta';
        Gate::authorize('viewOperations', $store);
        $products = InventoryBalance::query()->where('inventory_balances.store_id', $store->id)
            ->join('products', 'products.id', '=', 'inventory_balances.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_balances.product_variant_id')
            ->leftJoin('product_units', function ($join): void {
                $join->on('product_units.product_id', '=', 'inventory_balances.product_id')
                    ->on(function ($identity): void {
                        $identity->on('product_units.product_variant_id', '=', 'inventory_balances.product_variant_id')
                            ->orWhere(fn ($query) => $query->whereNull('product_units.product_variant_id')->whereNull('inventory_balances.product_variant_id'));
                    })
                    ->where('product_units.is_active', true)
                    ->whereRaw('(product_units.product_variant_id IS NOT NULL OR product_units.unit_id = products.base_unit_id)');
            })
            ->join('units', 'units.id', '=', 'products.base_unit_id')
            ->where('products.is_active', true)
            ->where(fn ($query) => $query->whereNull('inventory_balances.product_variant_id')->orWhere('product_variants.is_active', true))
            ->orderBy('products.name')->orderBy('product_variants.name')
            ->get([
                DB::raw('COALESCE(product_variants.public_id, products.public_id) as public_id'), 'products.name', 'product_units.sku',
                'product_variants.name as variant_name', 'units.symbol as unit',
                DB::raw('CASE WHEN product_variants.id IS NULL THEN NULL ELSE products.public_id END as parent_public_id'),
                DB::raw('CASE WHEN product_variants.id IS NULL THEN NULL ELSE products.name END as parent_name'),
                'inventory_balances.quantity', 'inventory_balances.average_cost', 'inventory_balances.inventory_value', 'inventory_balances.minimum_quantity',
            ])->map(fn (InventoryBalance $product): array => [
                ...$product->toArray(),
                'quantity' => $product->quantity ?? '0.000000', 'average_cost' => $product->average_cost ?? '0.0000',
                'inventory_value' => $product->inventory_value ?? '0.0000', 'minimum_quantity' => $product->minimum_quantity ?? '0.000000',
            ]);
        $movements = StockMovement::query()->where('stock_movements.store_id', $store->id)
            ->join('products', 'products.id', '=', 'stock_movements.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'stock_movements.product_variant_id')
            ->join('units', 'units.id', '=', 'products.base_unit_id')
            ->latest('stock_movements.id')->select([
                'stock_movements.public_id', 'stock_movements.reason', 'stock_movements.quantity_change',
                'stock_movements.quantity_after', 'stock_movements.occurred_at', 'products.name as product_name', 'product_variants.name as variant_name',
                'units.symbol as unit',
            ])->selectRaw('(stock_movements.quantity_after - stock_movements.quantity_change) as quantity_before')
            ->paginate(25)->withQueryString()->through(function (StockMovement $movement): array {
                $productName = (string) $movement->getAttribute('product_name');
                $variantName = $movement->getAttribute('variant_name');

                return [...$movement->toArray(), 'product_name' => $variantName === null ? $productName : "{$productName} - {$variantName}"];
            });

        return Inertia::render('operations/inventory', ['products' => $products, 'movements' => $movements, 'timezone' => $timezone, 'canManage' => Gate::allows('manageOperations', $store)]);
    }

    public function cash(Request $request, CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        $timezone = $store->settings()->value('timezone') ?? 'Asia/Jakarta';
        Gate::authorize('viewOperations', $store);
        $accounts = FinancialAccount::query()->where('financial_accounts.store_id', $store->id)
            ->leftJoin('financial_account_balances', fn ($join) => $join->on('financial_account_balances.financial_account_id', '=', 'financial_accounts.id')->where('financial_account_balances.store_id', $store->id))
            ->orderBy('financial_accounts.name')->get(['financial_accounts.public_id', 'financial_accounts.name', 'financial_accounts.type', 'financial_accounts.is_active', 'financial_account_balances.balance'])
            ->map(fn (FinancialAccount $account): array => [...$account->toArray(), 'balance' => $account->balance ?? '0.0000']);
        $transactions = CashTransaction::query()->where('cash_transactions.store_id', $store->id)
            ->join('financial_accounts', 'financial_accounts.id', '=', 'cash_transactions.financial_account_id')
            ->latest('cash_transactions.id')->paginate(25, [
                'cash_transactions.public_id', 'cash_transactions.direction', 'cash_transactions.reason', 'cash_transactions.amount',
                'cash_transactions.balance_after', 'cash_transactions.occurred_at', 'financial_accounts.name as account_name',
            ])->withQueryString();

        return Inertia::render('operations/cash', ['accounts' => $accounts, 'transactions' => $transactions, 'timezone' => $timezone, 'totalBalance' => FinancialAccountBalance::query()->where('store_id', $store->id)->sum('balance'), 'canManage' => Gate::allows('manageOperations', $store)]);
    }

    public function capital(Request $request, CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        $timezone = $store->settings()->value('timezone') ?? 'Asia/Jakarta';
        Gate::authorize('viewOperations', $store);
        $transactions = CapitalTransaction::query()->where('capital_transactions.store_id', $store->id)
            ->leftJoin('financial_accounts', 'financial_accounts.id', '=', 'capital_transactions.financial_account_id')
            ->latest('capital_transactions.id')->paginate(25, [
                'capital_transactions.public_id', 'capital_transactions.document_number', 'capital_transactions.type', 'capital_transactions.total_value',
                'capital_transactions.occurred_at', 'capital_transactions.notes', 'financial_accounts.name as account_name',
            ])->withQueryString();
        $contributions = (string) CapitalTransaction::query()->where('store_id', $store->id)
            ->whereIn('type', ['cash_contribution', 'inventory_contribution'])->sum('total_value');
        $withdrawals = (string) CapitalTransaction::query()->where('store_id', $store->id)
            ->whereIn('type', ['cash_withdrawal', 'inventory_withdrawal'])->sum('total_value');
        $balance = Decimal::subtract($contributions, $withdrawals, Decimal::MONEY_SCALE);
        $products = InventoryBalance::query()->where('inventory_balances.store_id', $store->id)
            ->join('products', 'products.id', '=', 'inventory_balances.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_balances.product_variant_id')
            ->where('products.is_active', true)
            ->where(fn ($query) => $query->whereNull('inventory_balances.product_variant_id')->orWhere('product_variants.is_active', true))
            ->orderBy('products.name')->orderBy('product_variants.name')
            ->get([DB::raw('COALESCE(product_variants.public_id, products.public_id) as public_id'), 'products.name', 'product_variants.name as variant_name', 'inventory_balances.quantity', 'inventory_balances.average_cost'])
            ->map(fn (InventoryBalance $product): array => [
                ...$product->toArray(),
                'name' => $product->getAttribute('variant_name') === null
                    ? (string) $product->getAttribute('name')
                    : $product->getAttribute('name').' - '.$product->getAttribute('variant_name'),
                'quantity' => $product->quantity ?? '0.000000', 'average_cost' => $product->average_cost ?? '0.0000',
            ]);
        $accounts = FinancialAccount::query()->where('financial_accounts.store_id', $store->id)
            ->where('financial_accounts.is_active', true)
            ->leftJoin('financial_account_balances', fn ($join) => $join->on('financial_account_balances.financial_account_id', '=', 'financial_accounts.id')->where('financial_account_balances.store_id', $store->id))
            ->orderBy('financial_accounts.name')->get(['financial_accounts.public_id', 'financial_accounts.name', 'financial_account_balances.balance'])
            ->map(fn (FinancialAccount $account): array => [...$account->toArray(), 'balance' => $account->balance ?? '0.0000']);

        return Inertia::render('operations/capital', [
            'transactions' => $transactions, 'capitalBalance' => $balance,
            'contributionTotal' => $contributions, 'withdrawalTotal' => $withdrawals,
            'products' => $products, 'accounts' => $accounts, 'timezone' => $timezone,
            'canManage' => Gate::allows('manageOperations', $store),
        ]);
    }

    public function stockAdjustment(StockAdjustmentRequest $request, CurrentStore $currentStore, PostStockAdjustment $action): RedirectResponse
    {
        $data = $request->validated();
        $items = $this->resolveItems($request, $currentStore);
        $action->handle($currentStore->get(), $this->actor($request), $data['type'], $items, $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Stock movement posted successfully.')]);

        return back();
    }

    public function minimumStock(MinimumStockRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        $data = $request->validated();
        $identity = $this->resolveStockIdentity($currentStore->id(), $data['product_id']);
        DB::transaction(function () use ($currentStore, $identity, $data): void {
            DB::table('inventory_balances')->insertOrIgnore([
                'store_id' => $currentStore->id(), 'product_id' => $identity['product_id'],
                'product_variant_id' => $identity['product_variant_id'], 'stock_key' => $identity['stock_key'],
                'quantity' => 0, 'average_cost' => 0, 'inventory_value' => 0, 'minimum_quantity' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            InventoryBalance::query()->where(['store_id' => $currentStore->id(), 'stock_key' => $identity['stock_key']])
                ->lockForUpdate()->update(['minimum_quantity' => $data['minimum_quantity']]);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Minimum stock limit updated successfully.')]);

        return back();
    }

    public function openingCash(OpeningCashRequest $request, CurrentStore $currentStore, PostOpeningCash $action): RedirectResponse
    {
        $data = $request->validated();
        $accountId = FinancialAccount::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['account_id']])->valueOrFail('id');
        $action->handle($currentStore->get(), $this->actor($request), $accountId, $data['amount'], $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Opening account balance posted successfully.')]);

        return back();
    }

    public function transfer(AccountTransferRequest $request, CurrentStore $currentStore, PostAccountTransfer $action): RedirectResponse
    {
        $data = $request->validated();
        $accounts = FinancialAccount::query()->where('store_id', $currentStore->id())->whereIn('public_id', [$data['from_account_id'], $data['to_account_id']])->pluck('id', 'public_id');
        $action->handle($currentStore->get(), $this->actor($request), $accounts[$data['from_account_id']], $accounts[$data['to_account_id']], $data['amount'], $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Account transfer posted successfully.')]);

        return back();
    }

    public function capitalTransaction(CapitalTransactionRequest $request, CurrentStore $currentStore, PostCapitalTransaction $action): RedirectResponse
    {
        $data = $request->validated();
        $accountId = isset($data['account_id']) ? FinancialAccount::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['account_id']])->valueOrFail('id') : null;
        $items = $this->resolveItems($request, $currentStore);
        $action->handle($currentStore->get(), $this->actor($request), $data['type'], $accountId, $data['amount'] ?? null, $items, $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Capital transaction posted successfully.')]);

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

    /** @return array<int, array{product_id:int, product_variant_id:?int, quantity:string, unit_cost?:string|null}> */
    private function resolveItems(LedgerRequest $request, CurrentStore $currentStore): array
    {
        $input = $request->validated('items', []);
        if (! is_array($input)) {
            throw new LogicException('Validated ledger items must be an array.');
        }
        $items = [];
        foreach ($input as $item) {
            if (! is_array($item) || ! is_string($item['product_id'] ?? null) || ! is_string($item['quantity'] ?? null)) {
                throw new LogicException('Validated ledger item has an invalid shape.');
            }
            $unitCost = $item['unit_cost'] ?? null;
            if ($unitCost !== null && ! is_string($unitCost)) {
                throw new LogicException('Validated unit cost must be a decimal string.');
            }
            $identity = $this->resolveStockIdentity($currentStore->id(), $item['product_id']);
            $items[] = [
                'product_id' => $identity['product_id'],
                'product_variant_id' => $identity['product_variant_id'],
                'quantity' => $item['quantity'],
                'unit_cost' => $unitCost,
            ];
        }

        return $items;
    }

    /** @return array{product_id:int, product_variant_id:?int, stock_key:string} */
    private function resolveStockIdentity(int $storeId, string $publicId): array
    {
        $product = Product::query()->where(['store_id' => $storeId, 'public_id' => $publicId])
            ->where('variant_mode', '!=', 'separate')->first(['id']);
        if ($product !== null) {
            return ['product_id' => $product->id, 'product_variant_id' => null, 'stock_key' => "product:{$product->id}"];
        }

        $variant = ProductVariant::query()->where(['product_variants.store_id' => $storeId, 'product_variants.public_id' => $publicId])
            ->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('products.variant_mode', 'separate')
            ->firstOrFail(['product_variants.id', 'product_variants.product_id']);

        return [
            'product_id' => (int) $variant->product_id,
            'product_variant_id' => (int) $variant->id,
            'stock_key' => "variant:{$variant->id}",
        ];
    }
}
