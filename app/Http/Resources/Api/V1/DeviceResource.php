<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representasi device push (design §10, Req 15.1).
 *
 * `push_token` sengaja tidak diekspos kembali (data sensitif, tidak masuk
 * response/log). Identifier publik = `public_id` (ULID).
 *
 * @mixin Device
 */
class DeviceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'device_id' => $this->device_id,
            'platform' => $this->platform->value,
            'push_provider' => $this->push_provider->value,
            'last_seen_at' => $this->last_seen_at?->toIso8601ZuluString(),
            'updated_at' => $this->updated_at?->toIso8601ZuluString(),
        ];
    }
}
