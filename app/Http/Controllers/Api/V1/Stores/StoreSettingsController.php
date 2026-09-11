<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Http\Requests\Api\V1\Stores\UpdateStoreSettingsRequest;
use App\Http\Resources\Api\V1\Stores\StoreProfileResource;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Models\StoreSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * PATCH /stores/{store}/settings — identitas toko + pengaturan struk
 * (design §3.2, §7.5, Req 21.2, 21.3).
 *
 * Controller tipis: ability gate `store.settings` (owner/admin; cashier ditolak
 * 403) + update sederhana Store.name dan StoreSetting. Tidak ada Action ledger
 * yang perlu di-reuse — ini murni konfigurasi. Membership + tenant sudah
 * divalidasi middleware `store.membership`.
 */
class StoreSettingsController
{
    /**
     * Field StoreSetting yang boleh diubah lewat endpoint ini.
     *
     * @var list<string>
     */
    private const SETTING_FIELDS = [
        'phone', 'email', 'address', 'timezone', 'currency', 'locale',
        'receipt_header', 'receipt_footer', 'receipt_paper_size',
        'receipt_show_address', 'receipt_show_cashier', 'theme_color',
    ];

    public function __invoke(UpdateStoreSettingsRequest $request, Store $store): JsonResponse
    {
        if (! $request->user()->tokenCan('store.settings')) {
            throw new AccessDeniedHttpException('Ability store.settings diperlukan.');
        }

        $validated = $request->validated();

        DB::transaction(function () use ($store, $validated): void {
            if (array_key_exists('name', $validated)) {
                $store->name = $validated['name'];
                $store->save();
            }

            $settingValues = array_intersect_key($validated, array_flip(self::SETTING_FIELDS));

            if ($settingValues !== []) {
                $setting = $store->settings()->firstOrNew(['store_id' => $store->id]);
                $setting->fill($settingValues);
                $setting->save();
            }
        });

        $store->refresh()->load('settings');

        return ApiResponse::success(
            (new StoreProfileResource($store))->resolve($request),
        );
    }
}
