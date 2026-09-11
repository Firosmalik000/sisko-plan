<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Http\Resources\Api\V1\FinancialAccountResource;
use App\Http\Resources\Api\V1\ProductUnitResource;
use App\Http\Responses\ApiResponse;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Support\Sync\StoreCatalogSnapshot;
use App\Support\Sync\SyncCursor;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * GET /stores/{store}/sync/pull?cursor= — delta perubahan sejak cursor
 * (design §3.2, §5.3, Req 7.1, 24.3).
 *
 * Mengembalikan `{ changes, tombstones, next_cursor }`. Delta dihitung per-stream
 * dengan filter `updated_at > watermark` (strict) sehingga re-apply cursor yang
 * sama = no-op (idempotent) dan cursor bergerak monoton maju. Semua query
 * store-scoped (tenant isolation). Tanpa soft-delete: item nonaktif tidak
 * menghasilkan tombstone melainkan hadir sebagai perubahan dengan `is_active=false`;
 * `tombstones` dikembalikan sebagai daftar minimal (kosong) untuk rilis ini agar
 * kontrak klien stabil.
 */
class SyncPullController
{
    public function __construct(private StoreCatalogSnapshot $snapshot) {}

    public function __invoke(Request $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }

        $cursor = SyncCursor::decode($request->query('cursor'));

        $productUnits = $this->snapshot->productUnits(
            $store,
            $cursor->watermarkFor('product_units'),
        );

        $accounts = $this->financialAccountsSince(
            $store,
            $cursor->watermarkFor('financial_accounts'),
        );

        $nextCursor = $cursor
            ->advance('product_units', $this->maxUpdatedAt($productUnits->pluck('updated_at')))
            ->advance('financial_accounts', $this->maxUpdatedAt($accounts->pluck('updated_at')));

        return ApiResponse::success([
            'changes' => [
                'product_units' => ProductUnitResource::collection($productUnits)->resolve($request),
                'financial_accounts' => FinancialAccountResource::collection($accounts)->resolve($request),
            ],
            'tombstones' => [
                'product_units' => [],
                'financial_accounts' => [],
            ],
            'next_cursor' => $nextCursor->encode(),
        ]);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, FinancialAccount>
     */
    private function financialAccountsSince(Store $store, ?CarbonImmutable $since): \Illuminate\Database\Eloquent\Collection
    {
        $query = FinancialAccount::query()
            ->where('store_id', $store->id)
            ->orderBy('updated_at')
            ->orderBy('id');

        if ($since !== null) {
            $query->where('updated_at', '>', $since);
        }

        return $query->get();
    }

    /**
     * @param  Collection<int, mixed>  $timestamps
     */
    private function maxUpdatedAt(Collection $timestamps): ?CarbonImmutable
    {
        $max = $timestamps
            ->filter(fn (mixed $value): bool => $value !== null)
            ->map(fn (mixed $value): CarbonImmutable => CarbonImmutable::parse((string) $value))
            ->sort()
            ->last();

        return $max instanceof CarbonImmutable ? $max : null;
    }
}
