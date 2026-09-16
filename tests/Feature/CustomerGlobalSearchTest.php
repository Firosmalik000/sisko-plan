<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerGlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_requires_at_least_two_characters(): void
    {
        [$owner, $store] = $this->ownerAndStore();

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->getJson(route('customer.search', ['q' => 'a']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('q');
    }

    public function test_search_rejects_whitespace_only_query(): void
    {
        [$owner, $store] = $this->ownerAndStore();

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->getJson(route('customer.search', ['q' => '  ']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('q');
    }

    public function test_search_returns_matching_customer_records_from_only_the_active_store(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $otherStore = Store::factory()->create();
        $unit = Unit::factory()->for($store)->create();
        $otherUnit = Unit::factory()->for($otherStore)->create();
        $product = Product::factory()->for($store)->for($unit, 'baseUnit')->create(['name' => 'Kopi Gayo Premium']);
        Product::factory()->for($otherStore)->for($otherUnit, 'baseUnit')->create(['name' => 'Kopi Toko Lain']);
        Category::factory()->for($store)->create(['name' => 'Kopi dan Teh']);

        $response = $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->getJson(route('customer.search', ['q' => 'kopi']))
            ->assertOk();

        $response
            ->assertJsonPath('groups.0.type', 'products')
            ->assertJsonFragment(['title' => 'Kopi Gayo Premium'])
            ->assertJsonFragment(['title' => 'Kopi dan Teh'])
            ->assertJsonMissing(['title' => 'Kopi Toko Lain']);

        $this->assertStringContainsString('search=Kopi%20Gayo%20Premium', $response->json('groups.0.items.0.href'));
        $this->assertSame($product->public_id, $response->json('groups.0.items.0.id'));
    }

    public function test_exact_product_code_is_searchable(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $unit = Unit::factory()->for($store)->create();
        $product = Product::factory()->for($store)->for($unit, 'baseUnit')->create(['name' => 'Air Mineral']);
        $product->productUnits()->first()->update(['sku' => 'SKU-AIR-001', 'barcode' => '8991234567890']);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->getJson(route('customer.search', ['q' => '8991234567890']))
            ->assertOk()
            ->assertJsonPath('groups.0.items.0.id', $product->public_id)
            ->assertJsonPath('groups.0.items.0.meta', '8991234567890');
    }

    public function test_exact_product_code_ranks_above_partial_code_match(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $unit = Unit::factory()->for($store)->create();
        $partial = Product::factory()->for($store)->for($unit, 'baseUnit')->create(['name' => 'Produk Lama']);
        $partial->productUnits()->first()->update(['sku' => 'ABC-123-LONG']);
        $exact = Product::factory()->for($store)->for($unit, 'baseUnit')->create(['name' => 'Produk Tepat']);
        $exact->productUnits()->first()->update(['sku' => 'ABC-123']);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->getJson(route('customer.search', ['q' => 'ABC-123']))
            ->assertOk()
            ->assertJsonPath('groups.0.items.0.id', $exact->public_id);
    }

    public function test_customer_destination_is_searchable(): void
    {
        [$owner, $store] = $this->ownerAndStore();

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->getJson(route('customer.search', ['q' => 'laporan']))
            ->assertOk()
            ->assertJsonPath('groups.0.type', 'destinations')
            ->assertJsonPath('groups.0.items.0.href', route('reports.index'));
    }

    /** @return array{User, Store} */
    private function ownerAndStore(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->ownedBy($owner)->create();

        return [$owner, $store];
    }
}
