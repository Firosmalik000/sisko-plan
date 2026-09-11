<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Actions\MasterData\SaveProduct;
use App\Http\Requests\Api\V1\Products\SaveProductRequest;
use App\Http\Resources\Api\V1\ProductResource;
use App\Http\Responses\ApiResponse;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * POST/PATCH /stores/{store}/products[/{product}] — mutasi produk (design §3.2,
 * Req 10.3).
 *
 * Controller tipis: ability gate `product.write` (cashier tanpa ability → 403
 * FORBIDDEN), lalu delegasi ke `SaveProduct::handle` (REUSE — business logic
 * create/update tidak diduplikasi). Rilis ini mendukung produk single-unit tanpa
 * varian (lihat SaveProductRequest). Membership + tenant sudah divalidasi
 * middleware `store.membership`.
 */
class ProductMutationController
{
    public function __construct(private SaveProduct $saveProduct) {}

    public function store(SaveProductRequest $request, Store $store): JsonResponse
    {
        $this->assertCanWrite($request);

        $product = $this->saveProduct->handle(
            $request->user(),
            $store,
            $request->productData(),
            null,
            null,
            $request->ip(),
        );

        return $this->respond($request, $store, $product, 201);
    }

    public function update(SaveProductRequest $request, Store $store, string $product): JsonResponse
    {
        $this->assertCanWrite($request);

        $model = Product::query()
            ->where('store_id', $store->id)
            ->where('public_id', $product)
            ->firstOrFail();

        $saved = $this->saveProduct->handle(
            $request->user(),
            $store,
            $request->productData(),
            $model,
            null,
            $request->ip(),
        );

        return $this->respond($request, $store, $saved, 200);
    }

    private function assertCanWrite(SaveProductRequest $request): void
    {
        if (! $request->user()->tokenCan('product.write')) {
            throw new AccessDeniedHttpException('Ability product.write diperlukan.');
        }
    }

    private function respond(SaveProductRequest $request, Store $store, Product $product, int $status): JsonResponse
    {
        $product->load(['category:id,name', 'productUnits.unit:id,name', 'inventoryBalances']);

        return ApiResponse::success(
            (new ProductResource($product))->resolve($request),
            status: $status,
        );
    }
}
