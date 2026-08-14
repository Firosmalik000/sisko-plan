<?php

namespace Database\Factories;

use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Store> */
class StoreFactory extends Factory
{
    protected $model = Store::class;

    public function configure(): static
    {
        return $this->afterCreating(function (Store $store): void {
            $store->users()->syncWithoutDetaching([
                $store->owner_user_id => [
                    'role' => MembershipRole::Owner->value,
                    'status' => MembershipStatus::Active->value,
                ],
            ]);
            $store->settings()->firstOrCreate();
            app(StartDefaultSubscription::class)->handle($store);
        });
    }

    public function definition(): array
    {
        return [
            'owner_user_id' => User::factory(),
            'name' => fake()->company(),
            'status' => StoreStatus::Active,
        ];
    }
}
