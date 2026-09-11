<?php

namespace Database\Factories;

use App\Enums\CatalogAvailabilityStatus;
use App\Models\DistributionCatalogItem;
use App\Models\DistributionPartner;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DistributionCatalogItem> */
class DistributionCatalogItemFactory extends Factory
{
    protected $model = DistributionCatalogItem::class;

    public function definition(): array
    {
        return [
            'partner_id' => DistributionPartner::factory(),
            'partner_sku' => strtoupper(fake()->bothify('SKU-####??')),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(12),
            'image_url' => 'https://cdn.example.test/items/'.fake()->uuid().'.jpg',
            'sales_unit' => fake()->randomElement(['carton', 'box', 'pack', 'unit']),
            'min_quantity' => (string) fake()->numberBetween(1, 10),
            'indicative_price_amount' => number_format(fake()->numberBetween(10000, 500000), 4, '.', ''),
            'currency_code' => 'IDR',
            'availability_status' => CatalogAvailabilityStatus::Available,
            'market_targeting' => ['ID'],
            'valid_from' => now()->subDay(),
            'valid_until' => now()->addMonth(),
            'revision' => 1,
        ];
    }

    /**
     * @param  array<int, string>  $markets
     */
    public function markets(array $markets): static
    {
        return $this->state(fn (): array => ['market_targeting' => $markets]);
    }

    public function validWindow(?string $from, ?string $until): static
    {
        return $this->state(fn (): array => ['valid_from' => $from, 'valid_until' => $until]);
    }

    public function unavailable(): static
    {
        return $this->state(fn (): array => ['availability_status' => CatalogAvailabilityStatus::Discontinued]);
    }
}
