<?php

namespace Database\Factories;

use App\Enums\DistributionPartnerStatus;
use App\Models\DistributionPartner;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<DistributionPartner> */
class DistributionPartnerFactory extends Factory
{
    protected $model = DistributionPartner::class;

    public function definition(): array
    {
        $name = fake()->company();

        return [
            'name' => $name,
            'legal_name' => $name.' Pte Ltd',
            'logo_url' => 'https://cdn.example.test/logos/'.fake()->uuid().'.png',
            'contact' => [
                'email' => fake()->companyEmail(),
                'phone' => fake()->e164PhoneNumber(),
                'cta_url' => 'https://wa.me/'.fake()->numerify('###########'),
            ],
            'status' => DistributionPartnerStatus::Active,
            'service_markets' => ['ID', 'MY'],
            'disclosure_label' => 'Disponsori',
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['status' => DistributionPartnerStatus::Inactive]);
    }
}
