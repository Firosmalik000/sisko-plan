<?php

namespace App\Http\Controllers\Operations;

use App\Actions\Inventory\PostStockCount;
use App\Actions\Inventory\StartStockCount;
use App\Actions\Inventory\UpdateStockCount;
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

        $counts = StockCount::query()
            ->where('store_id', $store->id)
            ->with('creator:id,name')
            ->withCount('items')
            ->withCount(['items as counted_items_count' => fn ($query) => $query->whereNotNull('counted_quantity')])
            ->withCount(['items as discrepancy_items_count' => fn ($query) => $query->where('difference_quantity', '!=', 0)])
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (StockCount $count): array => [
                'public_id' => $count->public_id,
                'document_number' => $count->document_number,
                'status' => $count->status->value,
                'snapshot_at' => $count->snapshot_at->toISOString(),
                'created_by' => $count->creator?->name,
                'items_count' => $count->items_count,
                'counted_items_count' => $count->counted_items_count,
                'discrepancy_items_count' => $count->discrepancy_items_count,
            ]);

        return Inertia::render('operations/stock-opnames/index', [
            'counts' => $counts,
            'canManage' => Gate::allows('manageStockCounts', $store),
            'timezone' => $store->settings()->value('timezone') ?? 'Asia/Jakarta',
        ]);
    }

    public function store(StartStockCountRequest $request, CurrentStore $currentStore, StartStockCount $action): RedirectResponse
    {
        $stockCount = $action->handle($currentStore->get(), $this->actor($request), $request->validated('notes'), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sesi stock opname berhasil dimulai.']);

        return to_route('operations.stock-opnames.show', $stockCount);
    }

    public function show(Request $request, CurrentStore $currentStore, StockCount $stockCount): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewOperations', $store);
        $stockCount = $this->scoped($currentStore, $stockCount);
        $stockCount->load(['creator:id,name', 'completer:id,name', 'poster:id,name']);

        $items = DB::table('stock_count_items')
            ->where('stock_count_items.store_id', $store->id)
            ->where('stock_count_items.stock_count_id', $stockCount->id)
            ->join('products', 'products.id', '=', 'stock_count_items.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'stock_count_items.product_variant_id')
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
                DB::raw('COALESCE(product_variants.public_id, products.public_id) as product_id'), 'products.name', 'products.sku', 'products.barcode',
                'product_variants.name as variant_name', DB::raw('CASE WHEN product_variants.id IS NULL THEN NULL ELSE products.name END as parent_name'), 'units.symbol as unit',
                'stock_count_items.system_quantity', 'stock_count_items.counted_quantity',
                'stock_count_items.difference_quantity', 'stock_count_items.snapshot_unit_cost',
                DB::raw('COALESCE(inventory_balances.quantity, 0) as current_quantity'),
            ]);

        return Inertia::render('operations/stock-opnames/show', [
            'stockCount' => [
                'public_id' => $stockCount->public_id,
                'document_number' => $stockCount->document_number,
                'status' => $stockCount->status->value,
                'snapshot_at' => $stockCount->snapshot_at->toISOString(),
                'completed_at' => $stockCount->completed_at?->toISOString(),
                'posted_at' => $stockCount->posted_at?->toISOString(),
                'notes' => $stockCount->notes,
                'created_by' => $stockCount->creator?->name,
                'completed_by' => $stockCount->completer?->name,
                'posted_by' => $stockCount->poster?->name,
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
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Hasil hitung berhasil disimpan.']);

        return back();
    }

    public function complete(CompleteStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, UpdateStockCount $action): RedirectResponse
    {
        $action->complete($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Penghitungan selesai dan siap diperiksa.']);

        return back();
    }

    public function reopen(ManageStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, UpdateStockCount $action): RedirectResponse
    {
        $action->reopen($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Stock opname dibuka kembali.']);

        return back();
    }

    public function cancel(ManageStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, UpdateStockCount $action): RedirectResponse
    {
        $action->cancel($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Stock opname dibatalkan.']);

        return to_route('operations.stock-opnames.index');
    }

    public function post(ManageStockCountRequest $request, CurrentStore $currentStore, StockCount $stockCount, PostStockCount $action): RedirectResponse
    {
        $action->handle($currentStore->get(), $this->scoped($currentStore, $stockCount), $this->actor($request), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Hasil stock opname berhasil diposting ke persediaan.']);

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
