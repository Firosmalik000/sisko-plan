<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Actions\Sales\PostSale;
use App\Http\Requests\Api\V1\Sales\StoreSaleRequest;
use App\Http\Resources\Api\V1\Sales\SaleDetailResource;
use App\Http\Responses\ApiResponse;
use App\Models\FinancialAccount;
use App\Models\ProductUnit;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * POST /stores/{store}/sales — online sale langsung (design §3.6, Req 12.6, 26,
 * 27).
 *
 * Controller tipis: ability gate `sale.create` + resolve identifier publik →
 * internal + delegasi ke `PostSale::handle` (REUSE — SaleCalculator, ledger,
 * IdempotencyGuard, document sequence, PaymentMethodCatalog tidak diduplikasi).
 * `client_operation_id` (atau header `Idempotency-Key`) menjadi idempotency key
 * sehingga retry aman & konsisten dengan `sale.create` offline. Membership +
 * tenant sudah divalidasi middleware `store.membership`.
 */
class SaleStoreController
{
    public function __construct(private PostSale $postSale) {}

    public function __invoke(StoreSaleRequest $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('sale.create')) {
            throw new AccessDeniedHttpException('Ability sale.create diperlukan.');
        }

        $validated = $request->validated();
        $accountId = $this->resolveAccountId($store, $validated, $request->input('marketplace_code'));

        $sale = $this->postSale->handle(
            store: $store,
            actor: $request->user(),
            accountId: $accountId,
            items: $this->resolveItems($store, $validated['items']),
            transactionDiscount: (string) $validated['transaction_discount'],
            paidAmount: (string) $validated['paid_amount'],
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) $validated['client_operation_id'],
            ipAddress: $request->ip(),
            paymentProof: $request->file('payment_proof'),
            customerName: $validated['customer_name'] ?? null,
            customerPhone: $validated['customer_phone'] ?? null,
            customerEmail: $validated['customer_email'] ?? null,
            salesChannel: (string) $validated['sales_channel'],
            paymentMethod: (string) $validated['payment_method'],
            marketplaceCode: $validated['marketplace_code'] ?? null,
            externalOrderNumber: $validated['external_order_number'] ?? null,
        );

        $sale->load(['items', 'payments']);

        return ApiResponse::success(
            (new SaleDetailResource($sale))->resolve($request),
            status: 201,
        );
    }

    /**
     * Channel marketplace menerima ke akun EWallet marketplace yang sesuai
     * (bukan akun kas/in-store); channel in_store memakai `account_public_id`.
     * Validasi kombinasi otoritatif tetap di PostSale.
     *
     * @param  array<string, mixed>  $validated
     */
    private function resolveAccountId(Store $store, array $validated, mixed $marketplaceCode): int
    {
        if (($validated['sales_channel'] ?? null) === 'marketplace') {
            return FinancialAccount::query()
                ->where('store_id', $store->id)
                ->where('is_active', true)
                ->where('marketplace_code', $marketplaceCode)
                ->firstOrFail()
                ->id;
        }

        return FinancialAccount::query()
            ->where('store_id', $store->id)
            ->where('public_id', $validated['account_public_id'])
            ->firstOrFail()
            ->id;
    }

    /**
     * @param  array<int, array{product_unit_id:string, quantity:string, item_discount:string}>  $items
     * @return array<int, array{product_unit_id:int, quantity:string, item_discount:string}>
     */
    private function resolveItems(Store $store, array $items): array
    {
        return array_map(function (array $item) use ($store): array {
            $productUnitId = ProductUnit::query()
                ->where('store_id', $store->id)
                ->whereKey((int) $item['product_unit_id'])
                ->firstOrFail()
                ->id;

            return [
                'product_unit_id' => $productUnitId,
                'quantity' => (string) $item['quantity'],
                'item_discount' => (string) $item['item_discount'],
            ];
        }, $items);
    }
}
