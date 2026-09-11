<?php

namespace Database\Factories;

use App\Enums\NotificationCategory;
use App\Models\MobileNotification;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<MobileNotification> */
class MobileNotificationFactory extends Factory
{
    protected $model = MobileNotification::class;

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'user_id' => null,
            'category' => fake()->randomElement(NotificationCategory::cases()),
            'title' => fake()->sentence(4),
            'body' => fake()->sentence(10),
            'read_at' => null,
        ];
    }

    public function category(NotificationCategory $category): static
    {
        return $this->state(fn (): array => ['category' => $category]);
    }
}
