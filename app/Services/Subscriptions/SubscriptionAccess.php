<?php

namespace App\Services\Subscriptions;

use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionAccess
{
    public function __construct(
        private SubscriptionPeriods $periods,
        private SubscriptionEntitlements $entitlements,
    ) {}

    /** @return array{can_write:bool,reason:?string,status:string,plan_name:string,max_stores:int,max_products:int,max_members:int,max_scans:int,stores_used:int,products_used:int,members_used:int,scans_used:int,scan_period_start:?string,scan_period_end:?string} */
    public function summary(Store $store): array
    {
        $subscription = $this->subscriptionFor($store);
        $storesUsed = $this->storesUsed($store->owner_user_id);
        $productsUsed = Product::query()
            ->where('is_active', true)
            ->whereHas('store', fn ($query) => $query
                ->where('owner_user_id', $store->owner_user_id)
                ->where('status', '!=', StoreStatus::Archived->value))
            ->count();
        $membersUsed = $this->activeMembersCount($store->owner_user_id);

        if ($subscription === null) {
            return [
                'can_write' => false,
                'reason' => __('The account does not have a subscription yet.'),
                'status' => 'missing',
                'plan_name' => __('No plans available'),
                'max_stores' => 0,
                'max_products' => 0,
                'max_members' => 0,
                'max_scans' => 0,
                'stores_used' => $storesUsed,
                'products_used' => $productsUsed,
                'members_used' => $membersUsed,
                'scans_used' => 0,
                'scan_period_start' => null,
                'scan_period_end' => null,
            ];
        }

        $reason = $this->blockedReason($subscription);
        $limits = $this->entitlements->forOwner($store->owner_user_id, $subscription->plan);

        return [
            'can_write' => $reason === null,
            'reason' => $reason === null ? null : str(__($reason))->toString(),
            'status' => $subscription->status->value,
            'plan_name' => $subscription->plan->name,
            'max_stores' => $limits['max_stores'],
            'max_products' => $limits['max_products'],
            'max_members' => $limits['max_members'],
            'max_scans' => $limits['max_scans'],
            'stores_used' => $storesUsed,
            'products_used' => $productsUsed,
            'members_used' => $membersUsed,
            'scans_used' => $limits['scans_used'],
            'scan_period_start' => $limits['scan_period_start'],
            'scan_period_end' => $limits['scan_period_end'],
        ];
    }

    public function assertCanWrite(Store $store): void
    {
        $reason = $this->blockedReasonFor($store);

        if ($reason !== null) {
            throw ValidationException::withMessages([
                'subscription' => __('Store portal access is disabled. :reason', [
                    'reason' => __($reason),
                ]),
            ]);
        }
    }

    public function blockedReasonFor(Store $store): ?string
    {
        $subscription = $this->subscriptionFor($store);

        return $subscription === null
            ? 'The account does not have a subscription yet.'
            : $this->blockedReason($subscription);
    }

    public function assertStoreCapacity(User $owner): void
    {
        User::query()->whereKey($owner->id)->lockForUpdate()->firstOrFail();
        $state = $this->storeCreationState($owner);

        if (! $state['can_create']) {
            throw ValidationException::withMessages(['name' => $state['reason']]);
        }
    }

    /** @return array{can_create:bool,reason:?string,plan_name:string,stores_used:int,max_stores:int} */
    public function storeCreationState(User $owner): array
    {
        $this->periods->syncForOwner($owner->id);
        $subscription = Subscription::query()->with('plan')->where('user_id', $owner->id)->first();
        $plan = ($subscription === null ? null : $subscription->plan)
            ?? Plan::query()->where(['is_default' => true, 'is_active' => true])->firstOrFail();
        $storesUsed = $this->storesUsed($owner->id);
        $reason = null;

        if ($subscription !== null && ($blockedReason = $this->blockedReason($subscription)) !== null) {
            $reason = str(__('A new store cannot be created. :reason', [
                'reason' => __($blockedReason),
            ]))->toString();
        }

        $limit = $this->entitlements->forOwner($owner->id, $plan)['max_stores'];
        if ($reason === null && $limit > 0 && $storesUsed >= $limit) {
            $reason = str(__('The limit of :limit stores for the :plan plan has been reached.', [
                'limit' => $limit,
                'plan' => $plan->name,
            ]))->toString();
        }

        return [
            'can_create' => $reason === null,
            'reason' => $reason,
            'plan_name' => $plan->name,
            'stores_used' => $storesUsed,
            'max_stores' => $limit,
        ];
    }

    public function assertProductCapacity(Store $store): void
    {
        $subscription = $this->lockedSubscriptionFor($store);
        $this->assertOperational($subscription);
        $limit = $this->entitlements->forOwner($store->owner_user_id, $subscription->plan)['max_products'];
        $productsUsed = Product::query()
            ->where('is_active', true)
            ->whereHas('store', fn ($query) => $query
                ->where('owner_user_id', $store->owner_user_id)
                ->where('status', '!=', StoreStatus::Archived->value))
            ->count();

        if ($limit > 0 && $productsUsed >= $limit) {
            throw ValidationException::withMessages([
                'name' => __('The limit of :limit active products across all stores for the :plan plan has been reached.', [
                    'limit' => $limit,
                    'plan' => $subscription->plan->name,
                ]),
            ]);
        }
    }

    public function assertMemberCapacity(Store $store, ?int $memberId = null): void
    {
        $subscription = $this->lockedSubscriptionFor($store);
        $this->assertOperational($subscription);

        if ($memberId !== null && $this->isActiveAccountMember($store->owner_user_id, $memberId)) {
            return;
        }

        $limit = $this->entitlements->forOwner($store->owner_user_id, $subscription->plan)['max_members'];
        if ($limit > 0 && $this->activeMembersCount($store->owner_user_id) >= $limit) {
            throw ValidationException::withMessages([
                'email' => __('The limit of :limit active staff across all stores for the :plan plan has been reached.', [
                    'limit' => $limit,
                    'plan' => $subscription->plan->name,
                ]),
            ]);
        }
    }

    public function assertPlanCapacity(User $owner, Plan $plan): void
    {
        $limits = $this->entitlements->forOwner($owner->id, $plan);
        $storesUsed = $this->storesUsed($owner->id);
        $productsUsed = Product::query()
            ->where('is_active', true)
            ->whereHas('store', fn ($query) => $query
                ->where('owner_user_id', $owner->id)
                ->where('status', '!=', StoreStatus::Archived->value))
            ->count();
        $membersUsed = $this->activeMembersCount($owner->id);

        $messages = [];
        if ($limits['max_stores'] > 0 && $storesUsed > $limits['max_stores']) {
            $messages[] = __(':used active stores exceed the limit of :limit.', [
                'used' => $storesUsed,
                'limit' => $limits['max_stores'],
            ]);
        }
        if ($limits['max_products'] > 0 && $productsUsed > $limits['max_products']) {
            $messages[] = __(':used active products exceed the limit of :limit.', [
                'used' => $productsUsed,
                'limit' => $limits['max_products'],
            ]);
        }
        if ($limits['max_members'] > 0 && $membersUsed > $limits['max_members']) {
            $messages[] = __(':used active staff exceed the limit of :limit.', [
                'used' => $membersUsed,
                'limit' => $limits['max_members'],
            ]);
        }

        if ($messages !== []) {
            throw ValidationException::withMessages([
                'plan_id' => __('The plan cannot be selected: :reasons', [
                    'reasons' => implode(' ', $messages),
                ]),
            ]);
        }
    }

    private function subscriptionFor(Store $store): ?Subscription
    {
        $this->periods->syncForOwner($store->owner_user_id);

        return Subscription::query()->with('plan')->where('user_id', $store->owner_user_id)->first();
    }

    private function lockedSubscriptionFor(Store $store): Subscription
    {
        $this->periods->syncForOwner($store->owner_user_id);

        return Subscription::query()
            ->with('plan')
            ->where('user_id', $store->owner_user_id)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function assertOperational(Subscription $subscription): void
    {
        if (($reason = $this->blockedReason($subscription)) !== null) {
            throw ValidationException::withMessages([
                'subscription' => __('Store portal access is disabled. :reason', [
                    'reason' => __($reason),
                ]),
            ]);
        }
    }

    private function activeMembersCount(int $ownerId): int
    {
        return DB::table('store_memberships')
            ->join('stores', 'stores.id', '=', 'store_memberships.store_id')
            ->where('stores.owner_user_id', $ownerId)
            ->where('stores.status', '!=', StoreStatus::Archived->value)
            ->where('store_memberships.user_id', '!=', $ownerId)
            ->where('store_memberships.status', MembershipStatus::Active->value)
            ->distinct()
            ->count('store_memberships.user_id');
    }

    private function isActiveAccountMember(int $ownerId, int $memberId): bool
    {
        return DB::table('store_memberships')
            ->join('stores', 'stores.id', '=', 'store_memberships.store_id')
            ->where('stores.owner_user_id', $ownerId)
            ->where('stores.status', '!=', StoreStatus::Archived->value)
            ->where('store_memberships.user_id', $memberId)
            ->where('store_memberships.status', MembershipStatus::Active->value)
            ->exists();
    }

    public function blockedReason(Subscription $subscription): ?string
    {
        $now = CarbonImmutable::now();
        if ($subscription->starts_at->gt($now)) {
            return 'The subscription has not started yet.';
        }

        if ($subscription->status === SubscriptionStatus::Trialing) {
            if ($subscription->trial_ends_at === null) {
                return 'The trial end date has not been set.';
            }

            return $subscription->trial_ends_at->endOfDay()->lt($now)
                ? 'The subscription trial has ended.' : null;
        }
        if ($subscription->status === SubscriptionStatus::Active) {
            if ($subscription->current_period_start === null) {
                return 'The subscription period has not been set.';
            }
            if ($subscription->current_period_start->startOfDay()->gt($now)) {
                return 'The subscription period has not started.';
            }

            return $subscription->current_period_end !== null && $subscription->current_period_end->endOfDay()->lt($now)
                ? 'The subscription period has ended.'
                : null;
        }

        return match ($subscription->status) {
            SubscriptionStatus::PastDue => 'The subscription payment is overdue.',
            SubscriptionStatus::Suspended => 'The subscription has been suspended by the platform.',
            SubscriptionStatus::Cancelled => 'The subscription has been cancelled.',
        };
    }

    private function storesUsed(int $ownerId): int
    {
        return Store::query()
            ->where('owner_user_id', $ownerId)
            ->where('status', '!=', StoreStatus::Archived->value)
            ->count();
    }
}
