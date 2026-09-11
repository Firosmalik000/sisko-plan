<?php

namespace App\Http\Controllers\Api\V1\Distribution;

use App\Http\Resources\Api\V1\Distribution\DistributionCatalogItemResource;
use App\Http\Responses\ApiResponse;
use App\Support\Distribution\CatalogMarketContext;
use App\Support\Distribution\CatalogQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /distribution/catalog/{item} — detail item distributor by public_id,
 * market-aware, READ-ONLY (design §3.2, §11, Req 20.2, 20.9).
 *
 * Detail tunduk pada visibilitas market yang sama dengan list: item di luar
 * market atau di luar valid window menghasilkan 404 (tidak bocor lintas-market).
 */
class CatalogShowController
{
    public function __invoke(Request $request, string $item): JsonResponse
    {
        $market = CatalogMarketContext::resolve($request);

        $catalogItem = CatalogQuery::visible($market)
            ->where('public_id', $item)
            ->first();

        if ($catalogItem === null) {
            return ApiResponse::error(
                'NOT_FOUND',
                'Item katalog tidak ditemukan untuk market ini.',
                status: 404,
            );
        }

        $sponsorship = CatalogQuery::sponsorshipMap([$catalogItem->id], $market);
        $label = $sponsorship[$catalogItem->id] ?? null;

        return ApiResponse::success([
            'market' => $market,
            'item' => (new DistributionCatalogItemResource($catalogItem))
                ->withSponsorship($label !== null, $label)
                ->resolve($request),
        ]);
    }
}
