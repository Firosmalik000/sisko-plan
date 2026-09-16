<?php

namespace App\Services\Subscriptions;

use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Business;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Validation\ValidationException;

class SubscriptionAccess
{
    public function __construct(
        private SubscriptionPeriods $periods,
        private SubscriptionEntitlements $entitlements,
    ) {}

    /** @return array{can_write:bool,reason:?string,status:string,plan_name:string,max_stores:int,max_products:int,max_members:int,max_scans:int,stores_used:int,products_used:int,members_used:int,scans_used:int,scan_period_start:?string,scan_period_end:?string} */
    public function summary(Business|Store $subject): array
    {
        return $this->businessSummary($subject instanceof Business ? $subject : $subject->business);
    }

    /** @return array{can_write:bool,reason:?string,status:string,plan_name:string,max_stores:int,max_products:int,max_members:int,max_scans:int,stores_used:int,products_used:int,members_used:int,scans_used:int,scan_period_start:?string,scan_period_end:?string} */
    private function businessSummary(Business $business): array
    {
        $subscription = Subscription::query()->with('plan')->where('business_id', $business->id)->first();
        $storesUsed = $business->stores()->where('status', '!=', StoreStatus::Archived->value)->count();
        $productsUsed = Product::query()->where('is_active', true)
            ->whereHas('store', fn ($query) => $query->where('business_id', $business->id)->where('status', '!=', StoreStatus::Archived->value))
            ->count();
        $membersUsed = $business->memberships()
            ->where('business_role', '!=', 'owner')
            ->where('status', MembershipStatus::Active->value)
            ->count();

        if ($subscription === null) {
            return [
                'can_write' => false, 'reason' => __('The account does not have a subscription yet.'),
                'status' => 'missing', 'plan_name' => __('No plans available'),
                'max_stores' => 0, 'max_products' => 0, 'max_members' => 0, 'max_scans' => 0,
                'stores_used' => $storesUsed, 'products_used' => $productsUsed, 'members_used' => $membersUsed,
                'scans_used' => 0, 'scan_period_start' => null, 'scan_period_end' => null,
            ];
        }

        $reason = $this->blockedReason($subscription);
        $limits = $this->entitlements->forBusiness($business, $subscription->plan);

        return [
            'can_write' => $reason === null,
            'reason' => $reason === null ? null : str(__($reason))->toString(),
            'status' => $subscription->status->value,
            'plan_name' => $subscription->plan->name,
            'max_stores' => $limits['max_stores'], 'max_products' => $limits['max_products'],
            'max_members' => $limits['max_members'], 'max_scans' => $limits['max_scans'],
            'stores_used' => $storesUsed, 'products_used' => $productsUsed, 'members_used' => $membersUsed,
            'scans_used' => $limits['scans_used'], 'scan_period_start' => $limits['scan_period_start'],
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

    public function assertStoreCapacity(Business $business): void
    {
        Business::query()->whereKey($business->id)->lockForUpdate()->firstOrFail();
        $state = $this->storeCreationState($business);

        if (! $state['can_create']) {
            throw ValidationException::withMessages(['name' => $state['reason']]);
        }
    }

    /** @return array{can_create:bool,reason:?string,plan_name:string,stores_used:int,max_stores:int} */
    public function storeCreationState(Business $business): array
    {
        $this->periods->syncForBusiness($business->id);
        $subscription = Subscription::query()->with('plan')->where('business_id', $business->id)->first();
        $plan = $subscription === null
            ? Plan::query()->where(['is_default' => true, 'is_active' => true])->firstOrFail()
            : $subscription->plan;
        $storesUsed = $business->stores()->where('status', '!=', StoreStatus::Archived->value)->count();
        $reason = $subscription === null ? null : $this->blockedReason($subscription);
        $limit = $this->entitlements->forBusiness($business, $plan)['max_stores'];
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
        $limit = $this->entitlements->forBusiness($store->business_id, $subscription->plan)['max_products'];
        $productsUsed = Product::query()
            ->where('is_active', true)
            ->whereHas('store', fn ($query) => $query
                ->where('business_id', $store->business_id)
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

    public function assertBusinessMemberCapacity(Business $business, ?int $membershipId = null): void
    {
        Business::query()->whereKey($business->id)->lockForUpdate()->firstOrFail();
        $subscription = Subscription::query()->with('plan')->where('business_id', $business->id)->lockForUpdate()->firstOrFail();
        $this->assertOperational($subscription);

        if ($membershipId !== null && $business->memberships()->whereKey($membershipId)
            ->where('business_role', '!=', 'owner')->where('status', MembershipStatus::Active->value)->exists()) {
            return;
        }

        $limit = $this->entitlements->forBusiness($business, $subscription->plan)['max_members'];
        $used = $business->memberships()->where('business_role', '!=', 'owner')
            ->where('status', MembershipStatus::Active->value)->count();
        if ($limit > 0 && $used >= $limit) {
            throw ValidationException::withMessages([
                'email' => __('The limit of :limit active staff across all stores for the :plan plan has been reached.', [
                    'limit' => $limit, 'plan' => $subscription->plan->name,
                ]),
            ]);
        }
    }

    public function assertPlanCapacity(Business $business, Plan $plan): void
    {
        $limits = $this->entitlements->forBusiness($business, $plan);
        $storesUsed = $business->stores()->where('status', '!=', StoreStatus::Archived->value)->count();
        $productsUsed = Product::query()
            ->where('is_active', true)
            ->whereHas('store', fn ($query) => $query
                ->where('business_id', $business->id)
                ->where('status', '!=', StoreStatus::Archived->value))
            ->count();
        $membersUsed = $business->memberships()->where('business_role', '!=', 'owner')
            ->where('status', MembershipStatus::Active->value)->count();

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
        $this->periods->syncForBusiness($store->business_id);

        return Subscription::query()->with('plan')->where('business_id', $store->business_id)->first();
    }

    private function lockedSubscriptionFor(Store $store): Subscription
    {
        $this->periods->syncForBusiness($store->business_id);

        return Subscription::query()
            ->with('plan')
            ->where('business_id', $store->business_id)
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
}
