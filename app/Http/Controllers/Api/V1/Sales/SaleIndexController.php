<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Http\Resources\Api\V1\Sales\SaleResource;
use App\Http\Responses\ApiResponse;
use App\Models\Sale;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * GET /stores/{store}/sales — riwayat penjualan store-scoped dengan cursor
 * pagination (design §3.6, Req 12.9, 24.3).
 *
 * Controller tipis: ability gate `store.read` + query store-scoped + serialisasi
 * ringkas via SaleResource. Pagination cursor (bukan offset) agar stabil pada
 * riwayat besar; `next_cursor` = `Cursor::encode()`. Filter tanggal opsional
 * `from`/`to` (ISO 8601) atas kolom `occurred_at`. Urut terbaru dulu (id desc)
 * agar riwayat terkini di atas. Membership + tenant sudah divalidasi middleware
 * `store.membership`.
 */
class SaleIndexController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function __invoke(Request $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }

        $query = Sale::query()
            ->where('store_id', $store->id)
            ->orderByDesc('id');

        $from = $request->query('from');
        if (is_string($from) && $from !== '') {
            $query->where('occurred_at', '>=', $from);
        }

        $to = $request->query('to');
        if (is_string($to) && $to !== '') {
            $query->where('occurred_at', '<=', $to);
        }

        $page = $query->cursorPaginate($this->resolveLimit($request));

        return ApiResponse::success([
            'sales' => SaleResource::collection($page->getCollection())->resolve($request),
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
