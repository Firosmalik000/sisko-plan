<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Http\Resources\Api\V1\StoreResource;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /stores — toko dengan membership aktif milik pengguna (Req 4.2).
 *
 * Hanya membership berstatus aktif yang dikembalikan; tidak membocorkan toko
 * yang membership-nya nonaktif/dicabut.
 */
class StoreIndexController
{
    public function __invoke(Request $request): JsonResponse
    {
        $stores = $request->user()->activeStores()->get();

        return ApiResponse::success([
            'stores' => StoreResource::collection($stores)->resolve($request),
        ]);
    }
}
