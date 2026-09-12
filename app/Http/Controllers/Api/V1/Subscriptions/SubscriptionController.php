<?php

namespace App\Http\Controllers\Api\V1\Subscriptions;

use App\Actions\Subscriptions\SelectSubscriptionPlan;
use App\Http\Requests\Api\V1\Subscriptions\SelectPlanRequest;
use App\Http\Resources\Api\V1\Subscriptions\PlanResource;
use App\Http\Resources\Api\V1\Subscriptions\SubscriptionResource;
use App\Http\Responses\ApiResponse;
use App\Models\Plan;
use App\Models\Store;
use App\Models\Subscription;
use App\Services\Subscriptions\ScannerQuotaSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Langganan akun Api/V1 (Req 24). Overview = paket tersedia + langganan aktif +
 * kuota AI (REUSE `ScannerQuotaSnapshot`). Select = REUSE `SelectSubscriptionPlan`
 * (validasi paket utama/kapasitas/trial otoritatif di action). Langganan bersifat
 * per-owner (store.owner_user_id); hanya pemilik yang boleh memilih paket.
 */
class SubscriptionController
{
    public function __construct(
        private ScannerQuotaSnapshot $quota,
        private SelectSubscriptionPlan $selectPlan,
    ) {}

    public function show(Request $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }

        $plans = Plan::query()
            ->where('kind', Plan::KIND_BASE)
            ->where('is_active', true)
            ->orderBy('monthly_price')
            ->get();

        $subscription = Subscription::query()
            ->with('plan')
            ->where('user_id', $store->owner_user_id)
            ->first();

        return ApiResponse::success([
            'plans' => PlanResource::collection($plans)->resolve($request),
            'subscription' => $subscription === null
                ? null
                : (new SubscriptionResource($subscription))->resolve($request),
            'ai_quota' => $this->quota->forStore($store),
        ]);
    }

    public function store(SelectPlanRequest $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.settings')) {
            throw new AccessDeniedHttpException('Ability store.settings diperlukan.');
        }

        // Langganan milik pemilik toko: hanya owner yang boleh memilih paket.
        if ($request->user()->id !== $store->owner_user_id) {
            throw new AccessDeniedHttpException('Hanya pemilik toko yang dapat memilih paket.');
        }

        $plan = Plan::query()
            ->where('public_id', $request->validated()['plan_public_id'])
            ->where('is_active', true)
            ->first();

        if ($plan === null) {
            throw new NotFoundHttpException('Paket tidak ditemukan.');
        }

        $result = $this->selectPlan->handle(
            owner: $request->user(),
            plan: $plan,
            ipAddress: $request->ip(),
        );

        $result['subscription']->load('plan');

        return ApiResponse::success([
            'subscription' => (new SubscriptionResource($result['subscription']))->resolve($request),
            'scheduled' => $result['scheduled'],
        ], status: 201);
    }
}
