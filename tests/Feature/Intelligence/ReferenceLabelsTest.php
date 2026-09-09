<?php

namespace Tests\Feature\Intelligence;

use App\Actions\Stores\SeedStoreStarterData;
use App\Models\Category;
use App\Models\CategoryReference;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReferenceLabelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_names_are_custom_and_new_starters_use_available_references_without_http(): void
    {
        Http::preventStrayRequests();
        $store = Store::factory()->create();
        $legacy = Category::factory()->for($store)->create(['name' => 'My drinks']);
        $this->assertTrue($legacy->refresh()->name_is_custom);
        $unit = Unit::factory()->for($store)->create();
        $this->assertTrue($unit->refresh()->name_is_custom);
        CategoryReference::create(['code' => 'beverages', 'name' => 'Beverages', 'is_active' => true, 'catalog_version' => 'v1']);
        app(SeedStoreStarterData::class)->handle($store);
        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'Minuman', 'reference_code' => 'beverages', 'name_is_custom' => false]);
        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'Makanan', 'reference_code' => null]);
        $this->assertSame('My drinks', $legacy->refresh()->name);
        Http::assertNothingSent();
    }

    public function test_standard_names_require_mapping_and_implicit_renames_become_custom(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        CategoryReference::create(['code' => 'beverages', 'name' => 'Beverages', 'is_active' => true, 'catalog_version' => 'v1']);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id]);
        $this->post(route('master-data.categories.store'), ['name' => 'No mapping', 'name_is_custom' => false])->assertSessionHasErrors('reference_code');
        $category = Category::factory()->for($store)->create(['name' => 'Beverages', 'reference_code' => 'beverages', 'name_is_custom' => false]);
        $this->patch(route('master-data.categories.update', $category->public_id), ['name' => 'Beverages'])->assertSessionHasNoErrors();
        $this->assertFalse($category->refresh()->name_is_custom);
        $this->patch(route('master-data.categories.update', $category->public_id), ['name' => 'My beverages'])->assertSessionHasNoErrors();
        $this->assertTrue($category->refresh()->name_is_custom);
    }

    public function test_category_mapping_validates_activity_and_preserves_custom_names_and_tenant_boundary(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        CategoryReference::create(['code' => 'beverages', 'name' => 'Beverages', 'is_active' => true, 'catalog_version' => 'v1']);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id]);
        $this->post(route('master-data.categories.store'), ['name' => 'My drinks', 'reference_code' => 'beverages', 'name_is_custom' => true])->assertSessionHasNoErrors();
        $category = Category::where('store_id', $store->id)->where('name', 'My drinks')->sole();
        $this->assertSame('beverages', $category->reference_code);
        CategoryReference::where('code', 'beverages')->update(['is_active' => false]);
        $this->patch(route('master-data.categories.update', $category->public_id), ['name' => 'My drinks', 'reference_code' => 'beverages'])->assertSessionHasNoErrors();
        $this->assertTrue($category->refresh()->name_is_custom);
        $this->post(route('master-data.categories.store'), ['name' => 'Other drinks', 'reference_code' => 'beverages'])->assertSessionHasErrors('reference_code');
        $this->post(route('master-data.categories.store'), ['name' => 'Unknown drinks', 'reference_code' => 'unknown'])->assertSessionHasErrors('reference_code');
        $other = Category::factory()->create();
        $this->patch(route('master-data.categories.update', $other->public_id), ['name' => 'Stolen'])->assertNotFound();
    }
}
