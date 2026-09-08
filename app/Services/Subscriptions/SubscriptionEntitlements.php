<?php

namespace App\Services\Subscriptions;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionAddon;
use App\Models\SubscriptionScanUsage;
use Carbon\CarbonImmutable;

class SubscriptionEntitlements
{
    private const USAGE_TIMEZONE = 'Asia/Jakarta';

    /** @return array{max_stores:int,max_products:int,max_members:int,max_scans:int,scans_used:int,scan_period_start:string,scan_period_end:string} */
    public function forOwner(int $ownerId, ?Plan $basePlan = null): array
    {
        $basePlan ??= Subscription::query()->with('plan')->where('user_id', $ownerId)->first()?->plan
            ?? Plan::query()->where(['kind' => Plan::KIND_BASE, 'is_default' => true, 'is_active' => true])->firstOrFail();
        $today = CarbonImmutable::now(self::USAGE_TIMEZONE)->startOfDay();
        $addons = SubscriptionAddon::query()
            ->where('user_id', $ownerId)
            ->whereDate('starts_on', '<=', $today)
            ->where(fn ($query) => $query->whereNull('ends_on')->orWhereDate('ends_on', '>=', $today))
            ->get(['stores', 'products', 'members', 'scans']);
        $periodStart = $today->startOfMonth();
        $periodEnd = $today->endOfMonth();
        $scansUsed = SubscriptionScanUsage::query()
            ->where('user_id', $ownerId)
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
