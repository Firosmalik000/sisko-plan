<?php

namespace App\Policies;

use App\Enums\StoreStatus;
use App\Models\Store;
use App\Models\User;
use App\Support\BusinessCapability;

class StorePolicy
{
    public function __construct(private BusinessCapability $capabilities) {}

    public function view(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allowsAny($user, $store, ['store.manage', 'catalog.manage', 'inventory.manage', 'inventory.count', 'purchasing.manage', 'sales.checkout', 'sales.view-all', 'sales.view-own']);
    }

    public function update(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allows($user, $store, 'store.manage');
    }

    public function manageMembers(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allows($user, $store, 'members.manage');
    }

    public function viewManagement(User $user, Store $store): bool
    {
        return in_array($store->status, [StoreStatus::Active, StoreStatus::Archived], true)
            && $this->allows($user, $store, 'store.manage');
    }

    public function archive(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allows($user, $store, 'store.manage');
    }

    public function restore(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Archived
            && $this->allows($user, $store, 'store.manage');
    }

    public function deletePermanently(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Archived
            && $this->allows($user, $store, 'business.manage');
    }

    public function switch(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allowsAny($user, $store, ['store.manage', 'catalog.manage', 'inventory.manage', 'inventory.count', 'purchasing.manage', 'sales.checkout']);
    }

    public function viewMasterData(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allowsAny($user, $store, ['catalog.manage', 'sales.checkout']);
    }

    public function manageMasterData(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active && $this->allows($user, $store, 'catalog.manage');
    }

    public function viewOperations(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allowsAny($user, $store, ['inventory.manage', 'inventory.count', 'purchasing.manage', 'purchasing.view', 'cash.view', 'expenses.manage', 'sales.checkout', 'sales.view-all', 'sales.view-own']);
    }

    public function manageOperations(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allowsAny($user, $store, ['inventory.manage', 'purchasing.manage', 'cash.view', 'expenses.manage', 'sales.view-all', 'reports.view']);
    }

    public function countStock(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allowsAny($user, $store, ['inventory.count', 'inventory.manage']);
    }

    public function manageStockCounts(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active && $this->allows($user, $store, 'inventory.manage');
    }

    public function viewPurchasing(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allowsAny($user, $store, ['purchasing.manage', 'purchasing.view']);
    }

    public function managePurchasing(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active && $this->allows($user, $store, 'purchasing.manage');
    }

    public function viewSales(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allowsAny($user, $store, ['sales.view-all', 'sales.view-own']);
    }

    public function manageSales(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allows($user, $store, 'sales.checkout');
    }

    public function manageSaleReturns(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active && $this->allows($user, $store, 'sales.view-all');
    }

    public function viewExpenses(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active && $this->allows($user, $store, 'expenses.manage');
    }

    public function manageExpenses(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active && $this->allows($user, $store, 'expenses.manage');
    }

    public function viewReports(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active && $this->allows($user, $store, 'reports.view');
    }

    public function viewSubscription(User $user, Store $store): bool
    {
        return $store->status === StoreStatus::Active
            && $this->allows($user, $store, 'subscription.manage');
    }

    private function allows(User $user, Store $store, string $capability): bool
    {
        $member = $this->capabilities->memberFor($user, $store);

        return $member !== null && $this->capabilities->allows($member, $capability, $store);
    }

    /** @param list<string> $capabilities */
    private function allowsAny(User $user, Store $store, array $capabilities): bool
    {
        $member = $this->capabilities->memberFor($user, $store);

        return $member !== null && collect($capabilities)->contains(
            fn (string $capability): bool => $this->capabilities->allows($member, $capability, $store),
        );
    }
}
