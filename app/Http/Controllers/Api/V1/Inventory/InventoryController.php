<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Actions\Ledgers\PostStockAdjustment;
use App\Http\Requests\Api\V1\Inventory\SetMinimumStockRequest;
use App\Http\Requests\Api\V1\Inventory\StoreStockAdjustmentRequest;
use App\Http\Responses\ApiResponse;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Support\Decimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Posisi stok + penyesuaian + minimum stok store-scoped (Req 14).
 *
 * Posisi & minimum berada di `inventory_balances` (per product/variant), qty
 * string decimal scale 6. Baca `store.read`; penyesuaian & set minimum
 * `inventory.write`. Penyesuaian mendelegasi ke `PostStockAdjustment` (REUSE —
 * stock movement + ledger tidak diduplikasi). Item ditandai `below_minimum`
 * jika quantity < minimum (Req 14.3).
 */
class InventoryController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function __construct(private PostStockAdjustment $adjustments) {}

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $search = trim((string) $request->query('q', ''));

        $query = InventoryBalance::query()
            ->where('inventory_balances.store_id', $store->id)
            ->join('products', 'products.id', '=', 'inventory_balances.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_balances.product_variant_id')
            ->orderBy('products.name')
            ->orderBy('inventory_balances.id')
            ->select([
                'inventory_balances.id',
                'inventory_balances.quantity',
                'inventory_balances.minimum_quantity',
                'products.public_id as product_public_id',
                'products.name as product_name',
                'product_variants.public_id as variant_public_id',
                'product_variants.name as variant_name',
            ]);

        if ($search !== '') {
            $query->where('products.name', 'like', "%{$search}%");
        }

        $page = $query->cursorPaginate($this->resolveLimit($request), ['*'], 'cursor');

        $items = array_map(function ($row): array {
            $quantity = Decimal::add('0', (string) $row->quantity, Decimal::QUANTITY_SCALE);
            $minimum = $row->minimum_quantity === null
                ? null
                : Decimal::add('0', (string) $row->minimum_quantity, Decimal::QUANTITY_SCALE);
            $belowMinimum = $minimum !== null
                && Decimal::compare($quantity, $minimum, Decimal::QUANTITY_SCALE) < 0;

            return [
                'product_public_id' => $row->product_public_id,
                'variant_public_id' => $row->variant_public_id,
                'name' => $row->variant_name === null
                    ? $row->product_name
                    : "{$row->product_name} - {$row->variant_name}",
                'quantity' => $quantity,
                'minimum_quantity' => $minimum,
                'below_minimum' => $belowMinimum,
            ];
        }, $page->items());

        return ApiResponse::success([
            'inventory' => $items,
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    /**
     * POST /stores/{store}/inventory/adjustments — penyesuaian stok manual
     * (Req 14.2) melalui PostStockAdjustment. `items[].product_public_id` (+
     * opsional `variant_public_id`) diresolve ke id internal.
     */
    public function adjust(StoreStockAdjustmentRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'inventory.write');

        $validated = $request->validated();

        $adjustment = $this->adjustments->handle(
            store: $store,
            actor: $request->user(),
            type: $validated['type'],
            items: $this->resolveItems($store, $validated['items']),
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) ($validated['client_operation_id'] ?? Str::uuid()),
            ipAddress: $request->ip(),
        );

        return ApiResponse::success([
            'public_id' => $adjustment->public_id,
            'document_number' => $adjustment->document_number,
            'type' => $adjustment->type,
            'occurred_at' => $adjustment->occurred_at?->toIso8601String(),
        ], status: 201);
    }

    /**
     * PATCH /stores/{store}/inventory/{productPublicId}/minimum — set minimum
     * stok (Req 14.3). Menyimpan pada inventory_balances.minimum_quantity.
     */
    public function setMinimum(SetMinimumStockRequest $request, Store $store, string $product): JsonResponse
    {
        $this->assertCan($request, 'inventory.write');

        $validated = $request->validated();

        $productModel = Product::query()
            ->where('store_id', $store->id)
            ->where('public_id', $product)
            ->firstOrFail();

        $variantId = null;
        if (! empty($validated['variant_public_id'])) {
            $variantId = ProductVariant::query()
                ->where('store_id', $store->id)
                ->where('product_id', $productModel->id)
                ->where('public_id', $validated['variant_public_id'])
                ->firstOrFail()
                ->id;
        }

        $balance = InventoryBalance::query()
            ->where('store_id', $store->id)
            ->where('product_id', $productModel->id)
            ->where('product_variant_id', $variantId)
            ->first();

        if ($balance === null) {
            throw new NotFoundHttpException('Posisi stok produk tidak ditemukan.');
        }

        $balance->minimum_quantity = $validated['minimum_quantity'];
        $balance->save();

        return ApiResponse::success([
            'product_public_id' => $productModel->public_id,
            'variant_public_id' => $validated['variant_public_id'] ?? null,
            'minimum_quantity' => Decimal::add('0', (string) $balance->minimum_quantity, Decimal::QUANTITY_SCALE),
        ]);
    }

    /**
     * @param  array<int, array{product_public_id:string, variant_public_id?:string|null, quantity:string, unit_cost?:string|null}>  $items
     * @return array<int, array{product_id:int, product_variant_id?:int|null, quantity:string, unit_cost?:string|null}>
     */
    private function resolveItems(Store $store, array $items): array
    {
        return array_map(function (array $item) use ($store): array {
            $product = Product::query()
                ->where('store_id', $store->id)
                ->where('public_id', $item['product_public_id'])
                ->firstOrFail();

            $resolved = [
                'product_id' => $product->id,
                'quantity' => (string) $item['quantity'],
            ];

            if (! empty($item['variant_public_id'])) {
                $resolved['product_variant_id'] = ProductVariant::query()
                    ->where('store_id', $store->id)
                    ->where('product_id', $product->id)
                    ->where('public_id', $item['variant_public_id'])
                    ->firstOrFail()
                    ->id;
            }

            if (isset($item['unit_cost']) && $item['unit_cost'] !== null && $item['unit_cost'] !== '') {
                $resolved['unit_cost'] = (string) $item['unit_cost'];
            }

            return $resolved;
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
