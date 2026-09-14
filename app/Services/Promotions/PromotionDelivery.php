<?php

namespace App\Services\Promotions;

use App\Enums\PromotionPlacement;
use App\Models\Promotion;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Schema;

class PromotionDelivery
{
    /** @return Collection<int, Promotion> */
    public function dashboardBanners(string $locale): Collection
    {
        return $this->forPlacement(PromotionPlacement::DashboardBanner, $locale);
    }

    /** @return Collection<int, Promotion> */
    public function appOpenPromotions(string $locale): Collection
    {
        return $this->forPlacement(PromotionPlacement::AppOpen, $locale);
    }

    public function isDeliverable(Promotion $promotion, string $locale): bool
    {
        return Promotion::query()
            ->whereKey($promotion->getKey())
            ->eligible($locale)
            ->exists();
    }

    /** @return array{public_id:string,name:string,image_url:string,destination_url:?string,updated_at:string} */
    public function bannerPayload(Promotion $promotion): array
    {
        return [
            'public_id' => $promotion->public_id,
            'name' => $promotion->name,
            'image_url' => $this->imageUrl($promotion),
            'destination_url' => $promotion->destination_url,
            'updated_at' => $promotion->updated_at->toISOString(),
        ];
    }

    /** @return array{public_id:string,name:string,image_url:string,destination_url:?string,frequency:string,updated_at:string} */
    public function appOpenPayload(Promotion $promotion): array
    {
        return [
            ...$this->bannerPayload($promotion),
            'frequency' => $promotion->frequency === null ? 'once_per_day' : $promotion->frequency->value,
        ];
    }

    /** @return Collection<int, Promotion> */
    private function forPlacement(PromotionPlacement $placement, string $locale): Collection
    {
        if (! Schema::hasTable('promotions')) {
            return new Collection;
        }

        return Promotion::query()
            ->where('placement', $placement->value)
            ->eligible($locale)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();
    }

    private function imageUrl(Promotion $promotion): string
    {
        $version = substr(hash('sha256', $promotion->image_path.'|'.$promotion->updated_at->format('U.u')), 0, 12);

        return route('promotions.image', ['promotion' => $promotion, 'v' => $version]);
    }
}
