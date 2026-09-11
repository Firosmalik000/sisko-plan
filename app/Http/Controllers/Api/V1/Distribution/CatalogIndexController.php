<?php

namespace App\Http\Controllers\Api\V1\Distribution;

use App\Http\Resources\Api\V1\Distribution\DistributionCatalogItemResource;
use App\Http\Responses\ApiResponse;
use App\Support\Distribution\CatalogMarketContext;
use App\Support\Distribution\CatalogQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /distribution/catalog — katalog distributor market-aware, READ-ONLY
 * (design §3.2, §11, Req 20.1, 20.2, 20.9).
 *
 * Bukan store-scoped: katalog bukan milik satu toko. Market context dari
 * `?market=` / header `X-Market` / negara toko aktif user / default ID.
 * Item tampil bila `market_targeting` mencakup market + dalam valid window +
 * availability aktif. `?q=` mencari nama item. Cursor pagination. Item
 * sponsored diberi `is_sponsored` + `disclosure_label` (aksesibel). Tanpa
 * tombol/URL beli (Req 20.8).
 */
class CatalogIndexController
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function __invoke(Request $request): JsonResponse
    {
        $market = CatalogMarketContext::resolve($request);

        $query = CatalogQuery::visible($market)->orderBy('id');

        $search = trim((string) $request->query('q', ''));
        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        $limit = $this->resolveLimit($request);
        $page = $query->cursorPaginate($limit);

        $items = $page->getCollection();
        $sponsorship = CatalogQuery::sponsorshipMap($items->pluck('id')->all(), $market);

        $resources = $items->map(function ($item) use ($request, $sponsorship): array {
            $label = $sponsorship[$item->id] ?? null;

            return (new DistributionCatalogItemResource($item))
                ->withSponsorship($label !== null, $label)
                ->resolve($request);
        })->values()->all();

        return ApiResponse::success([
            'market' => $market,
            'items' => $resources,
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
