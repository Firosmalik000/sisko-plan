<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Resources\Api\V1\Sales\SaleDetailResource;
use App\Http\Responses\ApiResponse;
use App\Models\Sale;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * GET /stores/{store}/sales/{sale} — detail penjualan untuk reprint (design §3.6,
 * Req 12.9).
 *
 * Controller tipis: ability gate `store.read` + resolusi sale by `public_id`
 * scoped store (tenant isolation: sale toko lain → 404) + serialisasi lengkap
 * via SaleDetailResource (items, payment, customer, totals) agar struk dapat
 * dicetak ulang dari snapshot server. Membership + tenant sudah divalidasi
 * middleware `store.membership`.
 */
class SaleShowController
{
    public function __invoke(Request $request, Store $store, string $sale): JsonResponse
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }

        $model = Sale::query()
            ->where('store_id', $store->id)
            ->where('public_id', $sale)
            ->with(['items', 'payments'])
            ->firstOrFail();

        return ApiResponse::success(
            (new SaleDetailResource($model))->resolve($request),
        );
    }
}
