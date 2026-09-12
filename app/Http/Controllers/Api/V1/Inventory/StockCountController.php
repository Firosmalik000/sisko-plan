<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Actions\Inventory\PostStockCount;
use App\Actions\Inventory\StartStockCount;
use App\Actions\Inventory\UpdateStockCount;
use App\Http\Requests\Api\V1\Inventory\UpdateStockCountItemsRequest;
use App\Http\Resources\Api\V1\Inventory\StockCountResource;
use App\Http\Responses\ApiResponse;
use App\Models\StockCount;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Sesi stok opname store-scoped (Req 15).
 *
 * State machine draft(open) ↔ counted(completed) → posted / cancelled,
 * didelegasikan ke StartStockCount / UpdateStockCount / PostStockCount (REUSE).
 * Transisi ilegal (mis. post sesi non-counted, reopen sesi posted) dipetakan ke
 * envelope `INVALID_STATE_TRANSITION` (409). Baca `store.read`; mutasi
 * `inventory.write`. Cancel tidak mengubah stok.
 */
class StockCountController
{
    public function __construct(
        private StartStockCount $starter,
        private UpdateStockCount $updater,
        private PostStockCount $poster,
    ) {}

    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $page = StockCount::query()
            ->where('store_id', $store->id)
            ->orderByDesc('id')
            ->cursorPaginate(50);

        return ApiResponse::success([
            'stock_counts' => StockCountResource::collection($page->getCollection())->resolve($request),
            'page' => [
                'next_cursor' => $page->nextCursor()?->encode(),
                'has_more' => $page->hasMorePages(),
            ],
        ]);
    }

    public function show(Request $request, Store $store, string $count): JsonResponse
    {
        $this->assertCan($request, 'store.read');

        $model = $this->resolve($store, $count, ['items.product:id,public_id,name']);

        return ApiResponse::success((new StockCountResource($model))->resolve($request));
    }

    public function store(Request $request, Store $store): JsonResponse
    {
        $this->assertCan($request, 'inventory.write');

        $notes = $request->input('notes');

        $stockCount = $this->starter->handle(
            $store,
            $request->user(),
            is_string($notes) ? $notes : null,
            $request->ip(),
        );

        $stockCount->load(['items.product:id,public_id,name']);

        return ApiResponse::success(
            (new StockCountResource($stockCount))->resolve($request),
            status: 201,
        );
    }

    public function update(UpdateStockCountItemsRequest $request, Store $store, string $count): JsonResponse
    {
        $this->assertCan($request, 'inventory.write');

        $model = $this->resolve($store, $count);

        $this->updater->save(
            $store,
            $model,
            $request->user(),
            $request->validated()['items'],
            $request->ip(),
        );

        return $this->respondFresh($request, $store, $count);
    }

    public function complete(Request $request, Store $store, string $count): JsonResponse
    {
        return $this->transition($request, $store, $count, fn (StockCount $model) => $this->updater->complete($store, $model, $request->user(), $request->ip()));
    }

    public function reopen(Request $request, Store $store, string $count): JsonResponse
    {
        return $this->transition($request, $store, $count, fn (StockCount $model) => $this->updater->reopen($store, $model, $request->user(), $request->ip()));
    }

    public function cancel(Request $request, Store $store, string $count): JsonResponse
    {
        return $this->transition($request, $store, $count, fn (StockCount $model) => $this->updater->cancel($store, $model, $request->user(), $request->ip()));
    }

    public function post(Request $request, Store $store, string $count): JsonResponse
    {
        return $this->transition($request, $store, $count, fn (StockCount $model) => $this->poster->handle($store, $model, $request->user(), $request->ip()));
    }

    /**
     * Jalankan transisi status, memetakan penolakan transisi ilegal ke
     * envelope `INVALID_STATE_TRANSITION` (409) agar klien dapat membedakannya
     * dari kegagalan validasi biasa (Req 15.5, 15.6).
     */
    private function transition(Request $request, Store $store, string $count, callable $action): JsonResponse
    {
        $this->assertCan($request, 'inventory.write');

        $model = $this->resolve($store, $count);
        $before = $model->status;

        try {
            $action($model);
        } catch (ValidationException $exception) {
            return ApiResponse::error(
                code: 'INVALID_STATE_TRANSITION',
                message: $exception->validator->errors()->first() ?: 'Transisi status opname tidak diizinkan.',
                fields: $exception->errors(),
                status: 409,
                meta: ['from_status' => $before->value],
            );
        }

        return $this->respondFresh($request, $store, $count);
    }

    private function respondFresh(Request $request, Store $store, string $count): JsonResponse
    {
        $fresh = $this->resolve($store, $count, ['items.product:id,public_id,name']);

        return ApiResponse::success((new StockCountResource($fresh))->resolve($request));
    }

    /**
     * @param  list<string>  $with
     */
    private function resolve(Store $store, string $count, array $with = []): StockCount
    {
        return StockCount::query()
            ->where('store_id', $store->id)
            ->where('public_id', $count)
            ->with($with)
            ->firstOrFail();
    }

    private function assertCan(Request $request, string $ability): void
    {
        if (! $request->user()->tokenCan($ability)) {
            throw new AccessDeniedHttpException("Ability {$ability} diperlukan.");
        }
    }
}
