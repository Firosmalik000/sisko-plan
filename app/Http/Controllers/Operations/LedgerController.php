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
        $products = Product::query()->where('products.store_id', $store->id)
            ->join('units', 'units.id', '=', 'products.base_unit_id')
            ->leftJoin('inventory_balances', fn ($join) => $join->on('inventory_balances.product_id', '=', 'products.id')->where('inventory_balances.store_id', $store->id))
            ->orderBy('products.name')->get([
                'products.public_id', 'products.name', 'products.sku', 'units.symbol as unit',
                'inventory_balances.quantity', 'inventory_balances.average_cost', 'inventory_balances.inventory_value', 'inventory_balances.minimum_quantity',
            ])->map(fn (Product $product): array => [
                ...$product->toArray(),
                'quantity' => $product->quantity ?? '0.000000', 'average_cost' => $product->average_cost ?? '0.0000',
                'inventory_value' => $product->inventory_value ?? '0.0000', 'minimum_quantity' => $product->minimum_quantity ?? '0.000000',
            ]);
        $movements = StockMovement::query()->where('stock_movements.store_id', $store->id)
            ->join('products', 'products.id', '=', 'stock_movements.product_id')
            ->latest('stock_movements.id')->paginate(25, [
                'stock_movements.public_id', 'stock_movements.reason', 'stock_movements.quantity_change', 'stock_movements.unit_cost',
                'stock_movements.value_change', 'stock_movements.quantity_after', 'stock_movements.occurred_at', 'products.name as product_name',
            ])->withQueryString();

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
        $products = Product::query()->where('store_id', $store->id)->where('is_active', true)->orderBy('name')->get(['id', 'public_id', 'name']);
        $accounts = FinancialAccount::query()->where('store_id', $store->id)->where('is_active', true)->orderBy('name')->get(['id', 'public_id', 'name']);

        return Inertia::render('operations/capital', ['transactions' => $transactions, 'capitalBalance' => $balance, 'products' => $products, 'accounts' => $accounts, 'timezone' => $timezone, 'canManage' => Gate::allows('manageOperations', $store)]);
    }

    public function stockAdjustment(StockAdjustmentRequest $request, CurrentStore $currentStore, PostStockAdjustment $action): RedirectResponse
    {
        $data = $request->validated();
        $items = $this->resolveItems($request, $currentStore);
        $action->handle($currentStore->get(), $this->actor($request), $data['type'], $items, $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pergerakan stok berhasil diposting.']);

        return back();
    }

    public function minimumStock(MinimumStockRequest $request, CurrentStore $currentStore): RedirectResponse
    {
        $data = $request->validated();
        $productId = Product::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['product_id']])->valueOrFail('id');
        DB::transaction(function () use ($currentStore, $productId, $data): void {
            DB::table('inventory_balances')->insertOrIgnore([
                'store_id' => $currentStore->id(), 'product_id' => $productId, 'quantity' => 0,
                'average_cost' => 0, 'inventory_value' => 0, 'minimum_quantity' => 0,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            InventoryBalance::query()->where(['store_id' => $currentStore->id(), 'product_id' => $productId])
                ->lockForUpdate()->update(['minimum_quantity' => $data['minimum_quantity']]);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Batas stok minimum berhasil diperbarui.']);

        return back();
    }

    public function openingCash(OpeningCashRequest $request, CurrentStore $currentStore, PostOpeningCash $action): RedirectResponse
    {
        $data = $request->validated();
        $accountId = FinancialAccount::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['account_id']])->valueOrFail('id');
        $action->handle($currentStore->get(), $this->actor($request), $accountId, $data['amount'], $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Saldo awal akun berhasil diposting.']);

        return back();
    }

    public function transfer(AccountTransferRequest $request, CurrentStore $currentStore, PostAccountTransfer $action): RedirectResponse
    {
        $data = $request->validated();
        $accounts = FinancialAccount::query()->where('store_id', $currentStore->id())->whereIn('public_id', [$data['from_account_id'], $data['to_account_id']])->pluck('id', 'public_id');
        $action->handle($currentStore->get(), $this->actor($request), $accounts[$data['from_account_id']], $accounts[$data['to_account_id']], $data['amount'], $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Transfer antar-akun berhasil diposting.']);

        return back();
    }

    public function capitalTransaction(CapitalTransactionRequest $request, CurrentStore $currentStore, PostCapitalTransaction $action): RedirectResponse
    {
        $data = $request->validated();
        $accountId = isset($data['account_id']) ? FinancialAccount::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['account_id']])->valueOrFail('id') : null;
        $items = $this->resolveItems($request, $currentStore);
        $action->handle($currentStore->get(), $this->actor($request), $data['type'], $accountId, $data['amount'] ?? null, $items, $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Transaksi modal berhasil diposting.']);

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

    /** @return array<int, array{product_id:int, quantity:string, unit_cost?:string|null}> */
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
            $items[] = [
                'product_id' => Product::query()->where(['store_id' => $currentStore->id(), 'public_id' => $item['product_id']])->valueOrFail('id'),
                'quantity' => $item['quantity'],
                'unit_cost' => $unitCost,
            ];
        }

        return $items;
    }
}
