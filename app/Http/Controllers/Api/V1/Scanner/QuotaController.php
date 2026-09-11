<?php

namespace App\Http\Controllers\Api\V1\Scanner;

use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Services\Subscriptions\ScannerQuotaSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * GET /stores/{store}/scanner/quota — sisa kuota scan AI (design §8, Req 14.1).
 *
 * Controller tipis: ability gate `store.read` + delegasi ke ScannerQuotaSnapshot
 * (REUSE SubscriptionEntitlements) untuk menurunkan used/limit/remaining/
 * unlimited/period/reset. Membership + tenant sudah divalidasi middleware
 * `store.membership`.
 */
class QuotaController
{
    public function __construct(private ScannerQuotaSnapshot $snapshot) {}

    public function __invoke(Request $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }

        return ApiResponse::success($this->snapshot->forStore($store));
    }
}
