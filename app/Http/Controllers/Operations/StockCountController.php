<?php

namespace App\Http\Controllers\Operations;

use App\Actions\Inventory\PostStockCount;
use App\Actions\Inventory\StartStockCount;
use App\Actions\Inventory\UpdateStockCount;
use App\Enums\StockCountFrequency;
use App\Http\Controllers\Controller;
use App\Http\Requests\Operations\CompleteStockCountRequest;
use App\Http\Requests\Operations\ManageStockCountRequest;
use App\Http\Requests\Operations\SaveStockCountRequest;
use App\Http\Requests\Operations\StartStockCountRequest;
use App\Models\StockCount;
use App\Models\User;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use LogicException;

class StockCountController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewOperations', $store);

        $frequency = $request->query('frequency');
        $month = $request->query('month');
        $year = $request->query('year');

        $query = StockCount::query()
            ->where('store_id', $store->id)
            ->with('creator:id,display_name')
            ->withCount('items')
            ->withCount(['items as counted_items_count' => fn ($query) => $query->whereNotNull('counted_quantity')])
            ->withCount(['items as discrepancy_items_count' => fn ($query) => $query->where('difference_quantity', '!=', 0)])
            ->latest('id');

        if ($frequency !== null && StockCountFrequency::tryFrom($frequency) !== null) {
            $query->where('frequency', $frequency);
        }

        if ($month !== null && is_numeric($month) && $month >= 1 && $month <= 12) {
            $query->whereMonth('created_at', (int) $month);
        }

        if ($year !== null && is_numeric($year) && strlen($year) === 4) {
            $query->whereYear('created_at', (int) $year);
        }

        $counts = $query
            ->paginate(20)
            ->withQueryString()
            ->through(fn (StockCount $count): array => [
                'public_id' => $count->public_id,
                'document_number' => $count->document_number,
                'status' => $count->status->value,
                'frequency' => $count->frequency?->value,
                'snapshot_at' => $count->snapshot_at->toISOString(),
                'created_at' => $count->created_at->toISOString(),
                'created_by' => $count->creator?->display_name,
                'items_count' => $count->items_count,
                'counted_items_count' => $count->counted_items_count,
                'discrepancy_items_count' => $count->discrepancy_items_count,
            ]);

        // Collect available years from existing records (cross-DB compatible)
        $availableYears = StockCount::query()
            ->where('store_id', $store->id)
            ->orderByDesc('created_at')
            ->get(['created_at'])
            ->map(fn (StockCount $sc): int => $sc->created_at->year)
            ->unique()
            ->values()
            ->all();

        return Inertia::render('customer/operations/stock-opnames/index', [
            'counts' => $counts,
            'canManage' => Gate::allows('manageStockCounts', $store),
            'timezone' => $store->settings()->value('timezone') ?? 'Asia/Jakarta',
            'filters' => [
                'frequency' => $frequency,
                'month' => $month,
                'year' => $year,
            ],
            'availableYears' => $availableYears,
        ]);
    }

    public function store(StartStockCountRequest $request, CurrentStore $currentStore, StartStockCount $action): RedirectResponse
    {
        $frequency = $request->validated('frequency')
            ? StockCountFrequency::from($request->validated('frequency'))
            : null;

        $stockCount = $action->handle(
            $currentStore->get(),
            $this->actor($request),
            $request->validated('notes'),
            $request->ip(),
            $frequency,
        );
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Stock count session started successfully.')]);

        return to_route('operations.stock-opnames.show', $stockCount);
    }

    public function show(Request $request, CurrentStore $currentStore, StockCount $stockCount): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewOperations', $store);
        $stockCount = $this->scoped($currentStore, $stockCount);
        $stockCount->load(['creator:id,display_name', 'completer:id,display_name', 'poster:id,display_name']);

        $items = DB::table('stock_count_items')
            ->where('stock_count_items.store_id', $store->id)
            ->where('stock_count_items.stock_count_id', $stockCount->id)
            ->join('products', 'products.id', '=', 'stock_count_items.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'stock_count_items.product_variant_id')
            ->leftJoin('product_units', function ($join): void {
                $join->on('product_units.product_id', '=', 'stock_count_items.product_id')
                    ->on(function ($identity): void {
                        $identity->on('product_units.product_variant_id', '=', 'stock_count_items.product_variant_id')
                            ->orWhere(fn ($query) => $query->whereNull('product_units.product_variant_id')->whereNull('stock_count_items.product_variant_id'));
                    })
                    ->where('product_units.is_active', true)
                    ->whereRaw('(product_units.product_variant_id IS NOT NULL OR product_units.unit_id = products.base_unit_id)');
            })
            ->join('units', 'units.id', '=', 'products.base_unit_id')
            ->leftJoin('inventory_balances', function ($join) use ($store): void {
                $join->on('inventory_balances.product_id', '=', 'products.id')
                    ->on(function ($identity): void {
                        $identity->on('inventory_balances.product_variant_id', '=', 'stock_count_items.product_variant_id')
                            ->orWhere(fn ($query) => $query->whereNull('inventory_balances.product_variant_id')->whereNull('stock_count_items.product_variant_id'));
                    })
                    ->where('inventory_balances.store_id', $store->id);
            })
            ->orderBy('products.name')->orderBy('product_variants.name')
            ->get([
                DB::raw('COALESCE(product_variants.public_id, products.public_id) as product_id'), 'products.name', 'product_units.sku', 'product_units.barcode',
                'product_variants.name as variant_name', DB::raw('CASE WHEN product_variants.id IS NULL THEN NULL ELSE products.name END as parent_name'), 'units.symbol as unit',
                'stock_count_items.system_quantity', 'stock_count_items.counted_quantity',
                'stock_count_items.difference_quantity', 'stock_count_items.snapshot_unit_cost',
                DB::raw('COALESCE(inventory_balances.quantity, 0) as current_quantity'),
            ]);

        return Inertia::render('customer/operations/stock-opnames/show', [
            'stockCount' => [
                'public_id' => $stockCount->public_id,
                'document_number' => $stockCount->document_number,
                'status' => $stockCount->status->value,
                'frequency' => $stockCount->frequency?->value,
                'snapshot_at' => $stockCount->snapshot_at->toISOString(),
                'created_at' => $stockCount->created_at->toISOString(),
                'completed_at' => $stockCount->completed_at?->toISOString(),
                'posted_at' => $stockCount->posted_at?->toISOString(),
                'notes' => $stockCount->notes,
                'created_by' => $stockCount->creator?->display_name,
                'completed_by' => $stockCount->completer?->display_name,
                'posted_by' => $stockCount->poster?->display_name,
                'items' => $items,
            ],
            'canCount' => Gate::allows('countStock', $store),
            'canManage' => Gate::allows('manageStockCounts', $store),
            'timezone' => $store->settings()->value('timezone') ?? 'Asia/Jakarta',
        ]);
    }

    public function update(SaveStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, UpdateStockCount $action): RedirectResponse
    {
        $action->save($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->validated('items'), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Count result saved successfully.')]);

        return back();
    }

    public function complete(CompleteStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, UpdateStockCount $action): RedirectResponse
    {
        $action->complete($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Counting completed and ready for review.')]);

        return back();
    }

    public function reopen(ManageStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, UpdateStockCount $action): RedirectResponse
    {
        $action->reopen($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Stock count reopened successfully.')]);

        return back();
    }

    public function cancel(ManageStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, UpdateStockCount $action): RedirectResponse
    {
        $action->cancel($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Stock count cancelled successfully.')]);

        return to_route('operations.stock-opnames.index');
    }

    public function post(ManageStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, PostStockCount $action): RedirectResponse
    {
        $action->handle($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Stock count result posted to inventory successfully.')]);

        return back();
    }

    private function scoped(CurrentStore $currentStore, StockCount $stockCount): StockCount
    {
        return StockCount::query()->where(['id' => $stockCount->id, 'store_id' => $currentStore->id()])->firstOrFail();
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
