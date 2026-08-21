<?php

namespace App\Http\Controllers\MasterData;

use App\Actions\MasterData\SaveProduct;
use App\Http\Controllers\Controller;
use App\Http\Requests\MasterData\ProductRequest;
use App\Models\Category;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Unit;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProductController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore): Response
    {
        Gate::authorize('viewMasterData', $currentStore->get());
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();
        $products = Product::query()
            ->where('store_id', $currentStore->id())
            ->with([
                'category:id,public_id,name', 'baseUnit:id,public_id,name,symbol', 'largeUnit:id,public_id,name,symbol',
                'productUnits' => fn ($query) => $query->where('is_active', true)->with('unit:id,public_id,name,symbol'),
                'variants' => fn ($query) => $query->where('is_active', true)->with([
                    'productUnits' => fn ($units) => $units->where('is_active', true)->with('unit:id,public_id,name,symbol'),
                ]),
            ])
            ->when($search !== '', fn ($query) => $query->where(fn ($nested) => $nested->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%")->orWhere('barcode', 'like', "%{$search}%")))
            ->when(in_array($status, ['active', 'inactive'], true), fn ($query) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')->paginate(12)->withQueryString()
            ->through(fn (Product $product) => $this->serialize($product));

        return Inertia::render('master-data/products/index', [
            'products' => $products,
            'categories' => Category::query()
                ->where('store_id', $currentStore->id())
                ->orderBy('name')
                ->get(['public_id', 'name', 'is_active']),
            'units' => Unit::query()
                ->where('store_id', $currentStore->id())
                ->orderBy('unit_type')->orderBy('name')
                ->get(['public_id', 'name', 'symbol', 'unit_type', 'is_active']),
            'search' => $search,
            'status' => $status,
            'canManage' => Gate::allows('manageMasterData', $currentStore->get()),
        ]);
    }

    public function store(ProductRequest $request, CurrentStore $currentStore, SaveProduct $saveProduct): RedirectResponse
    {
        $saveProduct->handle(AuthenticatedUser::get($request), $currentStore->get(), $request->productData(), null, $request->file('photo'), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk berhasil ditambahkan.']);

        return back();
    }

    public function update(ProductRequest $request, CurrentStore $currentStore, SaveProduct $saveProduct, string $product): RedirectResponse
    {
        $model = Product::query()->where('store_id', $currentStore->id())->where('public_id', $product)->firstOrFail();
        $saveProduct->handle(AuthenticatedUser::get($request), $currentStore->get(), $request->productData(), $model, $request->file('photo'), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Produk berhasil diperbarui.']);

        return back();
    }

    public function photo(CurrentStore $currentStore, string $product): StreamedResponse
    {
        Gate::authorize('viewMasterData', $currentStore->get());
        $model = Product::query()->where('store_id', $currentStore->id())->where('public_id', $product)->firstOrFail();
        abort_unless($model->photo_path && Storage::disk('local')->exists($model->photo_path), 404);

        return Storage::disk('local')->response($model->photo_path, null, ['Cache-Control' => 'private, max-age=3600']);
    }

    /** @return array<string, mixed> */
    private function serialize(Product $product): array
    {
        $balances = InventoryBalance::query()->where('store_id', $product->store_id)->where('product_id', $product->id)->get();
        $variantBalances = $balances->whereNotNull('product_variant_id')->keyBy('product_variant_id');
        $basePrices = $product->productUnits()->whereNull('product_variant_id')->where('unit_id', $product->base_unit_id)->first(['purchase_price', 'selling_price']);
        $parentBalance = $balances->firstWhere('product_variant_id', null);

        return [
            ...$product->only(['public_id', 'name', 'sku', 'barcode', 'description', 'is_active']),
            'category' => $product->category?->only(['public_id', 'name']),
            'retail_unit_public_id' => $product->baseUnit->public_id,
            'large_unit_public_id' => $product->large_unit_id === null ? $product->baseUnit->public_id : $product->largeUnit->public_id,
            'variant_mode' => $product->variant_mode,
            'purchase_price' => $basePrices === null ? '0.0000' : $basePrices->purchase_price,
            'selling_price' => $basePrices === null ? '0.0000' : $basePrices->selling_price,
            'current_stock' => $parentBalance === null ? '0.000000' : $parentBalance->quantity,
            'minimum_stock' => $parentBalance === null ? '0.000000' : $parentBalance->minimum_quantity,
            'photo_url' => $product->photo_path ? route('master-data.products.photo', $product->public_id) : null,
            'variants' => $product->variants->map(function (ProductVariant $variant) use ($variantBalances, $product): array {
                $unit = $variant->productUnits()->where('is_active', true)->first(['purchase_price', 'selling_price', 'conversion_factor']);
                $balance = $variantBalances->get($variant->id);

                return [
                    'public_id' => $variant->public_id,
                    'name' => $variant->name,
                    'purchase_price' => $unit === null ? '0.0000' : $unit->purchase_price,
                    'selling_price' => $unit === null ? '0.0000' : $unit->selling_price,
                    'conversion_factor' => $unit === null ? '1.000000' : $unit->conversion_factor,
                    'current_stock' => $product->variant_mode === 'separate' ? ($balance === null ? '0.000000' : $balance->quantity) : null,
                    'minimum_stock' => $product->variant_mode === 'separate' ? ($balance === null ? '0.000000' : $balance->minimum_quantity) : null,
                ];
            })->values(),
        ];
    }
}
