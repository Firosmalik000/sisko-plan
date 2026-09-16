<?php

namespace Database\Factories;

use App\Models\BusinessMembership;
use App\Models\PosDevice;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<PosDevice> */
class PosDeviceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'business_id' => fn (array $attributes): int => (int) Store::query()->whereKey((int) $attributes['store_id'])->valueOrFail('business_id'),
            'name' => fake()->randomElement(['Kasir Depan', 'Kasir Utama']),
            'token_hash' => hash('sha256', Str::random(64)),
            'status' => 'active',
            'activated_by_business_membership_id' => fn (array $attributes): int => BusinessMembership::query()
                ->where('business_id', $attributes['business_id'])->oldest('id')->valueOrFail('id'),
        ];
    }
}
