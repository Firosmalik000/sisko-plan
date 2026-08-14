<?php

namespace App\Policies;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Store;
use App\Models\User;

class StorePolicy
{
    public function view(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->hasActiveMembership($user, $store);
    }

    public function update(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->hasActiveOwnerMembership($user, $store);
    }

    public function manageMembers(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->hasActiveOwnerMembership($user, $store);
    }

    public function switch(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->hasActiveMembership($user, $store);
    }

    public function viewMasterData(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->hasActiveMembership($user, $store);
    }

    public function manageMasterData(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $store->users()
                ->whereKey($user->id)
                ->wherePivotIn('role', [MembershipRole::Owner->value, MembershipRole::Admin->value])
                ->wherePivot('status', MembershipStatus::Active->value)
                ->exists();
    }

    public function viewOperations(User $user, Store $store): bool
    {
        return $this->viewMasterData($user, $store);
    }

    public function manageOperations(User $user, Store $store): bool
    {
        return $this->manageMasterData($user, $store);
    }

    public function viewPurchasing(User $user, Store $store): bool
    {
        return $this->viewOperations($user, $store);
    }

    public function managePurchasing(User $user, Store $store): bool
    {
        return $this->manageOperations($user, $store);
    }

    public function viewSales(User $user, Store $store): bool
    {
        return $this->viewOperations($user, $store);
    }

    public function manageSales(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->hasActiveMembership($user, $store);
    }

    public function manageSaleReturns(User $user, Store $store): bool
    {
        return $this->manageOperations($user, $store);
    }

    public function viewExpenses(User $user, Store $store): bool
    {
        return $this->manageOperations($user, $store);
    }

    public function manageExpenses(User $user, Store $store): bool
    {
        return $this->manageOperations($user, $store);
    }

    public function viewReports(User $user, Store $store): bool
    {
        return $this->manageOperations($user, $store);
    }

    public function viewSubscription(User $user, Store $store): bool
    {
        return $this->manageMasterData($user, $store);
    }

    private function hasActiveMembership(User $user, Store $store): bool
    {
        return $store->users()
            ->whereKey($user->id)
            ->wherePivot('status', MembershipStatus::Active->value)
            ->exists();
    }

    private function hasActiveOwnerMembership(User $user, Store $store): bool
    {
        return $store->users()
            ->whereKey($user->id)
            ->wherePivot('role', MembershipRole::Owner->value)
            ->wherePivot('status', MembershipStatus::Active->value)
            ->exists();
    }
}
