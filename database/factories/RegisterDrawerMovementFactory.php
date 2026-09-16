<?php

namespace Database\Factories;

use App\Models\BusinessMembership;
use App\Models\RegisterDrawerMovement;
use App\Models\RegisterSession;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RegisterDrawerMovement> */
class RegisterDrawerMovementFactory extends Factory
{
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'register_session_id' => RegisterSession::factory(),
            'direction' => 'cash_in',
            'amount' => fake()->randomFloat(2, 1, 100000),
            'reason' => fake()->sentence(),
            'actor_business_membership_id' => BusinessMembership::factory(),
            'occurred_at' => now(),
        ];
    }
}
