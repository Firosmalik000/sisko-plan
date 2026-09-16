<?php

namespace App\Actions\Businesses;

use App\Actions\Audit\RecordAudit;
use App\Enums\MembershipStatus;
use App\Models\BusinessMembership;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClaimBusinessMembership
{
    public function __construct(private RecordAudit $audit) {}

    public function handle(BusinessMembership $membership, User $user, ?string $ipAddress): BusinessMembership
    {
        return DB::transaction(function () use ($membership, $user, $ipAddress): BusinessMembership {
            $locked = BusinessMembership::query()->lockForUpdate()->findOrFail($membership->id);
            if ($locked->user_id !== null && $locked->user_id !== $user->id) {
                throw ValidationException::withMessages(['membership' => __('This membership belongs to another account.')]);
            }
            if (BusinessMembership::query()->where('business_id', $locked->business_id)
                ->where('user_id', $user->id)->whereKeyNot($locked->id)->exists()) {
                throw ValidationException::withMessages(['membership' => __('This account already belongs to the Business.')]);
            }

            $locked->update([
                'user_id' => $user->id,
                'status' => MembershipStatus::Active,
                'joined_at' => $locked->joined_at ?? now(),
            ]);
            $this->audit->handle($locked, 'business.member_claimed', $locked, $locked->stores()->first(), $ipAddress, [
                'membership_public_id' => $locked->public_id,
            ]);

            return $locked->fresh(['user', 'stores']);
        }, 3);
    }
}
