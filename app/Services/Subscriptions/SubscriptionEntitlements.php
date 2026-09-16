<?php

namespace App\Services\Subscriptions;

use App\Models\Business;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionAddon;
use App\Models\SubscriptionScanUsage;
use Carbon\CarbonImmutable;

class SubscriptionEntitlements
{
    /** @return array{max_stores:int,max_products:int,max_members:int,max_scans:int,scans_used:int,scan_period_start:string,scan_period_end:string} */
    public function forBusiness(Business|int $business, ?Plan $basePlan = null): array
    {
        $businessId = $business instanceof Business ? $business->id : $business;
        if ($basePlan === null) {
            $subscription = Subscription::query()->with('plan')->where('business_id', $businessId)->first();
            $basePlan = $subscription === null
                ? Plan::query()->where(['kind' => Plan::KIND_BASE, 'is_default' => true, 'is_active' => true])->firstOrFail()
                : $subscription->plan;
        }
        $today = CarbonImmutable::now('UTC')->startOfDay();
        $addons = SubscriptionAddon::query()
            ->where('business_id', $businessId)
            ->whereDate('starts_on', '<=', $today)
            ->where(fn ($query) => $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', $today))
            ->get(['stores', 'products', 'members', 'scans']);
        $periodStart = $today->startOfMonth();
        $periodEnd = $today->endOfMonth();
        $scansUsed = SubscriptionScanUsage::query()
            ->where('business_id', $businessId)
            ->where('period_start', $periodStart->toDateString())
            ->value('used') ?? 0;

        return [
            'max_stores' => $this->withAddons($basePlan->max_stores, $addons->sum('stores')),
            'max_products' => $this->withAddons($basePlan->max_products, $addons->sum('products')),
            'max_members' => $this->withAddons($basePlan->max_members, $addons->sum('members')),
            'max_scans' => $this->withAddons($basePlan->max_scans, $addons->sum('scans')),
            'scans_used' => (int) $scansUsed,
            'scan_period_start' => $periodStart->toDateString(),
            'scan_period_end' => $periodEnd->toDateString(),
        ];
    }

    private function withAddons(int $base, int $additional): int
    {
        return $base === 0 ? 0 : $base + $additional;
    }
}
