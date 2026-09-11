<?php

namespace Database\Factories;

use App\Enums\DevicePlatform;
use App\Enums\PushProvider;
use App\Models\Device;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Device> */
class DeviceFactory extends Factory
{
    protected $model = Device::class;

    public function definition(): array
    {
        $platform = fake()->randomElement(DevicePlatform::cases());

        return [
            'user_id' => User::factory(),
            'device_id' => (string) Str::uuid(),
            'platform' => $platform,
            'push_token' => fake()->sha256(),
            'push_provider' => $platform === DevicePlatform::Ios ? PushProvider::Apns : PushProvider::Fcm,
            'last_seen_at' => now(),
        ];
    }

    public function ios(): static
    {
        return $this->state(fn (): array => [
            'platform' => DevicePlatform::Ios,
            'push_provider' => PushProvider::Apns,
        ]);
    }
}
