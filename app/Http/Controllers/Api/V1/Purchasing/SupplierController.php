<?php

namespace App\Http\Controllers\Api\V1\Purchasing;

use App\Http\Requests\Api\V1\Purchasing\SaveSupplierRequest;
use App\Http\Resources\Api\V1\Purchasing\SupplierResource;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * CRUD supplier privat toko store-scoped (Req 12). CRUD murni, controller tipis.
 * Baca `store.read`, mutasi `purchasing.write`. DELETE = soft-deactivate menjaga
 * referensi kulakan & hutang (Req 12.3).
 */
class SupplierController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $search = trim((string) $request->query('q', ''));

        $query = Supplier::query()
            ->where('store_id', $store->id)
            ->orderBy('name')
            ->orderBy('id');

        if ($search !== '') {
            $query->where(function ($scope) use ($search): void {
                $scope->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $page = $query->cursorPaginate($this->resolveLimit($request));

        return ApiResponse::success([
            'suppliers' => SupplierResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    public function store(SaveSupplierRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'purchasing.write');

        $supplier = new Supplier($request->validated());
        $supplier->store_id = $store->id;
        $supplier->is_active = $request->boolean('is_active', true);
        $supplier->save();

        return ApiResponse::success(
            (new SupplierResource($supplier))->resolve($request),
            status: 201,
        );
    }

    public function update(SaveSupplierRequest $request, Store $store, Supplier $supplier): JsonResponse
    {
        $this->assertCan($request, 'purchasing.write');
        $this->assertBelongsTo($store, $supplier);

        $supplier->fill($request->validated());
        $supplier->save();

        return ApiResponse::success((new SupplierResource($supplier))->resolve($request));
    }

    public function destroy(Request $request, Store $store, Supplier $supplier): JsonResponse
    {
        $this->assertCan($request, 'purchasing.write');
        $this->assertBelongsTo($store, $supplier);

        $supplier->is_active = false;
        $supplier->save();

        return ApiResponse::success((new SupplierResource($supplier))->resolve($request));
    }

    private function assertCan(Request $request, string $ability): void
    {
        if (! $request->user()->tokenCan($ability)) {
            throw new AccessDeniedHttpException("Ability {$ability} diperlukan.");
        }
    }

    private function assertBelongsTo(Store $store, Supplier $supplier): void
    {
        if ($supplier->store_id !== $store->id) {
            throw new NotFoundHttpException('Supplier tidak ditemukan.');
        }
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        return $limit < 1 ? self::DEFAULT_LIMIT : min($limit, self::MAX_LIMIT);
    }
}
