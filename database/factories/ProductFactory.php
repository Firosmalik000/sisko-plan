<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Product> */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function configure(): static
    {
        return $this->afterCreating(function (Product $product): void {
            $product->productUnits()->firstOrCreate(
                ['unit_id' => $product->base_unit_id],
                [
                    'store_id' => $product->store_id,
                    'conversion_factor' => 1,
                    'purchase_price' => 0,
                    'selling_price' => 0,
                    'is_active' => true,
                ],
            );
        });
    }

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'creation_token' => (string) Str::uuid(),
            'category_id' => null,
            'base_unit_id' => fn (array $attributes) => Unit::factory()->create([
                'store_id' => $attributes['store_id'],
            ])->id,
            'name' => fake()->words(3, true),
            'sku' => fake()->unique()->bothify('SKU-####'),
            'barcode' => fake()->unique()->ean13(),
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
        ];
    }
}
