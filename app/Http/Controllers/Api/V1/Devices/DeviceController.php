<?php

namespace App\Http\Controllers\Api\V1\Devices;

use App\Http\Requests\Api\V1\Devices\RegisterDeviceRequest;
use App\Http\Resources\Api\V1\DeviceResource;
use App\Http\Responses\ApiResponse;
use App\Models\Device;
use Illuminate\Http\JsonResponse;

/**
 * Registrasi & pencabutan device push (design §10, Req 15.1/15.6).
 *
 * Bukan store-scoped: registrasi push melekat pada user/perangkat, bukan satu
 * toko. Controller tipis: validasi via FormRequest + upsert/revoke scoped ke
 * user token saat ini.
 */
class DeviceController
{
    /**
     * POST /devices — registrasi/update token FCM/APNs (upsert idempotent).
     */
    public function store(RegisterDeviceRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $device = Device::query()->updateOrCreate(
            [
                'user_id' => $request->user()->id,
                'device_id' => $validated['device_id'],
            ],
            [
                'platform' => $validated['platform'],
                'push_token' => $validated['push_token'],
                'push_provider' => $validated['push_provider'],
                'last_seen_at' => now(),
            ],
        );

        return ApiResponse::success(
            (new DeviceResource($device))->resolve($request),
            status: $device->wasRecentlyCreated ? 201 : 200,
        );
    }

    /**
     * DELETE /devices/{device} — revoke device milik user (by public_id).
     *
     * Device milik user lain menghasilkan 404 (scoped, tidak membocorkan
     * keberadaan resource lintas-user).
     */
    public function destroy(Device $device): JsonResponse
    {
        abort_unless($device->user_id === request()->user()->id, 404);

        $device->delete();

        return ApiResponse::success(['revoked' => true]);
    }
}
