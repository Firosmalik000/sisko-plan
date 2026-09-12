<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Requests\Api\V1\Finance\SaveExpenseCategoryRequest;
use App\Http\Resources\Api\V1\Finance\ExpenseCategoryResource;
use App\Http\Responses\ApiResponse;
use App\Models\ExpenseCategory;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * CRUD kategori pengeluaran store-scoped (Req 19.1). CRUD murni identitas (tanpa
 * ledger) → controller tipis + FormRequest + Resource + Eloquent. Baca `store.read`,
 * mutasi `finance.write`. DELETE = soft-deactivate menjaga referensi pengeluaran.
 */
class ExpenseCategoryController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $search = trim((string) $request->query('q', ''));

        $query = ExpenseCategory::query()
            ->where('store_id', $store->id)
            ->orderBy('name')
            ->orderBy('id');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $page = $query->cursorPaginate($this->resolveLimit($request));

        return ApiResponse::success([
            'expense_categories' => ExpenseCategoryResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    public function store(SaveExpenseCategoryRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'finance.write');

        $category = new ExpenseCategory($request->validated());
        $category->store_id = $store->id;
        $category->is_active = $request->boolean('is_active', true);
        $category->save();

        return ApiResponse::success(
            (new ExpenseCategoryResource($category))->resolve($request),
            status: 201,
        );
    }

    public function update(SaveExpenseCategoryRequest $request, Store $store, ExpenseCategory $expenseCategory): JsonResponse
    {
        $this->assertCan($request, 'finance.write');
        $this->assertBelongsTo($store, $expenseCategory);

        $expenseCategory->fill($request->validated());
        $expenseCategory->save();

        return ApiResponse::success((new ExpenseCategoryResource($expenseCategory))->resolve($request));
    }

    public function destroy(Request $request, Store $store, ExpenseCategory $expenseCategory): JsonResponse
    {
        $this->assertCan($request, 'finance.write');
        $this->assertBelongsTo($store, $expenseCategory);

        $expenseCategory->is_active = false;
        $expenseCategory->save();

        return ApiResponse::success((new ExpenseCategoryResource($expenseCategory))->resolve($request));
    }

    private function assertCan(Request $request, string $ability): void
    {
        if (! $request->user()->tokenCan($ability)) {
            throw new AccessDeniedHttpException("Ability {$ability} diperlukan.");
        }
    }

    private function assertBelongsTo(Store $store, ExpenseCategory $expenseCategory): void
    {
        if ($expenseCategory->store_id !== $store->id) {
            throw new NotFoundHttpException('Kategori pengeluaran tidak ditemukan.');
        }
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        return $limit < 1 ? self::DEFAULT_LIMIT : min($limit, self::MAX_LIMIT);
    }
}
