<?php

namespace App\Services\Subscriptions;

use App\Enums\MembershipStatus;
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
    public function __construct(private SubscriptionPeriods $periods) {}

    /** @return array{can_write:bool,reason:?string,status:string,plan_name:string,max_stores:int,max_products:int,max_members:int,stores_used:int,products_used:int,members_used:int} */
    public function summary(Store $store): array
    {
        $subscription = $this->subscriptionFor($store);
        $storesUsed = Store::query()->where('owner_user_id', $store->owner_user_id)->count();
        $productsUsed = Product::query()
            ->where('is_active', true)
            ->whereHas('store', fn ($query) => $query->where('owner_user_id', $store->owner_user_id))
            ->count();
        $membersUsed = $this->activeMembersCount($store->owner_user_id);

        if ($subscription === null) {
            return [
                'can_write' => false,
                'reason' => 'Akun belum memiliki subscription.',
                'status' => 'missing',
                'plan_name' => 'Belum ada paket',
                'max_stores' => 0,
                'max_products' => 0,
                'max_members' => 0,
                'stores_used' => $storesUsed,
                'products_used' => $productsUsed,
                'members_used' => $membersUsed,
            ];
        }

        $reason = $this->blockedReason($subscription);

        return [
            'can_write' => $reason === null,
            'reason' => $reason,
            'status' => $subscription->status->value,
            'plan_name' => $subscription->plan->name,
            'max_stores' => $subscription->plan->max_stores,
            'max_products' => $subscription->plan->max_products,
            'max_members' => $subscription->plan->max_members,
            'stores_used' => $storesUsed,
            'products_used' => $productsUsed,
            'members_used' => $membersUsed,
        ];
    }

    public function assertCanWrite(Store $store): void
    {
        $reason = $this->blockedReasonFor($store);

        if ($reason !== null) {
            throw ValidationException::withMessages([
                'subscription' => $reason.' Akses portal toko dinonaktifkan.',
            ]);
        }
    }

    public function blockedReasonFor(Store $store): ?string
    {
        $subscription = $this->subscriptionFor($store);

        return $subscription === null
            ? 'Akun belum memiliki subscription.'
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
        $storesUsed = Store::query()->where('owner_user_id', $owner->id)->count();
        $reason = null;

        if ($subscription !== null && ($blockedReason = $this->blockedReason($subscription)) !== null) {
            $reason = $blockedReason.' Toko baru tidak dapat dibuat.';
        }

        $limit = $plan->max_stores;
        if ($reason === null && $limit > 0 && $storesUsed >= $limit) {
            $reason = "Batas {$limit} toko pada paket {$plan->name} sudah tercapai.";
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
        $limit = $subscription->plan->max_products;
        $productsUsed = Product::query()
            ->where('is_active', true)
            ->whereHas('store', fn ($query) => $query->where('owner_user_id', $store->owner_user_id))
            ->count();

        if ($limit > 0 && $productsUsed >= $limit) {
            throw ValidationException::withMessages([
                'name' => "Batas {$limit} produk aktif untuk seluruh toko pada paket {$subscription->plan->name} sudah tercapai.",
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

        $limit = $subscription->plan->max_members;
        if ($limit > 0 && $this->activeMembersCount($store->owner_user_id) >= $limit) {
            throw ValidationException::withMessages([
                'email' => "Batas {$limit} staf aktif untuk seluruh toko pada paket {$subscription->plan->name} sudah tercapai.",
            ]);
        }
    }

    public function assertPlanCapacity(User $owner, Plan $plan): void
    {
        $storesUsed = Store::query()->where('owner_user_id', $owner->id)->count();
        $productsUsed = Product::query()
            ->where('is_active', true)
            ->whereHas('store', fn ($query) => $query->where('owner_user_id', $owner->id))
            ->count();
        $membersUsed = $this->activeMembersCount($owner->id);

        $messages = [];
        if ($plan->max_stores > 0 && $storesUsed > $plan->max_stores) {
            $messages[] = "{$storesUsed} toko aktif melebihi batas {$plan->max_stores}.";
        }
        if ($plan->max_products > 0 && $productsUsed > $plan->max_products) {
            $messages[] = "{$productsUsed} produk aktif melebihi batas {$plan->max_products}.";
        }
        if ($plan->max_members > 0 && $membersUsed > $plan->max_members) {
            $messages[] = "{$membersUsed} staf aktif melebihi batas {$plan->max_members}.";
        }

        if ($messages !== []) {
            throw ValidationException::withMessages([
                'plan_id' => 'Paket belum dapat dipilih: '.implode(' ', $messages),
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
                'subscription' => $reason.' Akses portal toko dinonaktifkan.',
            ]);
        }
    }

    private function activeMembersCount(int $ownerId): int
    {
        return DB::table('store_user')
            ->join('stores', 'stores.id', '=', 'store_user.store_id')
            ->where('stores.owner_user_id', $ownerId)
            ->where('store_user.user_id', '!=', $ownerId)
            ->where('store_user.status', MembershipStatus::Active->value)
            ->distinct()
            ->count('store_user.user_id');
    }

    private function isActiveAccountMember(int $ownerId, int $memberId): bool
    {
        return DB::table('store_user')
            ->join('stores', 'stores.id', '=', 'store_user.store_id')
            ->where('stores.owner_user_id', $ownerId)
            ->where('store_user.user_id', $memberId)
            ->where('store_user.status', MembershipStatus::Active->value)
            ->exists();
    }

    public function blockedReason(Subscription $subscription): ?string
    {
        $now = CarbonImmutable::now();
        if ($subscription->starts_at->gt($now)) {
            return 'Subscription belum dimulai.';
        }

        if ($subscription->status === SubscriptionStatus::Trialing) {
            if ($subscription->trial_ends_at === null) {
                return 'Tanggal selesai trial belum ditetapkan.';
            }

            return $subscription->trial_ends_at->endOfDay()->lt($now)
                ? 'Masa trial subscription telah berakhir.' : null;
        }
        if ($subscription->status === SubscriptionStatus::Active) {
            if ($subscription->current_period_start === null) {
                return 'Periode subscription belum ditetapkan.';
            }
            if ($subscription->current_period_start->startOfDay()->gt($now)) {
                return 'Periode subscription belum dimulai.';
            }

            return $subscription->current_period_end !== null && $subscription->current_period_end->endOfDay()->lt($now)
                ? 'Periode subscription telah berakhir.'
                : null;
        }

        return match ($subscription->status) {
            SubscriptionStatus::PastDue => 'Pembayaran subscription melewati jatuh tempo.',
            SubscriptionStatus::Suspended => 'Subscription ditangguhkan oleh platform.',
            SubscriptionStatus::Cancelled => 'Subscription telah dibatalkan.',
        };
    }
}
