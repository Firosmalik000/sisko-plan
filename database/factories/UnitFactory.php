<?php

namespace Database\Factories;

use App\Enums\UnitType;
use App\Models\Store;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Unit> */
class UnitFactory extends Factory
{
    protected $model = Unit::class;

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'name' => fake()->unique()->words(2, true),
            'symbol' => fake()->unique()->lexify('???'),
            'unit_type' => UnitType::Retail,
            'is_active' => true,
        ];
    }
}
