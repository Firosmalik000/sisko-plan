<?php

namespace Database\Factories;

use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
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
            $business = $store->business;
            if (! $business->memberships()->where('business_role', BusinessRole::Owner->value)->exists()) {
                $owner = User::factory()->create();
                $this->createOwnerMembership($business, $owner);
            }
            $store->loadMissing('country');
            $store->settings()->firstOrCreate([], [
                'currency' => $store->country->currency_code ?? 'IDR',
                'timezone' => $store->country->default_timezone ?? 'Asia/Jakarta',
            ]);
            app(StartDefaultSubscription::class)->handle($store->business);
        });
    }

    public function ownedBy(User $owner): static
    {
        return $this
            ->state(function () use ($owner): array {
                $membership = $owner->businessMemberships()
                    ->where('business_role', BusinessRole::Owner->value)
                    ->with('business')
                    ->oldest('id')
                    ->first();
                $business = $membership === null
                    ? Business::factory()->create(['name' => $owner->name])
                    : $membership->business;
                $this->createOwnerMembership($business, $owner);

                return ['business_id' => $business->id];
            });
    }

    public function definition(): array
    {
        return [
            'business_id' => Business::factory(),
            'country_id' => fn () => Country::query()->where('code', 'ID')->value('id'),
            'name' => fake()->company(),
            'status' => StoreStatus::Active,
        ];
    }

    private function createOwnerMembership(Business $business, User $owner): void
    {
        BusinessMembership::query()->firstOrCreate(
            ['business_id' => $business->id, 'user_id' => $owner->id],
            [
                'display_name' => $owner->name,
                'business_role' => BusinessRole::Owner,
                'status' => MembershipStatus::Active,
                'joined_at' => now(),
            ],
        );
    }
}
