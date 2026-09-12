<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Http\Requests\Api\V1\Finance\SaveFinancialAccountRequest;
use App\Http\Resources\Api\V1\Finance\FinancialAccountDetailResource;
use App\Http\Responses\ApiResponse;
use App\Models\FinancialAccount;
use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * CRUD akun keuangan store-scoped + saldo (Req 13). CRUD murni untuk identitas
 * akun (saldo dimutasi lewat ledger action terpisah). Baca `store.read`, mutasi
 * `finance.write`. DELETE = soft-deactivate menjaga referensi ledger (Req 13.3).
 *
 * Saldo dibaca via leftJoin ke `financial_account_balances` (pola konsisten
 * dengan LedgerController/ExpenseController web) sehingga selalu string decimal.
 */
class FinancialAccountController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $search = trim((string) $request->query('q', ''));

        $query = $this->baseQuery($store)->orderBy('financial_accounts.name');

        if ($search !== '') {
            $query->where('financial_accounts.name', 'like', "%{$search}%");
        }

        $page = $query->cursorPaginate(
            $this->resolveLimit($request),
            ['*'],
            'cursor',
        );

        return ApiResponse::success([
            'accounts' => FinancialAccountDetailResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    public function store(SaveFinancialAccountRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'finance.write');

        $account = new FinancialAccount($request->validated());
        $account->store_id = $store->id;
        $account->is_active = $request->boolean('is_active', true);
        $account->save();

        return ApiResponse::success(
            (new FinancialAccountDetailResource($account))->resolve($request),
            status: 201,
        );
    }

    public function update(SaveFinancialAccountRequest $request, Store $store, FinancialAccount $account): JsonResponse
    {
        $this->assertCan($request, 'finance.write');
        $this->assertBelongsTo($store, $account);

        $account->fill($request->validated());
        $account->save();

        return ApiResponse::success((new FinancialAccountDetailResource($this->withBalance($store, $account)))->resolve($request));
    }

    public function destroy(Request $request, Store $store, FinancialAccount $account): JsonResponse
    {
        $this->assertCan($request, 'finance.write');
        $this->assertBelongsTo($store, $account);

        $account->is_active = false;
        $account->save();

        return ApiResponse::success((new FinancialAccountDetailResource($this->withBalance($store, $account)))->resolve($request));
    }

    /**
     * @return Builder<FinancialAccount>
     */
    private function baseQuery(Store $store): Builder
    {
        return FinancialAccount::query()
            ->where('financial_accounts.store_id', $store->id)
            ->leftJoin('financial_account_balances', function ($join) use ($store): void {
                $join->on('financial_account_balances.financial_account_id', '=', 'financial_accounts.id')
                    ->where('financial_account_balances.store_id', $store->id);
            })
            ->select([
                'financial_accounts.*',
                DB::raw('COALESCE(financial_account_balances.balance, 0) as balance'),
            ]);
    }

    private function withBalance(Store $store, FinancialAccount $account): FinancialAccount
    {
        return $this->baseQuery($store)
            ->where('financial_accounts.id', $account->id)
            ->firstOrFail();
    }

    private function assertCan(Request $request, string $ability): void
    {
        if (! $request->user()->tokenCan($ability)) {
            throw new AccessDeniedHttpException("Ability {$ability} diperlukan.");
        }
    }

    private function assertBelongsTo(Store $store, FinancialAccount $account): void
    {
        if ($account->store_id !== $store->id) {
            throw new NotFoundHttpException('Akun keuangan tidak ditemukan.');
        }
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        return $limit < 1 ? self::DEFAULT_LIMIT : min($limit, self::MAX_LIMIT);
    }
}
