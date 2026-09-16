<?php

namespace App\Actions\Registers;

use App\Models\BusinessMembership;
use App\Models\PosActionApproval;
use App\Models\PosDevice;
use App\Models\Store;
use App\Support\BusinessCapability;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ApprovePosAction
{
    public function __construct(private BusinessCapability $capabilities) {}

    public function handle(Store $store, ?PosDevice $device, BusinessMembership $cashier, BusinessMembership $approver, string $pin, string $action, ?Model $target = null): PosActionApproval
    {
        abort_unless($cashier->business_id === $store->business_id && $approver->business_id === $store->business_id, 403);
        if (! $this->capabilities->allows($approver, 'register.approve', $store)) {
            throw ValidationException::withMessages(['approver' => __('This staff member cannot approve POS actions.')]);
        }
        if ($approver->pos_pin_hash === null || ! Hash::check($pin, $approver->pos_pin_hash)) {
            throw ValidationException::withMessages(['pin' => __('The approver PIN is incorrect.')]);
        }
        if ($device !== null && $device->store_id !== $store->id) {
            throw ValidationException::withMessages(['device' => __('The approval device does not belong to this Store.')]);
        }

        return PosActionApproval::create([
            'store_id' => $store->id,
            'pos_device_id' => $device?->id,
            'cashier_business_membership_id' => $cashier->id,
            'approver_business_membership_id' => $approver->id,
            'action' => $action,
            'target_type' => $target?->getMorphClass(),
            'target_id' => $target?->getKey(),
            'expires_at' => now()->addMinutes(2),
        ]);
    }

    public function consume(PosActionApproval $approval, Store $store, BusinessMembership $cashier, string $action, ?Model $target = null): PosActionApproval
    {
        return DB::transaction(function () use ($approval, $store, $cashier, $action, $target): PosActionApproval {
            $locked = PosActionApproval::query()->whereKey($approval->id)->lockForUpdate()->firstOrFail();
            $matches = $locked->store_id === $store->id
                && $locked->cashier_business_membership_id === $cashier->id
                && $locked->action === $action
                && $locked->target_type === $target?->getMorphClass()
                && $locked->target_id === $target?->getKey();
            if (! $matches || $locked->used_at !== null || $locked->expires_at->isPast()) {
                throw ValidationException::withMessages(['approval' => __('This manager approval is invalid, expired, or already used.')]);
            }
            $locked->update(['used_at' => now()]);

            return $locked;
        }, 3);
    }
}
