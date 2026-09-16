<?php

namespace App\Actions\Sales;

use App\Actions\Audit\RecordAudit;
use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Models\BusinessMembership;
use App\Models\PosDevice;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class UnlockPosDevice
{
    public function __construct(private RecordAudit $audit) {}

    public function handle(PosDevice $device, string $memberPublicId, string $pin, ?string $ipAddress = null): BusinessMembership
    {
        $member = BusinessMembership::query()
            ->where(['public_id' => $memberPublicId, 'business_id' => $device->business_id, 'status' => MembershipStatus::Active->value])
            ->first();
        if ($member === null || ! $this->canUse($device, $member)) {
            throw ValidationException::withMessages(['member_id' => __('This staff member cannot use this terminal.')]);
        }

        $key = "pos-pin:{$device->id}:{$member->id}";
        if (RateLimiter::tooManyAttempts($key, (int) config('pos.pin_max_attempts'))) {
            $this->audit->handle($member, 'pos_device.pin_locked', $device, $device->store, $ipAddress, ['device_id' => $device->public_id]);
            throw ValidationException::withMessages(['pin' => __('Too many PIN attempts. Try again later.')]);
        }
        if ($member->pos_pin_hash === null || ! Hash::check($pin, $member->pos_pin_hash)) {
            RateLimiter::hit($key, (int) config('pos.pin_decay_seconds'));
            throw ValidationException::withMessages(['pin' => __('The PIN is incorrect.')]);
        }

        RateLimiter::clear($key);
        $this->audit->handle($member, 'pos_device.unlocked', $device, $device->store, $ipAddress, ['device_id' => $device->public_id]);

        return $member;
    }

    public function canUse(PosDevice $device, BusinessMembership $member): bool
    {
        if ($member->business_role !== BusinessRole::Staff) {
            return true;
        }

        return $member->stores()->whereKey($device->store_id)
            ->wherePivot('status', MembershipStatus::Active->value)->exists();
    }
}
