<?php

namespace App\Services\Subscriptions;

use App\Models\Store;
use Carbon\CarbonImmutable;

/**
 * Turunkan snapshot kuota scan AI toko dari entitlements owner (design §8, Req
 * 14.1). Sumber kebenaran tunggal untuk bentuk kuota yang dikembalikan
 * `GET /scanner/quota` maupun disertakan pada respons recognitions/discoveries.
 *
 * `limit` = `max_scans`; nilai 0 berarti unlimited (limit=null, remaining=null,
 * unlimited=true). `used` diambil dari `scans_used` pada periode berjalan.
 * `remaining` = max(0, limit - used) untuk plan terbatas. `reset_at` = awal
 * periode berikutnya (batas periode berjalan + 1 hari, ISO-8601 Zulu) sehingga
 * klien tahu kapan kuota di-reset.
 */
class ScannerQuotaSnapshot
{
    public function __construct(private SubscriptionEntitlements $entitlements) {}

    /**
     * @return array{used:int, limit:int|null, remaining:int|null, unlimited:bool, period_start:string, period_end:string, reset_at:string}
     */
    public function forStore(Store $store): array
    {
        $limits = $this->entitlements->forOwner($store->owner_user_id);

        $maxScans = (int) $limits['max_scans'];
        $used = (int) $limits['scans_used'];
        $unlimited = $maxScans <= 0;

        $periodStart = CarbonImmutable::parse($limits['scan_period_start'])->startOfDay();
        $periodEnd = CarbonImmutable::parse($limits['scan_period_end'])->endOfDay();
        $resetAt = $periodEnd->addSecond()->startOfDay();

        return [
            'used' => $used,
            'limit' => $unlimited ? null : $maxScans,
            'remaining' => $unlimited ? null : max(0, $maxScans - $used),
            'unlimited' => $unlimited,
            'period_start' => $periodStart->toIso8601ZuluString(),
            'period_end' => $periodEnd->toIso8601ZuluString(),
            'reset_at' => $resetAt->toIso8601ZuluString(),
        ];
    }
}
