<?php

namespace App\Http\Controllers\Api\V1\Purchasing;

use App\Actions\Purchasing\PostPurchase;
use App\Http\Requests\Api\V1\Purchasing\StorePurchaseRequest;
use App\Http\Resources\Api\V1\Purchasing\PurchaseResource;
use App\Http\Responses\ApiResponse;
use App\Models\FinancialAccount;
use App\Models\ProductUnit;
use App\Models\Purchase;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Kulakan store-scoped (Req 16). List + detail baca `store.read`; create
 * `purchasing.write` mendelegasi ke `PostPurchase` (REUSE — stok + ledger +
 * hutang tidak diduplikasi). Nominal string decimal scale 4.
 */
class PurchaseController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function __construct(private PostPurchase $postPurchase) {}

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $page = Purchase::query()
            ->where('store_id', $store->id)
            ->with(['supplier:id,public_id,name', 'payments:id,purchase_id,amount'])
            ->orderByDesc('id')
            ->cursorPaginate($this->resolveLimit($request));

        return ApiResponse::success([
            'purchases' => PurchaseResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    public function show(Request $request, Store $store, string $purchase): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $model = Purchase::query()
            ->where('store_id', $store->id)
            ->where('public_id', $purchase)
            ->with(['supplier:id,public_id,name', 'items', 'payments'])
            ->firstOrFail();

        return ApiResponse::success((new PurchaseResource($model))->resolve($request));
    }

    public function store(StorePurchaseRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'purchasing.write');

        $validated = $request->validated();

        $supplier = Supplier::query()
            ->where('store_id', $store->id)
            ->where('public_id', $validated['supplier_public_id'])
            ->firstOrFail();

        $accountId = null;
        if (! empty($validated['account_public_id'])) {
            $accountId = FinancialAccount::query()
                ->where('store_id', $store->id)
                ->where('public_id', $validated['account_public_id'])
                ->firstOrFail()
                ->id;
        }

        $purchase = $this->postPurchase->handle(
            store: $store,
            actor: $request->user(),
            supplierId: $supplier->id,
            items: $this->resolveItems($store, $validated['items']),
            discount: (string) $validated['discount'],
            additionalCost: (string) $validated['additional_cost'],
            accountId: $accountId,
            paidAmount: (string) $validated['paid_amount'],
            occurredAt: (string) $validated['occurred_at'],
            supplierInvoice: $validated['supplier_invoice_number'] ?? null,
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) $validated['client_operation_id'],
            ipAddress: $request->ip(),
        );

        $purchase->load(['supplier:id,public_id,name', 'items', 'payments']);

        return ApiResponse::success(
            (new PurchaseResource($purchase))->resolve($request),
            status: 201,
        );
    }

    /**
     * @param  array<int, array{product_unit_id:string, quantity:string, unit_price:string}>  $items
     * @return array<int, array{product_unit_id:int, quantity:string, unit_price:string}>
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
                'unit_price' => (string) $item['unit_price'],
            ];
        }, $items);
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
