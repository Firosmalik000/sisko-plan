<?php

namespace App\Actions\Sales;

use App\Actions\Audit\RecordAudit;
use App\Models\BusinessMembership;
use App\Models\PosDevice;
use App\Models\Store;
use Illuminate\Support\Str;

class ActivatePosDevice
{
    public function __construct(private RecordAudit $audit) {}

    /** @return array{PosDevice,string} */
    public function handle(Store $store, BusinessMembership $actor, string $name, ?string $ipAddress = null): array
    {
        abort_unless($actor->business_id === $store->business_id, 403);

        $token = Str::random(64);
        $device = PosDevice::create([
            'business_id' => $store->business_id,
            'store_id' => $store->id,
            'name' => trim($name),
            'token_hash' => hash('sha256', $token),
            'status' => 'active',
            'activated_by_business_membership_id' => $actor->id,
        ]);
        $this->audit->handle($actor, 'pos_device.activated', $device, $store, $ipAddress, [
            'device_id' => $device->public_id,
            'device_name' => $device->name,
        ]);

        return [$device, $token];
    }
}
