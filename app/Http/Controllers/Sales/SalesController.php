<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\PostSaleReturn;
use App\Actions\Sales\UpsertSaleCustomer;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreSaleReturnRequest;
use App\Models\FinancialAccount;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\User;
use App\Support\CurrentStore;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use LogicException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SalesController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewSales', $store);
        $timezone = $store->settings()->value('timezone') ?? 'Asia/Jakarta';
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'period' => ['nullable', 'in:today,week,month,all,custom'],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'payment_method' => ['nullable', 'in:cash,qris'],
            'customer' => ['nullable', 'in:identified,guest'],
            'view' => ['nullable', 'in:history,returns'],
            'from' => ['nullable', 'in:pos'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $period = (string) ($validated['period'] ?? 'today');
        $startDate = (string) ($validated['start_date'] ?? '');
        $endDate = (string) ($validated['end_date'] ?? '');
        $paymentMethod = (string) ($validated['payment_method'] ?? '');
        $customer = (string) ($validated['customer'] ?? '');
        $from = ($validated['from'] ?? null) === 'pos' ? 'pos' : null;
        $today = CarbonImmutable::now($timezone);
        $start = match ($period) {
            'today' => $today->startOfDay(),
            'week' => $today->subDays(6)->startOfDay(),
            'month' => $today->startOfMonth(),
            'custom' => $startDate === '' ? null : CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$startDate} 00:00:00", $timezone),
            default => null,
        };
        $end = match ($period) {
            'today', 'week', 'month' => $today->endOfDay(),
            'custom' => $endDate === '' ? null : CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$endDate} 23:59:59", $timezone),
            default => null,
        };
        $phoneSearch = preg_match('/\d{5,}/', $search) === 1
            ? UpsertSaleCustomer::normalizePhone($search, $store->country?->code)
            : null;
        $canReturn = Gate::allows('manageSaleReturns', $store);
        $view = ($validated['view'] ?? null) === 'returns' && $canReturn
            ? 'returns'
            : 'history';
        $itemTotals = DB::table('sale_items')->select('sale_id')->selectRaw('SUM(cogs_amount) as cogs_amount, SUM(gross_profit) as gross_profit')->where('store_id', $store->id)->groupBy('sale_id');
        $returnTotals = DB::table('sale_returns')->select('sale_id')->selectRaw('SUM(refund_amount) as refund_amount, SUM(cogs_reversed) as cogs_reversed, SUM(gross_profit_reversed) as gross_profit_reversed')->where('store_id', $store->id)->groupBy('sale_id');
        $sales = Sale::query()->where('sales.store_id', $store->id)
            ->when($start !== null, fn ($query) => $query->where('sales.occurred_at', '>=', $start->utc()))
            ->when($end !== null, fn ($query) => $query->where('sales.occurred_at', '<=', $end->utc()))
            ->join('sale_payments', 'sale_payments.sale_id', '=', 'sales.id')
            ->join('financial_accounts', 'financial_accounts.id', '=', 'sale_payments.financial_account_id')
            ->leftJoin('customers', function ($join) use ($store): void {
                $join->on('customers.id', '=', 'sales.customer_id')
                    ->where('customers.store_id', '=', $store->id);
            })
            ->leftJoinSub($itemTotals, 'item_totals', 'item_totals.sale_id', '=', 'sales.id')
            ->leftJoinSub($returnTotals, 'return_totals', 'return_totals.sale_id', '=', 'sales.id')
            ->when($search !== '', function ($query) use ($phoneSearch, $search): void {
                $query->where(function ($nested) use ($phoneSearch, $search): void {
                    $nested->where('sales.document_number', 'like', "%{$search}%")
                        ->orWhere('sales.customer_name', 'like', "%{$search}%")
                        ->orWhere('sales.customer_phone', 'like', "%{$search}%")
                        ->when($phoneSearch !== null, fn ($phoneQuery) => $phoneQuery->orWhere('customers.phone_normalized', 'like', "%{$phoneSearch}%"));
                });
            })
            ->when($paymentMethod !== '', fn ($query) => $query->where('sale_payments.payment_method', $paymentMethod))
            ->when($customer === 'identified', fn ($query) => $query->whereNotNull('sales.customer_id'))
            ->when($customer === 'guest', fn ($query) => $query->whereNull('sales.customer_id'))
            ->select(['sales.public_id', 'sales.document_number', 'sales.customer_name', 'sales.customer_phone', 'sales.total_amount', 'sales.paid_amount', 'sales.change_amount', 'sales.occurred_at', 'sale_payments.payment_method', 'financial_accounts.name as account_name'])
            ->selectRaw('COALESCE(item_totals.cogs_amount, 0) as cogs_amount, COALESCE(item_totals.gross_profit, 0) as gross_profit')
            ->selectRaw('COALESCE(return_totals.refund_amount, 0) as refund_amount, COALESCE(return_totals.cogs_reversed, 0) as cogs_reversed, COALESCE(return_totals.gross_profit_reversed, 0) as gross_profit_reversed')
            ->latest('sales.id')->paginate(25)->withQueryString();
        $canViewProfit = Gate::allows('manageOperations', $store);
        $sales->through(function (Sale $sale) use ($canViewProfit): array {
            $refund = (string) ($sale->refund_amount ?? '0');
            $result = [
                ...$sale->only(['public_id', 'document_number', 'customer_name', 'customer_phone', 'total_amount', 'paid_amount', 'change_amount', 'occurred_at', 'payment_method', 'account_name']),
                'refund_amount' => $refund,
                'net_revenue' => Decimal::subtract($sale->total_amount, $refund, Decimal::MONEY_SCALE),
            ];
            if ($canViewProfit) {
                $result['net_cogs'] = Decimal::subtract((string) ($sale->cogs_amount ?? '0'), (string) ($sale->cogs_reversed ?? '0'), Decimal::MONEY_SCALE);
                $result['net_gross_profit'] = Decimal::subtract((string) ($sale->gross_profit ?? '0'), (string) ($sale->gross_profit_reversed ?? '0'), Decimal::MONEY_SCALE);
            }

            return $result;
        });

        return Inertia::render('customer/sales/index', [
            'sales' => $sales, 'canViewProfit' => $canViewProfit,
            'canReturn' => $canReturn,
            'timezone' => $timezone,
            'filters' => [
                'search' => $search,
                'period' => $period,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'payment_method' => $paymentMethod,
                'customer' => $customer,
                'view' => $view,
                'from' => $from,
            ],
        ]);
    }

    public function show(Request $request, Sale $sale, CurrentStore $currentStore): Response
    {
        return Inertia::render('customer/sales/show', [
            ...$this->saleData($sale, $currentStore),
            'showReturnForm' => false,
            'openPrintDialog' => $request->boolean('print'),
        ]);
    }

    public function createReturn(Sale $sale, CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        Gate::authorize('manageSaleReturns', $store);

        return Inertia::render('customer/sales/return', [
            ...$this->saleData($sale, $currentStore),
            'showReturnForm' => true,
        ]);
    }

    public function paymentProof(Sale $sale, CurrentStore $currentStore): StreamedResponse
    {
        $store = $currentStore->get();
        Gate::authorize('viewSales', $store);
        abort_unless($sale->store_id === $store->id, 404);

        $path = DB::table('sale_payments')
            ->where('store_id', $store->id)
            ->where('sale_id', $sale->id)
            ->value('payment_proof_path');

        abort_unless(is_string($path) && Storage::disk('local')->exists($path), 404);

        $extension = pathinfo($path, PATHINFO_EXTENSION);

        return Storage::disk('local')->response(
            $path,
            "bukti-qris-{$sale->document_number}.{$extension}",
            ['Cache-Control' => 'private, no-store'],
        );
    }

    public function storeReturn(StoreSaleReturnRequest $request, Sale $sale, CurrentStore $currentStore, PostSaleReturn $action): RedirectResponse
    {
        $data = $request->validated();
        abort_unless($sale->store_id === $currentStore->id(), 404);
        $accountId = FinancialAccount::query()->where(['store_id' => $currentStore->id(), 'public_id' => $data['account_id']])->valueOrFail('id');
        $items = [];
        foreach ($data['items'] as $item) {
            $saleItemId = SaleItem::query()->where(['store_id' => $currentStore->id(), 'sale_id' => $sale->id, 'public_id' => $item['sale_item_id']])->valueOrFail('id');
            $items[] = ['sale_item_id' => $saleItemId, 'quantity' => $item['quantity']];
        }
        $action->handle($currentStore->get(), $this->actor($request), $sale->id, $accountId, $items, $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key'], $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Return and refund posted successfully.')]);

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

    /** @return array<string, mixed> */
    private function saleData(Sale $sale, CurrentStore $currentStore): array
    {
        $store = $currentStore->get();
        Gate::authorize('viewSales', $store);
        abort_unless($sale->store_id === $store->id, 404);
        $sale = Sale::query()->where(['sales.id' => $sale->id, 'sales.store_id' => $store->id])
            ->join('users', 'users.id', '=', 'sales.created_by_user_id')
            ->firstOrFail(['sales.*', 'users.name as cashier_name']);
        $returned = DB::table('sale_return_items')->select('sale_item_id')->selectRaw('SUM(quantity) as returned_quantity, SUM(refund_amount) as refunded_amount, SUM(cogs_reversed) as cogs_reversed')->where('store_id', $store->id)->groupBy('sale_item_id');
        $items = SaleItem::query()->where(['sale_items.store_id' => $store->id, 'sale_items.sale_id' => $sale->id])
            ->leftJoinSub($returned, 'returned', 'returned.sale_item_id', '=', 'sale_items.id')
            ->orderBy('sale_items.id')->get(['sale_items.*', DB::raw('COALESCE(returned.returned_quantity, 0) as returned_quantity'), DB::raw('COALESCE(returned.refunded_amount, 0) as refunded_amount')])
            ->map(fn (SaleItem $item): array => [
                ...$item->only(['public_id', 'product_name', 'sku', 'unit_name', 'unit_symbol', 'quantity', 'unit_price', 'gross_subtotal', 'item_discount_amount', 'allocated_transaction_discount', 'net_total', 'cogs_amount', 'gross_profit']),
                'returned_quantity' => (string) ($item->returned_quantity ?? '0'),
                'returnable_quantity' => Decimal::subtract($item->quantity, (string) ($item->returned_quantity ?? '0'), Decimal::QUANTITY_SCALE),
            ]);
        $payment = DB::table('sale_payments')->where(['sale_payments.store_id' => $store->id, 'sale_payments.sale_id' => $sale->id])
            ->join('financial_accounts', 'financial_accounts.id', '=', 'sale_payments.financial_account_id')
            ->first(['sale_payments.amount', 'sale_payments.tendered_amount', 'sale_payments.change_amount', 'sale_payments.payment_method', 'sale_payments.payment_proof_path', 'financial_accounts.name as account_name']);
        $returns = SaleReturn::query()->where(['sale_returns.store_id' => $store->id, 'sale_returns.sale_id' => $sale->id])
            ->join('financial_accounts', 'financial_accounts.id', '=', 'sale_returns.financial_account_id')
            ->latest('sale_returns.id')->get(['sale_returns.public_id', 'sale_returns.document_number', 'sale_returns.refund_amount', 'sale_returns.cogs_reversed', 'sale_returns.gross_profit_reversed', 'sale_returns.occurred_at', 'sale_returns.notes', 'financial_accounts.name as account_name']);
        $accounts = FinancialAccount::query()->where(['store_id' => $store->id, 'is_active' => true])->orderBy('name')->get(['public_id', 'name']);
        $canViewProfit = Gate::allows('manageOperations', $store);
        $storeSettings = $store->settings;
        if (! $canViewProfit) {
            $returns->each->makeHidden(['cogs_reversed', 'gross_profit_reversed']);
        }

        return [
            'sale' => $sale->only(['public_id', 'document_number', 'customer_name', 'customer_phone', 'subtotal', 'item_discount_amount', 'transaction_discount_amount', 'total_amount', 'paid_amount', 'change_amount', 'occurred_at', 'notes', 'cashier_name']),
            'items' => $items->map(function (array $item) use ($canViewProfit): array {
                if (! $canViewProfit) {
                    unset($item['cogs_amount'], $item['gross_profit']);
                }

                return $item;
            }),
            'payment' => [
                'amount' => $payment->amount,
                'tendered_amount' => $payment->tendered_amount,
                'change_amount' => $payment->change_amount,
                'payment_method' => $payment->payment_method,
                'account_name' => $payment->account_name,
                'proof_url' => $payment->payment_proof_path
                    ? route('sales.payment-proof', $sale)
                    : null,
            ],
            'returns' => $returns,
            'accounts' => $accounts,
            'canReturn' => Gate::allows('manageSaleReturns', $store),
            'canViewProfit' => $canViewProfit,
            'timezone' => $storeSettings->timezone ?? 'Asia/Jakarta',
            'receipt' => [
                'store_name' => $store->name,
                'address' => $storeSettings?->address,
                'header' => $storeSettings->receipt_header ?? __('Bukti penjualan'),
                'footer' => $storeSettings->receipt_footer ?? __('Terima kasih. Simpan struk ini untuk referensi retur.'),
                'paper_size' => $storeSettings->receipt_paper_size ?? '58mm',
                'show_address' => $storeSettings->receipt_show_address ?? true,
                'show_cashier' => $storeSettings->receipt_show_cashier ?? true,
            ],
        ];
    }
}
