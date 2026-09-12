<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Requests\Api\V1\Catalog\SaveUnitRequest;
use App\Http\Resources\Api\V1\Catalog\UnitResource;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * CRUD unit/satuan store-scoped (Req 10). Pola identik CategoryController:
 * CRUD murni, controller tipis, DELETE = soft-deactivate menjaga referensi
 * product unit. Baca `store.read`, mutasi `catalog.write`.
 */
class UnitController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $search = trim((string) $request->query('q', ''));

        $query = Unit::query()
            ->where('store_id', $store->id)
            ->orderBy('name')
            ->orderBy('id');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $page = $query->cursorPaginate($this->resolveLimit($request));

        return ApiResponse::success([
            'units' => UnitResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    public function store(SaveUnitRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'catalog.write');

        $unit = new Unit($request->validated());
        $unit->store_id = $store->id;
        $unit->is_active = $request->boolean('is_active', true);
        $unit->save();

        return ApiResponse::success(
            (new UnitResource($unit))->resolve($request),
            status: 201,
        );
    }

    public function update(SaveUnitRequest $request, Store $store, Unit $unit): JsonResponse
    {
        $this->assertCan($request, 'catalog.write');
        $this->assertBelongsTo($store, $unit);

        $unit->fill($request->validated());
        $unit->save();

        return ApiResponse::success((new UnitResource($unit))->resolve($request));
    }

    public function destroy(Request $request, Store $store, Unit $unit): JsonResponse
    {
        $this->assertCan($request, 'catalog.write');
        $this->assertBelongsTo($store, $unit);

        $unit->is_active = false;
        $unit->save();

        return ApiResponse::success((new UnitResource($unit))->resolve($request));
    }

    private function assertCan(Request $request, string $ability): void
    {
        if (! $request->user()->tokenCan($ability)) {
            throw new AccessDeniedHttpException("Ability {$ability} diperlukan.");
        }
    }

    private function assertBelongsTo(Store $store, Unit $unit): void
    {
        if ($unit->store_id !== $store->id) {
            throw new NotFoundHttpException('Unit tidak ditemukan.');
        }
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        return $limit < 1 ? self::DEFAULT_LIMIT : min($limit, self::MAX_LIMIT);
    }
}
