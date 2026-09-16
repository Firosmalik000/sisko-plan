<?php

namespace App\Policies;

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\User;

class BusinessPolicy
{
    public function view(User $user, Business $business): bool
    {
        return $business->memberships()->where('user_id', $user->id)
            ->where('status', MembershipStatus::Active->value)->exists();
    }

    public function manage(User $user, Business $business): bool
    {
        return $business->memberships()->where('user_id', $user->id)
            ->where('business_role', BusinessRole::Owner->value)
            ->where('status', MembershipStatus::Active->value)->exists();
    }
}
