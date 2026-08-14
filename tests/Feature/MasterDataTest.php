<?php

namespace Tests\Feature;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MasterDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_manage_operational_reference_data(): void
    {
        [$owner, $store] = $this->ownerAndStore();

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.categories.store'), [
                'name' => 'Minuman',
                'description' => 'Produk siap minum',
            ])->assertRedirect();
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.units.store'), ['name' => 'Pieces', 'symbol' => 'pcs'])
            ->assertRedirect();
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.suppliers.store'), [
                'name' => 'PT Sumber Makmur',
                'contact_person' => 'Budi',
                'phone' => '08123456789',
            ])->assertRedirect();
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.financial-accounts.store'), [
                'name' => 'Kas Toko',
                'type' => 'cash',
            ])->assertRedirect();

        $category = Category::query()->where('store_id', $store->id)->where('name', 'Minuman')->sole();
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.categories.update', $category->public_id), [
                'name' => 'Minuman Kemasan',
                'description' => 'Produk siap minum',
                'is_active' => false,
            ])->assertRedirect();

        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'Minuman Kemasan', 'is_active' => false]);
        $this->assertDatabaseHas('units', ['store_id' => $store->id, 'symbol' => 'pcs']);
        $this->assertDatabaseHas('suppliers', ['store_id' => $store->id, 'name' => 'PT Sumber Makmur']);
        $this->assertDatabaseHas('financial_accounts', ['store_id' => $store->id, 'name' => 'Kas Toko', 'type' => 'cash']);
    }

    public function test_product_is_created_atomically_with_base_and_conversion_units(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $piece = Unit::factory()->for($store)->create(['name' => 'Pieces', 'symbol' => 'pcs']);
        $box = Unit::factory()->for($store)->create(['name' => 'Box', 'symbol' => 'box']);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $this->productPayload($category, $piece, $box))
            ->assertRedirect();

        $product = Product::query()->sole();
        $this->assertSame($store->id, $product->store_id);
        $this->assertSame($piece->id, $product->base_unit_id);
        $this->assertDatabaseHas('product_units', [
            'product_id' => $product->id,
            'unit_id' => $piece->id,
            'conversion_factor' => 1,
            'purchase_price' => 2500,
            'selling_price' => 4000,
        ]);
        $this->assertDatabaseHas('product_units', [
            'product_id' => $product->id,
            'unit_id' => $box->id,
            'conversion_factor' => 12,
            'selling_price' => 45000,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'store_id' => $store->id,
            'actor_id' => $owner->id,
            'action' => 'product.created',
            'subject_id' => $product->id,
        ]);
    }

    public function test_server_forces_base_unit_conversion_to_one(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $piece = Unit::factory()->for($store)->create();
        $payload = $this->productPayload(null, $piece);
        $payload['units'][0]['conversion_factor'] = '99';

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertRedirect();

        $this->assertDatabaseHas('product_units', [
            'product_id' => Product::query()->sole()->id,
            'unit_id' => $piece->id,
            'conversion_factor' => 1,
        ]);
    }

    public function test_product_update_records_price_audit_and_deactivates_removed_unit(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $piece = Unit::factory()->for($store)->create(['name' => 'Pieces', 'symbol' => 'pcs']);
        $box = Unit::factory()->for($store)->create(['name' => 'Box', 'symbol' => 'box']);
        $product = Product::factory()->for($store)->for($piece, 'baseUnit')->create();
        $product->productUnits()->create([
            'store_id' => $store->id,
            'unit_id' => $box->id,
            'conversion_factor' => 12,
            'purchase_price' => 25000,
            'selling_price' => 40000,
            'is_active' => true,
        ]);
        $payload = $this->productPayload(null, $piece);
        $payload['units'][0]['selling_price'] = '5000';

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.products.update', $product->public_id), $payload)
            ->assertRedirect();

        $this->assertDatabaseHas('product_units', ['product_id' => $product->id, 'unit_id' => $piece->id, 'selling_price' => 5000]);
        $this->assertDatabaseHas('product_units', ['product_id' => $product->id, 'unit_id' => $box->id, 'is_active' => false]);
        $audit = AuditLog::query()->where('action', 'product.updated')->where('subject_id', $product->id)->sole();
        $this->assertArrayHasKey('prices_before', $audit->metadata ?? []);
        $this->assertArrayHasKey('prices_after', $audit->metadata ?? []);
    }

    public function test_cross_store_records_and_relations_are_rejected(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $otherStore = Store::factory()->create();
        $otherCategory = Category::factory()->for($otherStore)->create();
        $otherUnit = Unit::factory()->for($otherStore)->create();

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.categories.update', $otherCategory->public_id), [
                'name' => 'Dicuri',
                'is_active' => true,
            ])->assertNotFound();

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $this->productPayload($otherCategory, $otherUnit))
            ->assertSessionHasErrors(['category_public_id', 'base_unit_public_id', 'units.0.unit_public_id']);

        $this->assertDatabaseMissing('categories', ['id' => $otherCategory->id, 'name' => 'Dicuri']);
        $this->assertDatabaseCount('products', 0);
    }

    public function test_cashier_can_view_but_cannot_modify_master_data(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $cashier = User::factory()->create();
        $store->users()->attach($cashier, [
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);
        Category::factory()->for($store)->create(['name' => 'Makanan']);
        $otherStore = Store::factory()->create();
        Category::factory()->for($otherStore)->create(['name' => 'Rahasia toko lain']);

        $this->actingAs($cashier)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.categories.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('master-data/categories/index')
                ->where('canManage', false)
                ->has('categories.data', 1));

        $this->actingAs($cashier)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.categories.store'), ['name' => 'Terlarang'])
            ->assertForbidden();
    }

    public function test_admin_can_manage_master_data(): void
    {
        [, $store] = $this->ownerAndStore();
        $admin = User::factory()->create();
        $store->users()->attach($admin, [
            'role' => MembershipRole::Admin->value,
            'status' => MembershipStatus::Active->value,
        ]);

        $this->actingAs($admin)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.categories.store'), ['name' => 'Dikelola Admin'])
            ->assertRedirect();

        $this->assertDatabaseHas('categories', ['store_id' => $store->id, 'name' => 'Dikelola Admin']);
    }

    public function test_sku_and_barcode_must_be_unique_within_store(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $unit = Unit::factory()->for($store)->create();
        Product::factory()->for($store)->for($unit, 'baseUnit')->create([
            'sku' => 'SKU-SAMA',
            'barcode' => '899000000001',
        ]);
        $payload = $this->productPayload(null, $unit);
        $payload['sku'] = 'SKU-SAMA';
        $payload['barcode'] = '899000000001';

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertSessionHasErrors(['sku', 'barcode']);

        $this->assertDatabaseCount('products', 1);
    }

    public function test_product_numeric_values_cannot_exceed_decimal_column_capacity(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $unit = Unit::factory()->for($store)->create();
        $payload = $this->productPayload(null, $unit);
        $payload['units'][0]['conversion_factor'] = '1000000000000';
        $payload['units'][0]['purchase_price'] = '1000000000000000';
        $payload['units'][0]['selling_price'] = '1000000000000000';

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertSessionHasErrors([
                'units.0.conversion_factor',
                'units.0.purchase_price',
                'units.0.selling_price',
            ]);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_product_creation_is_idempotent_when_request_is_retried(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $unit = Unit::factory()->for($store)->create();
        $payload = $this->productPayload(null, $unit);
        $payload['sku'] = null;
        $payload['barcode'] = null;

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertRedirect();
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertRedirect();

        $this->assertDatabaseCount('products', 1);
        $this->assertDatabaseCount('product_units', 1);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_existing_product_can_keep_inactive_category_and_unit(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $unit = Unit::factory()->for($store)->create();
        $payload = $this->productPayload($category, $unit);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertRedirect();
        $product = Product::query()->sole();

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.categories.update', $category->public_id), [
                'name' => $category->name,
                'description' => $category->description,
                'is_active' => false,
            ])->assertRedirect();
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.units.update', $unit->public_id), [
                'name' => $unit->name,
                'symbol' => $unit->symbol,
                'is_active' => false,
            ])->assertRedirect();

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.products.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('categories.0.is_active', false)
                ->where('units.0.is_active', false));

        $payload['name'] = 'Teh Botol Diperbarui';
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.products.update', $product->public_id), $payload)
            ->assertRedirect()
            ->assertSessionDoesntHaveErrors();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Teh Botol Diperbarui',
            'category_id' => $category->id,
            'base_unit_id' => $unit->id,
        ]);
    }

    public function test_new_product_cannot_select_inactive_references(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create(['is_active' => false]);
        $unit = Unit::factory()->for($store)->create(['is_active' => false]);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $this->productPayload($category, $unit))
            ->assertSessionHasErrors([
                'category_public_id',
                'base_unit_public_id',
                'units.0.unit_public_id',
            ]);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_category_list_supports_search_status_filter_and_pagination(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        Category::factory()->count(12)->for($store)->create();
        Category::factory()->for($store)->create([
            'name' => 'Arsip Khusus',
            'is_active' => false,
        ]);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.categories.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('categories.data', 12)
                ->where('categories.total', 13)
                ->has('categories.links'));

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.categories.index', [
                'search' => 'Arsip',
                'status' => 'inactive',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('categories.data', 1)
                ->where('categories.data.0.name', 'Arsip Khusus')
                ->where('categories.data.0.is_active', false));
    }

    /** @return array{User, Store} */
    private function ownerAndStore(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        return [$owner, $store];
    }

    /** @return array<string, mixed> */
    private function productPayload(?Category $category, Unit $baseUnit, ?Unit $alternateUnit = null): array
    {
        $units = [[
            'unit_public_id' => $baseUnit->public_id,
            'conversion_factor' => '1',
            'purchase_price' => '2500',
            'selling_price' => '4000',
        ]];

        if ($alternateUnit !== null) {
            $units[] = [
                'unit_public_id' => $alternateUnit->public_id,
                'conversion_factor' => '12',
                'purchase_price' => '30000',
                'selling_price' => '45000',
            ];
        }

        return [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'Teh Botol',
            'sku' => 'SKU-TEH-001',
            'barcode' => '8990000000001',
            'description' => 'Teh siap minum',
            'category_public_id' => $category?->public_id,
            'base_unit_public_id' => $baseUnit->public_id,
            'is_active' => true,
            'units' => $units,
        ];
    }
}
