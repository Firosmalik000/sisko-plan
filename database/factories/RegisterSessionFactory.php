<?php

namespace Database\Factories;

use App\Models\BusinessMembership;
use App\Models\Register;
use App\Models\RegisterSession;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RegisterSession> */
class RegisterSessionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'register_id' => Register::factory(),
            'opened_by_business_membership_id' => BusinessMembership::factory(),
            'currency_code' => 'IDR',
            'opening_cash' => '0',
            'opened_at' => now(),
            'status' => 'open',
        ];
    }
}
