<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Actions\Stores\CreateStore;
use App\Enums\StoreStatus;
use App\Http\Requests\Api\V1\Stores\CreateStoreRequest;
use App\Http\Resources\Api\V1\Stores\StoreProfileResource;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Manajemen toko Api/V1 (Req 21.2, 21.3, 22.1). Create (bukan store-scoped) REUSE
 * `CreateStore` (kapasitas langganan, membership owner, starter data, langganan
 * default). Update/nonaktif/pulihkan store-scoped, ability `store.settings`.
 *
 * Store TIDAK memakai soft delete: nonaktif = status `Archived`, pulihkan =
 * `Active`. Transisi status ilegal (mis. arsip toko yang sudah diarsip) → 409
 * `CONFLICT`.
 */
class StoreManagementController
{
    public function __construct(private CreateStore $createStore) {}

    public function store(CreateStoreRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $store = $this->createStore->handle(
            owner: $request->user(),
            name: (string) $validated['name'],
            ipAddress: $request->ip(),
            countryCode: $validated['country_code'] ?? null,
            address: $validated['address'] ?? null,
        );

        return ApiResponse::success(
            (new StoreProfileResource($store->refresh()->load('settings')))->resolve($request),
            status: 201,
        );
    }

    public function update(CreateStoreRequest $request, Store $store): JsonResponse
    {
        $this->assertSettings($request);
        $validated = $request->validated();

        DB::transaction(function () use ($store, $validated): void {
            if (array_key_exists('name', $validated)) {
                $store->name = (string) $validated['name'];
                $store->save();
            }

            if (array_key_exists('address', $validated)) {
                $setting = $store->settings()->firstOrNew(['store_id' => $store->id]);
                $setting->address = $validated['address'];
                $setting->save();
            }
        });

        return ApiResponse::success(
            (new StoreProfileResource($store->refresh()->load('settings')))->resolve($request),
        );
    }

    public function destroy(Request $request, Store $store): JsonResponse
    {
        $this->assertSettings($request);

        return DB::transaction(function () use ($store, $request): JsonResponse {
            $locked = Store::query()->lockForUpdate()->findOrFail($store->id);
            if ($locked->status !== StoreStatus::Active) {
                return ApiResponse::error(
                    code: 'CONFLICT',
                    message: 'Toko tidak dalam status aktif.',
                    status: 409,
                );
            }
            $locked->status = StoreStatus::Archived;
            $locked->save();

            return ApiResponse::success((new StoreProfileResource($locked->load('settings')))->resolve($request));
        }, 3);
    }

    public function restore(Request $request, Store $store): JsonResponse
    {
        $this->assertSettings($request);

        return DB::transaction(function () use ($store, $request): JsonResponse {
            $locked = Store::query()->lockForUpdate()->findOrFail($store->id);
            if ($locked->status !== StoreStatus::Archived) {
                return ApiResponse::error(
                    code: 'CONFLICT',
                    message: 'Toko tidak dalam status terarsip.',
                    status: 409,
                );
            }
            $locked->status = StoreStatus::Active;
            $locked->save();

            return ApiResponse::success((new StoreProfileResource($locked->load('settings')))->resolve($request));
        }, 3);
    }

    private function assertSettings(Request $request): void
    {
        if (! $request->user()->tokenCan('store.settings')) {
            throw new AccessDeniedHttpException('Ability store.settings diperlukan.');
        }
    }
}
