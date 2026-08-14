<?php

namespace App\Services\Subscriptions;

use App\Enums\MembershipStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Product;
use App\Models\Store;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionAccess
{
    /** @return array{can_write:bool,reason:?string,status:string,plan_name:string,max_products:int,max_members:int,products_used:int,members_used:int} */
    public function summary(Store $store): array
    {
        $subscription = Subscription::query()->with('plan')->where('store_id', $store->id)->first();
        $productsUsed = Product::query()->where(['store_id' => $store->id, 'is_active' => true])->count();
        $membersUsed = DB::table('store_user')->where(['store_id' => $store->id, 'status' => MembershipStatus::Active->value])->count();
        if ($subscription === null) {
            return ['can_write' => false, 'reason' => 'Toko belum memiliki subscription.', 'status' => 'missing', 'plan_name' => 'Belum ada paket', 'max_products' => 0, 'max_members' => 0, 'products_used' => $productsUsed, 'members_used' => $membersUsed];
        }
        $reason = $this->blockedReason($subscription);

        return [
            'can_write' => $reason === null,
            'reason' => $reason,
            'status' => $subscription->status->value,
            'plan_name' => $subscription->plan->name,
            'max_products' => $subscription->plan->max_products,
            'max_members' => $subscription->plan->max_members,
            'products_used' => $productsUsed,
            'members_used' => $membersUsed,
        ];
    }

    public function assertCanWrite(Store $store): void
    {
        $subscription = Subscription::query()->with('plan')->where('store_id', $store->id)->first();
        $reason = $subscription === null ? 'Toko belum memiliki subscription.' : $this->blockedReason($subscription);
        if ($reason !== null) {
            throw ValidationException::withMessages(['subscription' => $reason.' Data tetap dapat dilihat, tetapi perubahan baru dinonaktifkan.']);
        }
    }

    public function assertProductCapacity(Store $store): void
    {
        Store::query()->whereKey($store->id)->lockForUpdate()->firstOrFail();
        $this->assertCanWrite($store);
        $subscription = Subscription::query()->with('plan')->where('store_id', $store->id)->lockForUpdate()->firstOrFail();
        $limit = $subscription->plan->max_products;
        if ($limit > 0 && Product::query()->where(['store_id' => $store->id, 'is_active' => true])->count() >= $limit) {
            throw ValidationException::withMessages(['name' => "Batas {$limit} produk aktif pada paket {$subscription->plan->name} sudah tercapai."]);
        }
    }

    public function assertMemberCapacity(Store $store): void
    {
        Store::query()->whereKey($store->id)->lockForUpdate()->firstOrFail();
        $this->assertCanWrite($store);
        $subscription = Subscription::query()->with('plan')->where('store_id', $store->id)->lockForUpdate()->firstOrFail();
        $limit = $subscription->plan->max_members;
        $activeMembers = DB::table('store_user')->where(['store_id' => $store->id, 'status' => MembershipStatus::Active->value])->count();
        if ($limit > 0 && $activeMembers >= $limit) {
            throw ValidationException::withMessages(['email' => "Batas {$limit} anggota aktif pada paket {$subscription->plan->name} sudah tercapai."]);
        }
    }

    private function blockedReason(Subscription $subscription): ?string
    {
        $now = CarbonImmutable::now();
        if ($subscription->status === SubscriptionStatus::Trialing) {
            return $subscription->trial_ends_at !== null && $subscription->trial_ends_at->endOfDay()->lt($now)
                ? 'Masa trial subscription telah berakhir.'
                : null;
        }
        if ($subscription->status === SubscriptionStatus::Active) {
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
