<?php

namespace App\Actions\Sales;

use App\Actions\Audit\RecordAudit;
use App\Models\BusinessMembership;
use App\Models\PosDevice;
use App\Models\Store;
use Illuminate\Support\Facades\DB;

class RevokePosDevice
{
    public function __construct(private RecordAudit $audit) {}

    public function handle(Store $store, PosDevice $device, BusinessMembership $actor, ?string $ipAddress = null): void
    {
        DB::transaction(function () use ($store, $device, $actor, $ipAddress): void {
            abort_unless($actor->business_id === $store->business_id, 403);
            $locked = PosDevice::query()->where(['id' => $device->id, 'store_id' => $store->id])->lockForUpdate()->firstOrFail();
            if ($locked->status === 'revoked') {
                return;
            }
            $locked->update(['status' => 'revoked', 'revoked_at' => now()]);
            $this->audit->handle($actor, 'pos_device.revoked', $locked, $store, $ipAddress, [
                'device_id' => $locked->public_id,
            ]);
        }, 3);
    }
}
