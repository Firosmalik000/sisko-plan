<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Http\Resources\Api\V1\ProductResource;
use App\Http\Responses\ApiResponse;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * GET /stores/{store}/products — list produk store-scoped dengan query + cursor
 * pagination + ringkasan stok (design §3.2, Req 10.1, 10.4, 24.3).
 *
 * Controller tipis: ability gate `store.read` + query store-scoped + serialisasi
 * via ProductResource. Pagination memakai cursor (bukan offset) agar stabil pada
 * katalog besar; `next_cursor` = `Cursor::encode()`, `has_more` = ada halaman
 * berikutnya. Query `q` (opsional) mencari nama produk / SKU / barcode
 * ProductUnit di sisi server. Membership sudah divalidasi middleware
 * `store.membership`.
 */
class ProductIndexController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function __invoke(Request $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }

        $limit = $this->resolveLimit($request);
        $search = trim((string) $request->query('q', ''));

        $query = Product::query()
            ->where('store_id', $store->id)
            ->with(['category:id,name', 'productUnits.unit:id,name', 'inventoryBalances'])
            ->orderBy('id');

        if ($search !== '') {
            $query->where(function ($outer) use ($search): void {
                $outer->where('name', 'like', "%{$search}%")
                    ->orWhereHas('productUnits', function ($unit) use ($search): void {
                        $unit->where('sku', 'like', "%{$search}%")
                            ->orWhere('barcode', 'like', "%{$search}%");
                    });
            });
        }

        $page = $query->cursorPaginate($limit);

        return ApiResponse::success([
            'products' => ProductResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    private function resolveLimit(Request $request): int
    {
        $limit = (int) $request->query('limit', (string) self::DEFAULT_LIMIT);

        if ($limit < 1) {
            return self::DEFAULT_LIMIT;
        }

        return min($limit, self::MAX_LIMIT);
    }
}
