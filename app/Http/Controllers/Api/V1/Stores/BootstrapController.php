<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Http\Resources\Api\V1\CurrencyResource;
use App\Http\Resources\Api\V1\FinancialAccountResource;
use App\Http\Resources\Api\V1\ProductUnitResource;
use App\Http\Resources\Api\V1\StoreSettingsResource;
use App\Http\Responses\ApiResponse;
use App\Models\Currency;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Support\Authentication\OfflineLease;
use App\Support\Sync\StoreCatalogSnapshot;
use App\Support\Sync\SyncCursor;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * GET /stores/{store}/bootstrap — snapshot minimum toko + cursor awal + offline
 * lease (design §3.2, §5.3, §5.4, Req 6.1, 6.2).
 *
 * Controller tipis: ability gate + serialisasi via Resource. Cursor awal = high
 * water mark per-stream sehingga pull tepat setelah bootstrap mengembalikan
 * delta kosong sampai ada perubahan baru. Membership sudah divalidasi middleware
 * `store.membership`; di sini server re-check ability `store.read` (Req 5.1).
 */
class BootstrapController
{
    public function __construct(private StoreCatalogSnapshot $snapshot) {}

    public function __invoke(Request $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }

        $store->loadMissing('settings');

        $currency = $store->settings !== null
            ? Currency::query()->whereKey($store->settings->currency)->first()
            : null;

        $accounts = FinancialAccount::query()
            ->where('store_id', $store->id)
            ->orderBy('name')
            ->get();

        $productUnits = $this->snapshot->productUnits($store);

        $cursor = (new SyncCursor)
            ->advance('product_units', $this->snapshot->productUnitsWatermark($store))
            ->advance('financial_accounts', $this->toCarbon($accounts->max('updated_at')));

        return ApiResponse::success([
            'store' => [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'settings' => $store->settings !== null
                    ? (new StoreSettingsResource($store->settings))->resolve($request)
                    : null,
            ],
            'currency' => $currency !== null
                ? (new CurrencyResource($currency))->resolve($request)
                : null,
            'financial_accounts' => FinancialAccountResource::collection($accounts)->resolve($request),
            'product_units' => ProductUnitResource::collection($productUnits)->resolve($request),
            'cursor' => $cursor->encode(),
            'offline_lease' => OfflineLease::issue(),
        ]);
    }

    private function toCarbon(mixed $value): ?CarbonImmutable
    {
        return $value === null ? null : CarbonImmutable::parse((string) $value);
    }
}
