<?php

namespace App\Support\Distribution;

use App\Enums\CatalogAvailabilityStatus;
use App\Enums\PromotionCampaignStatus;
use App\Models\DistributionCatalogItem;
use App\Models\PromotionCampaign;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Query katalog distribusi market-aware + resolusi sponsorship (design §11,
 * Req 20.1, 20.7). Dipakai bersama index & show controller (DRY).
 *
 * Visibilitas item: `market_targeting` mencakup market DAN sekarang berada
 * dalam `valid_from`/`valid_until` DAN `availability_status = available`.
 * Sponsorship: ada `PromotionCampaign` aktif (status active + dalam active
 * window + market cocok) yang menunjuk item tersebut.
 */
final class CatalogQuery
{
    /**
     * Builder item yang visible untuk `market` pada waktu `now`.
     *
     * @return Builder<DistributionCatalogItem>
     */
    public static function visible(string $market, ?Carbon $now = null): Builder
    {
        $now ??= Carbon::now();

        return DistributionCatalogItem::query()
            ->with('partner')
            ->where('availability_status', CatalogAvailabilityStatus::Available->value)
            ->whereJsonContains('market_targeting', $market)
            ->where(function (Builder $window) use ($now): void {
                $window->whereNull('valid_from')->orWhere('valid_from', '<=', $now);
            })
            ->where(function (Builder $window) use ($now): void {
                $window->whereNull('valid_until')->orWhere('valid_until', '>=', $now);
            });
    }

    /**
     * Peta `catalog_item_id => disclosure_label` untuk item yang punya kampanye
     * promosi aktif di `market` pada `now`. Bila lebih dari satu, kampanye
     * priority tertinggi menang.
     *
     * @param  array<int, int>  $itemIds
     * @return array<int, string>
     */
    public static function sponsorshipMap(array $itemIds, string $market, ?Carbon $now = null): array
    {
        if ($itemIds === []) {
            return [];
        }

        $now ??= Carbon::now();

        /** @var Collection<int, PromotionCampaign> $campaigns */
        $campaigns = PromotionCampaign::query()
            ->whereIn('catalog_item_id', $itemIds)
            ->where('status', PromotionCampaignStatus::Active->value)
            ->whereJsonContains('market_targeting', $market)
            ->where(function (Builder $window) use ($now): void {
                $window->whereNull('active_from')->orWhere('active_from', '<=', $now);
            })
            ->where(function (Builder $window) use ($now): void {
                $window->whereNull('active_until')->orWhere('active_until', '>=', $now);
            })
            ->orderByDesc('priority')
            ->get();

        $map = [];
        foreach ($campaigns as $campaign) {
            $itemId = $campaign->catalog_item_id;
            // orderByDesc('priority') → kampanye pertama per item = prioritas tertinggi.
            if ($itemId !== null && ! array_key_exists($itemId, $map)) {
                $map[$itemId] = $campaign->disclosure_label;
            }
        }

        return $map;
    }
}
