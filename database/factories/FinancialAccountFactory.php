<?php

namespace Database\Factories;

use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<FinancialAccount> */
class FinancialAccountFactory extends Factory
{
    protected $model = FinancialAccount::class;

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'name' => fake()->unique()->words(2, true),
            'type' => fake()->randomElement(FinancialAccountType::cases()),
            'account_number' => fake()->optional()->numerify('##########'),
            'notes' => fake()->optional()->sentence(),
            'is_active' => true,
        ];
    }
}
