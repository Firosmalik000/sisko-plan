<?php

namespace App\Services\Subscriptions;

use App\Exceptions\ScanQuotaExceeded;
use App\Models\Store;
use App\Models\SubscriptionScanUsage;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class ScanQuota
{
    public function __construct(private SubscriptionEntitlements $entitlements) {}

    public function ensureAvailable(Store $store, string $requestKey, int $units): void
    {
        $limits = $this->entitlements->forOwner($store->owner_user_id);
        if (DB::table('subscription_scan_events')->where([
            'user_id' => $store->owner_user_id,
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
            User::query()->whereKey($store->owner_user_id)->lockForUpdate()->firstOrFail();
            if (DB::table('subscription_scan_events')->where([
                'user_id' => $store->owner_user_id,
                'request_key' => $requestKey,
            ])->exists()) {
                return;
            }

            $limits = $this->entitlements->forOwner($store->owner_user_id);
            $periodStart = CarbonImmutable::parse($limits['scan_period_start']);
            $usage = SubscriptionScanUsage::query()->firstOrCreate(
                ['user_id' => $store->owner_user_id, 'period_start' => $periodStart->toDateString()],
                ['period_end' => $periodStart->endOfMonth()->toDateString(), 'used' => 0],
            );
            $usage = SubscriptionScanUsage::query()->whereKey($usage->id)->lockForUpdate()->firstOrFail();
            $nextUsed = $usage->used + $units;

            if ($limits['max_scans'] > 0 && $nextUsed > $limits['max_scans']) {
                throw new ScanQuotaExceeded($limits['max_scans'], $usage->used);
            }

            DB::table('subscription_scan_events')->insert([
                'usage_id' => $usage->id,
                'user_id' => $store->owner_user_id,
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
