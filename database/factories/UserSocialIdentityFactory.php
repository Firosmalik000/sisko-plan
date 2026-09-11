<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserSocialIdentity;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<UserSocialIdentity> */
class UserSocialIdentityFactory extends Factory
{
    protected $model = UserSocialIdentity::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'provider' => 'google',
            'provider_subject' => (string) fake()->unique()->numerify('##################'),
            'email' => fake()->safeEmail(),
        ];
    }

    public function apple(): static
    {
        return $this->state(fn (): array => ['provider' => 'apple']);
    }
}
