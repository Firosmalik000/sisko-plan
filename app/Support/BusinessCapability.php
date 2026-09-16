<?php

namespace App\Support;

use App\Enums\BusinessRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\BusinessMembership;
use App\Models\Store;
use App\Models\User;

class BusinessCapability
{
    /** @var array<string, list<string>> */
    private const MAP = [
        'owner' => ['business.manage', 'members.manage', 'subscription.manage', 'store.manage', 'catalog.manage', 'inventory.manage', 'purchasing.manage', 'cash.view', 'expenses.manage', 'sales.checkout', 'sales.view-all', 'register.approve', 'reports.view', 'devices.manage', 'team.view'],
        'admin' => ['members.manage', 'store.manage', 'catalog.manage', 'inventory.manage', 'purchasing.manage', 'cash.view', 'expenses.manage', 'sales.checkout', 'sales.view-all', 'register.approve', 'reports.view', 'devices.manage', 'team.view'],
        'manager' => ['store.manage', 'catalog.manage', 'inventory.manage', 'purchasing.manage', 'cash.view', 'expenses.manage', 'sales.checkout', 'sales.view-all', 'register.approve', 'reports.view', 'devices.manage', 'team.view'],
        'cashier' => ['inventory.count', 'purchasing.view', 'sales.checkout', 'register.use', 'sales.view-own'],
    ];

    /** @return list<string> */
    public function for(BusinessMembership $member, ?Store $store = null): array
    {
        if ($member->status !== MembershipStatus::Active) {
            return [];
        }

        $role = $member->business_role->value;
        if ($member->business_role === BusinessRole::Staff) {
            if ($store === null || $store->business_id !== $member->business_id) {
                return [];
            }
            $assignment = $store->assignments()->where('business_membership_id', $member->id)
                ->where('status', MembershipStatus::Active->value)->value('role');
            $role = $assignment instanceof MembershipRole ? $assignment->value : $assignment;
        }

        return self::MAP[$role] ?? [];
    }

    public function allows(BusinessMembership $member, string $capability, ?Store $store = null): bool
    {
        return in_array($capability, $this->for($member, $store), true);
    }

    public function memberFor(User $user, Store $store): ?BusinessMembership
    {
        return BusinessMembership::query()->where('business_id', $store->business_id)
            ->where('user_id', $user->id)->where('status', MembershipStatus::Active->value)->first();
    }
}
