<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Actions\Sales\PostSaleReturn;
use App\Http\Requests\Api\V1\Sales\StoreSaleReturnRequest;
use App\Http\Resources\Api\V1\Sales\SaleReturnResource;
use App\Http\Responses\ApiResponse;
use App\Models\FinancialAccount;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * POST /stores/{store}/sales/{sale}/returns — retur/reversal penjualan (Req 17.6,
 * 17.7).
 *
 * Controller tipis: ability gate `sale.reconcile` (owner), resolve identifier
 * publik (sale + account + sale item) → id internal, delegasi ke
 * `PostSaleReturn::handle` (REUSE — perhitungan refund/COGS, ledger, stock
 * movement, idempotency tidak diduplikasi). Penjualan yang sudah diterima server
 * bersifat immutable dan hanya dapat dikoreksi lewat retur (Req 17.7).
 */
class SaleReturnController
{
    public function __construct(private PostSaleReturn $postSaleReturn) {}

    public function __invoke(StoreSaleReturnRequest $request, Store $store, string $sale): JsonResponse
    {
        if (! $request->user()->tokenCan('sale.reconcile')) {
            throw new AccessDeniedHttpException('Ability sale.reconcile diperlukan.');
        }

        $validated = $request->validated();

        $saleModel = Sale::query()
            ->where('store_id', $store->id)
            ->where('public_id', $sale)
            ->firstOrFail();

        $account = FinancialAccount::query()
            ->where('store_id', $store->id)
            ->where('public_id', $validated['account_public_id'])
            ->where('is_active', true)
            ->firstOrFail();

        $saleReturn = $this->postSaleReturn->handle(
            store: $store,
            actor: $request->user(),
            saleId: $saleModel->id,
            accountId: $account->id,
            items: $this->resolveItems($store, $saleModel->id, $validated['items']),
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) $validated['client_operation_id'],
            ipAddress: $request->ip(),
        );

        return ApiResponse::success(
            (new SaleReturnResource($saleReturn))->resolve($request),
            status: 201,
        );
    }

    /**
     * Resolusi item retur: `sale_item_public_id` (ULID) → id internal, dipastikan
     * milik store + dokumen sale ini (tenant isolation).
     *
     * @param  array<int, array{sale_item_public_id:string, quantity:string}>  $items
     * @return array<int, array{sale_item_id:int, quantity:string}>
     */
    private function resolveItems(Store $store, int $saleId, array $items): array
    {
        return array_map(function (array $item) use ($store, $saleId): array {
            $saleItem = SaleItem::query()
                ->where('store_id', $store->id)
                ->where('sale_id', $saleId)
                ->where('public_id', $item['sale_item_public_id'])
                ->first();

            if ($saleItem === null) {
                throw new NotFoundHttpException('Item penjualan tidak ditemukan pada dokumen ini.');
            }

            return [
                'sale_item_id' => $saleItem->id,
                'quantity' => (string) $item['quantity'],
            ];
        }, $items);
    }
}
