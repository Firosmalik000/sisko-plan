<?php

namespace Database\Factories;

use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Models\Register;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Register> */
class RegisterFactory extends Factory
{
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'name' => fake()->randomElement(['Kasir Utama', 'Kasir Depan']),
            'cash_financial_account_id' => FinancialAccount::factory()->state(['type' => FinancialAccountType::Cash]),
            'status' => 'active',
        ];
    }
}
