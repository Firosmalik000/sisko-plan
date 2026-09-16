<?php

namespace Database\Factories;

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BusinessMembership>
 */
class BusinessMembershipFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'business_id' => Business::factory(),
            'user_id' => User::factory(),
            'display_name' => fake()->name(),
            'business_role' => BusinessRole::Staff,
            'status' => MembershipStatus::Active,
            'joined_at' => now(),
        ];
    }

    public function posOnly(): static
    {
        return $this->state(fn (): array => [
            'user_id' => null,
            'business_role' => BusinessRole::Staff,
        ]);
    }
}
