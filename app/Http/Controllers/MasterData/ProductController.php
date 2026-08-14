<?php

namespace App\Http\Controllers\MasterData;

use App\Actions\MasterData\SaveProduct;
use App\Http\Controllers\Controller;
use App\Http\Requests\MasterData\ProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        Gate::authorize('viewMasterData', $currentStore->get());
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $products = Product::query()
            ->where('store_id', $currentStore->id())
            ->with(['category:id,public_id,name', 'baseUnit:id,public_id,name,symbol', 'productUnits' => fn ($query) => $query->where('is_active', true)->with('unit:id,public_id,name,symbol')])
            ->when($search !== '', fn ($query) => $query->where(fn ($nested) => $nested->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%")->orWhere('barcode', 'like', "%{$search}%")))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')->paginate(12)->withQueryString()
            ->through(fn (Product $product) => $this->serialize($product));

        return Inertia::render('master-data/products/index', [
            'products' => $products,
            'categories' => Category::query()
                ->where('store_id', $currentStore->id())
                ->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->orWhereHas('products', fn ($products) => $products->where('store_id', $currentStore->id())))
                ->orderBy('name')
                ->get(['public_id', 'name', 'is_active']),
            'units' => Unit::query()
                ->where('store_id', $currentStore->id())
                ->where(fn ($query) => $query
                    ->where('is_active', true)
                    ->orWhereHas('productUnits', fn ($productUnits) => $productUnits
                        ->where('store_id', $currentStore->id())
                        ->where('is_active', true)))
                ->orderBy('name')
                ->get(['public_id', 'name', 'symbol', 'is_active']),
            'search' => $search,
            'status' => $status,
            'canManage' => Gate::allows('manageMasterData', $currentStore->get()),
        ]);
    }

    public function store(ProductRequest $request, CurrentStore $currentStore, SaveProduct $saveProduct): RedirectResponse
    {
        $saveProduct->handle(AuthenticatedUser::get($request), $currentStore->get(), $request->productData(), null, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk berhasil ditambahkan.']);

        return back();
    }

    public function update(ProductRequest $request, CurrentStore $currentStore, SaveProduct $saveProduct, string $product): RedirectResponse
    {
        $model = Product::query()->where('store_id', $currentStore->id())->where('public_id', $product)->firstOrFail();
        $saveProduct->handle(AuthenticatedUser::get($request), $currentStore->get(), $request->productData(), $model, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk berhasil diperbarui.']);

        return back();
    }

    /** @return array<string, mixed> */
    private function serialize(Product $product): array
    {
        return [
            ...$product->only(['public_id', 'name', 'sku', 'barcode', 'description', 'is_active']),
            'category' => $product->category?->only(['public_id', 'name']),
            'base_unit_public_id' => $product->baseUnit->public_id,
            'units' => $product->productUnits->map(fn ($item) => [
                'unit_public_id' => $item->unit->public_id,
                'name' => $item->unit->name,
                'symbol' => $item->unit->symbol,
                'conversion_factor' => $item->conversion_factor,
                'purchase_price' => $item->purchase_price,
                'selling_price' => $item->selling_price,
            ])->values(),
        ];
    }
}
