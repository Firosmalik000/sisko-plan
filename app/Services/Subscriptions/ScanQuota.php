<?php

namespace App\Services\Subscriptions;

use App\Exceptions\ScanQuotaExceeded;
use App\Models\Business;
use App\Models\Store;
use App\Models\SubscriptionScanUsage;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ScanQuota
{
    public function __construct(private SubscriptionEntitlements $entitlements) {}

    public function ensureAvailable(Store $store, string $requestKey, int $units): void
    {
        $limits = $this->entitlements->forBusiness($store->business_id);
        if (DB::table('subscription_scan_events')->where([
            'business_id' => $store->business_id,
            'request_key' => $requestKey,
        ])->exists()) {
            return;
        }

        if ($limits['max_scans'] > 0 && $limits['max_scans'] < $limits['scans_used'] + $units) {
            throw new ScanQuotaExceeded($limits['max_scans'], $limits['scans_used']);
        }
    }

    public function consume(Store $store, string $requestKey, string $operation, int $units = 1): void
    {
        if ($units < 1) {
            return;
        }

        DB::transaction(function () use ($store, $requestKey, $operation, $units): void {
            Business::query()->whereKey($store->business_id)->lockForUpdate()->firstOrFail();
            if (DB::table('subscription_scan_events')->where([
                'business_id' => $store->business_id,
                'request_key' => $requestKey,
            ])->exists()) {
                return;
            }

            $limits = $this->entitlements->forBusiness($store->business_id);
            $periodStart = CarbonImmutable::parse($limits['scan_period_start']);
            $usage = SubscriptionScanUsage::query()->firstOrCreate(
                ['business_id' => $store->business_id, 'period_start' => $periodStart->toDateString()],
                ['period_end' => $periodStart->endOfMonth()->toDateString(), 'used' => 0],
            );
            $usage = SubscriptionScanUsage::query()->whereKey($usage->id)->lockForUpdate()->firstOrFail();
            $nextUsed = $usage->used + $units;

            if ($limits['max_scans'] > 0 && $nextUsed > $limits['max_scans']) {
                throw new ScanQuotaExceeded($limits['max_scans'], $usage->used);
            }

            DB::table('subscription_scan_events')->insert([
                'usage_id' => $usage->id,
                'business_id' => $store->business_id,
                'store_id' => $store->id,
                'request_key' => $requestKey,
                'operation' => $operation,
                'units' => $units,
                'created_at' => now(),
            ]);
            $usage->update(['used' => $nextUsed]);
        }, 3);
    }
}
