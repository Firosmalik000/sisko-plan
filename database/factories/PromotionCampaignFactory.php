<?php

namespace Database\Factories;

use App\Enums\PromotionCampaignStatus;
use App\Models\DistributionPartner;
use App\Models\PromotionCampaign;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<PromotionCampaign> */
class PromotionCampaignFactory extends Factory
{
    protected $model = PromotionCampaign::class;

    public function definition(): array
    {
        return [
            'partner_id' => DistributionPartner::factory(),
            'catalog_item_id' => null,
            'allowed_placements' => ['catalog_list', 'catalog_detail'],
            'localized_copy' => [
                'id' => ['headline' => 'Promo spesial'],
                'en' => ['headline' => 'Special promo'],
            ],
            'active_from' => now()->subDay(),
            'active_until' => now()->addMonth(),
            'market_targeting' => ['ID'],
            'disclosure_label' => 'Disponsori',
            'priority' => fake()->numberBetween(0, 100),
            'status' => PromotionCampaignStatus::Active,
        ];
    }

    public function paused(): static
    {
        return $this->state(fn (): array => ['status' => PromotionCampaignStatus::Paused]);
    }
}
