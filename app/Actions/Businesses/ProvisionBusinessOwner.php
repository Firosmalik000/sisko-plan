<?php

namespace App\Actions\Businesses;

use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\BusinessRole;
use App\Enums\BusinessStatus;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\User;

class ProvisionBusinessOwner
{
    public function __construct(private StartDefaultSubscription $subscriptions) {}

    public function handle(User $user): BusinessMembership
    {
        $membership = $user->businessMemberships()
            ->where('business_role', BusinessRole::Owner->value)
            ->with('business')
            ->oldest('id')
            ->first();

        if ($membership === null) {
            $business = Business::create(['name' => $user->name, 'status' => BusinessStatus::Active]);
            $membership = BusinessMembership::create([
                'business_id' => $business->id,
                'user_id' => $user->id,
                'display_name' => $user->name,
                'business_role' => BusinessRole::Owner,
                'status' => MembershipStatus::Active,
                'joined_at' => now(),
            ])->setRelation('business', $business);
        }

        $this->subscriptions->handle($membership->business);

        return $membership;
    }
}
