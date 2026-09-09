<?php

namespace Database\Factories;

use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Country;
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
            $store->loadMissing('country');
            $store->settings()->firstOrCreate([], [
                'currency' => $store->country->currency_code ?? 'IDR',
            ]);
            app(StartDefaultSubscription::class)->handle($store);
        });
    }

    public function definition(): array
    {
        return [
            'owner_user_id' => User::factory(),
            'country_id' => fn () => Country::query()->where('code', 'ID')->value('id'),
            'name' => fake()->company(),
            'status' => StoreStatus::Active,
        ];
    }
}
