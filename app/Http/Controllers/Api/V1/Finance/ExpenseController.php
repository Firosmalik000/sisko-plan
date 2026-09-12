<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Actions\Expenses\PostExpense;
use App\Http\Requests\Api\V1\Finance\StoreExpenseRequest;
use App\Http\Resources\Api\V1\Finance\ExpenseResource;
use App\Http\Responses\ApiResponse;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FinancialAccount;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Pengeluaran store-scoped (Req 19.3–19.5). List = cursor pagination (baca
 * `store.read`); create = REUSE `PostExpense` (kurangi saldo akun + ledger +
 * idempotensi, ability `finance.write`). Nominal string decimal scale 4. Saldo
 * kurang → `ValidationException` (surfaced 422 VALIDATION_ERROR).
 */
class ExpenseController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function __construct(private PostExpense $postExpense) {}

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $page = Expense::query()
            ->where('store_id', $store->id)
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->cursorPaginate($this->resolveLimit($request));

        return ApiResponse::success([
            'expenses' => ExpenseResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    public function store(StoreExpenseRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'finance.write');
        $validated = $request->validated();

        $expense = $this->postExpense->handle(
            store: $store,
            actor: $request->user(),
            categoryId: $this->resolveCategoryId($store, $validated['category_public_id']),
            accountId: $this->resolveAccountId($store, $validated['account_public_id']),
            amount: (string) $validated['amount'],
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) $validated['idempotency_key'],
            ipAddress: $request->ip(),
        );

        return ApiResponse::success(
            (new ExpenseResource($expense))->resolve($request),
            status: 201,
        );
    }

    private function resolveCategoryId(Store $store, string $publicId): int
    {
        $category = ExpenseCategory::query()
            ->where('store_id', $store->id)
            ->where('public_id', $publicId)
            ->first();

        if ($category === null) {
            throw new NotFoundHttpException('Kategori pengeluaran tidak ditemukan.');
        }

        return $category->id;
    }

    private function resolveAccountId(Store $store, string $publicId): int
    {
        $account = FinancialAccount::query()
            ->where('store_id', $store->id)
            ->where('public_id', $publicId)
            ->first();

        if ($account === null) {
            throw new NotFoundHttpException('Akun keuangan tidak ditemukan.');
        }

        return $account->id;
    }

    private function assertCan(Request $request, string $ability): void
    {
        if (! $request->user()->tokenCan($ability)) {
            throw new AccessDeniedHttpException("Ability {$ability} diperlukan.");
        }
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        return $limit < 1 ? self::DEFAULT_LIMIT : min($limit, self::MAX_LIMIT);
    }
}
