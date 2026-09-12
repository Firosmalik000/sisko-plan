<?php

namespace App\Http\Controllers\Api\V1\Catalog;

use App\Http\Requests\Api\V1\Catalog\SaveCategoryRequest;
use App\Http\Resources\Api\V1\Catalog\CategoryResource;
use App\Http\Responses\ApiResponse;
use App\Models\Category;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * CRUD kategori produk store-scoped (Req 9).
 *
 * CRUD murni tanpa logika ledger → controller tipis + FormRequest + Resource +
 * Eloquent langsung (tidak ada Action untuk dihindari duplikasi; membuat Action
 * set-satu-kolom justru over-abstraction). Baca butuh `store.read`, mutasi butuh
 * `catalog.write` (cashier baca-saja). DELETE = soft-deactivate menjaga referensi
 * produk. Membership + tenant divalidasi middleware `store.membership`.
 */
class CategoryController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $search = trim((string) $request->query('q', ''));

        $query = Category::query()
            ->where('store_id', $store->id)
            ->orderBy('name')
            ->orderBy('id');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $page = $query->cursorPaginate($this->resolveLimit($request));

        return ApiResponse::success([
            'categories' => CategoryResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    public function store(SaveCategoryRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'catalog.write');

        $category = new Category($request->validated());
        $category->store_id = $store->id;
        $category->is_active = $request->boolean('is_active', true);
        $category->save();

        return ApiResponse::success(
            (new CategoryResource($category))->resolve($request),
            status: 201,
        );
    }

    public function update(SaveCategoryRequest $request, Store $store, Category $category): JsonResponse
    {
        $this->assertCan($request, 'catalog.write');
        $this->assertBelongsTo($store, $category);

        $category->fill($request->validated());
        $category->save();

        return ApiResponse::success((new CategoryResource($category))->resolve($request));
    }

    /**
     * DELETE = soft-deactivate (`is_active=false`) untuk menjaga referensi produk
     * (Req 9.3). Tidak menghapus baris.
     */
    public function destroy(Request $request, Store $store, Category $category): JsonResponse
    {
        $this->assertCan($request, 'catalog.write');
        $this->assertBelongsTo($store, $category);

        $category->is_active = false;
        $category->save();

        return ApiResponse::success((new CategoryResource($category))->resolve($request));
    }

    private function assertCan(Request $request, string $ability): void
    {
        if (! $request->user()->tokenCan($ability)) {
            throw new AccessDeniedHttpException("Ability {$ability} diperlukan.");
        }
    }

    /**
     * Tenant isolation tambahan: pastikan entitas milik store pada route,
     * meski route model binding sudah men-resolve by public_id global.
     */
    private function assertBelongsTo(Store $store, Category $category): void
    {
        if ($category->store_id !== $store->id) {
            throw new NotFoundHttpException('Kategori tidak ditemukan.');
        }
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        return $limit < 1 ? self::DEFAULT_LIMIT : min($limit, self::MAX_LIMIT);
    }
}
