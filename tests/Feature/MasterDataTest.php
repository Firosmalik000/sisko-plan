<?php

namespace Tests\Feature;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\UnitType;
use App\Models\AuditLog;
use App\Models\Category;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Services\Operations\ProductionReadiness;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MasterDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_variants_use_a_dedicated_normalized_schema(): void
    {
        $this->assertTrue(Schema::hasTable('product_variants'));
        $this->assertTrue(Schema::hasColumns('product_variants', ['public_id', 'store_id', 'product_id', 'name', 'photo_path', 'is_active']));
        $this->assertTrue(Schema::hasColumns('product_units', ['product_variant_id', 'sku', 'barcode']));
        $this->assertFalse(Schema::hasColumn('products', 'sku'));
        $this->assertFalse(Schema::hasColumn('products', 'barcode'));
        $this->assertTrue(Schema::hasColumns('inventory_balances', ['product_id', 'product_variant_id', 'stock_key']));
        $this->assertFalse(Schema::hasColumn('products', 'parent_product_id'));
        $this->assertFalse(Schema::hasColumn('products', 'stock_product_id'));

        $catalogCheck = collect(app(ProductionReadiness::class)->evaluate())
            ->firstWhere('key', 'catalog_schema');
        $this->assertNotNull($catalogCheck);
        $this->assertTrue($catalogCheck['passed']);
        $this->assertFalse(Schema::hasColumn('products', 'variant_name'));
        $this->assertFalse(Schema::hasColumn('products', 'is_inventory_item'));
    }

    public function test_owner_can_manage_operational_reference_data(): void
    {
        [$owner, $store] = $this->ownerAndStore();

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.categories.store'), [
                'name' => 'Minuman',
                'description' => 'Produk siap minum',
            ])->assertRedirect();
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.units.store'), [
                'name' => 'Pieces',
                'symbol' => 'pcs',
                'unit_type' => UnitType::Retail->value,
            ])
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

    public function test_supplier_page_lists_only_the_active_store_suppliers(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        Supplier::factory()->for($store)->create(['name' => 'Supplier Aktif']);
        Supplier::factory()->for(Store::factory()->create())->create(['name' => 'Supplier Toko Lain']);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.suppliers.index', ['create' => '1']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('master-data/suppliers/index')
                ->where('canManage', true)
                ->where('suppliers.total', 1)
                ->where('suppliers.data.0.name', 'Supplier Aktif'));
    }

    public function test_product_is_created_atomically_with_codes_on_its_sellable_unit(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $piece = Unit::factory()->for($store)->create(['name' => 'Pieces', 'symbol' => 'pcs']);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $this->productPayload($category, $piece))
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
            'sku' => 'SKU-TEH-001',
            'barcode' => '8990000000001',
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
        $payload['selling_price'] = '5000';

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
            ->assertSessionHasErrors(['category_public_id', 'retail_unit_public_id', 'large_unit_public_id']);

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
        $product = Product::factory()->for($store)->for($unit, 'baseUnit')->create();
        $productUnit = $product->productUnits()->sole();
        $productUnit->update(['sku' => 'SKU-SAMA', 'barcode' => '899000000001']);
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
        $payload['purchase_price'] = '1000000000000000';
        $payload['selling_price'] = '1000000000000000';

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertSessionHasErrors([
                'purchase_price',
                'selling_price',
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
                'unit_type' => $unit->unit_type->value,
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
                'retail_unit_public_id',
                'large_unit_public_id',
            ]);

        $this->assertDatabaseCount('products', 0);
    }

    public function test_product_with_separate_variants_has_independent_inventory(): void
    {
        Storage::fake('local');
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $retail = Unit::factory()->for($store)->create(['unit_type' => UnitType::Retail]);
        $large = Unit::factory()->for($store)->create(['unit_type' => UnitType::Large]);
        $payload = $this->modernProductPayload($category, $retail, $large, 'separate');
        $payload['variants'] = [
            [
                'name' => 'Cokelat', 'sku' => 'KOPI-COKELAT', 'barcode' => '8991000000012',
                'photo' => UploadedFile::fake()->image('cokelat.jpg'),
                'purchase_price' => '3000', 'selling_price' => '5000', 'current_stock' => '12', 'minimum_stock' => '3',
            ],
            ['name' => 'Vanila', 'purchase_price' => '3200', 'selling_price' => '5200', 'current_stock' => '8', 'minimum_stock' => '2'],
        ];

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)->assertRedirect()->assertSessionDoesntHaveErrors();

        $parent = Product::query()->sole();
        $variants = ProductVariant::query()->where('product_id', $parent->id)->orderBy('name')->get();
        $this->assertSame('separate', $parent->variant_mode);
        $this->assertCount(2, $variants);
        $this->assertSame('12.000000', InventoryBalance::query()->where('product_variant_id', $variants[0]->id)->value('quantity'));
        $this->assertSame('8.000000', InventoryBalance::query()->where('product_variant_id', $variants[1]->id)->value('quantity'));
        $variantUnit = $variants[0]->productUnits()->sole();
        $this->assertDatabaseHas('product_units', [
            'product_variant_id' => $variants[0]->id,
            'id' => $variantUnit->id,
            'sku' => 'KOPI-COKELAT',
            'barcode' => '8991000000012',
        ]);
        $this->assertNotNull($variants[0]->photo_path);
        Storage::disk('local')->assertExists($variants[0]->photo_path);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.products.variants.photo', [$parent->public_id, $variants[0]->public_id]))
            ->assertOk();
    }

    public function test_wholesale_variants_share_retail_inventory_and_conversion(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $retail = Unit::factory()->for($store)->create(['unit_type' => UnitType::Retail]);
        $large = Unit::factory()->for($store)->create(['unit_type' => UnitType::Large]);
        $payload = $this->modernProductPayload($category, $retail, $large, 'shared');
        $payload['current_stock'] = '120';
        $payload['minimum_stock'] = '24';
        $payload['variants'] = [
            ['name' => 'Dus 24', 'purchase_price' => '72000', 'selling_price' => '96000', 'conversion_factor' => '24'],
            ['name' => 'Pack 6', 'purchase_price' => '18000', 'selling_price' => '25000', 'conversion_factor' => '6'],
        ];

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)->assertRedirect()->assertSessionDoesntHaveErrors();

        $parent = Product::query()->sole();
        $variants = ProductVariant::query()->where('product_id', $parent->id)->with('productUnits')->orderBy('name')->get();
        $this->assertEqualsCanonicalizing(['24.000000', '6.000000'], $variants->map(fn (ProductVariant $variant) => $variant->productUnits->sole()->conversion_factor)->all());
        $this->assertSame('120.000000', InventoryBalance::query()->where('product_id', $parent->id)->whereNull('product_variant_id')->value('quantity'));
        $this->assertSame('24.000000', InventoryBalance::query()->where('product_id', $parent->id)->whereNull('product_variant_id')->value('minimum_quantity'));
    }

    public function test_product_edit_sets_stock_target_and_photo_is_tenant_protected(): void
    {
        Storage::fake('local');
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $retail = Unit::factory()->for($store)->create(['unit_type' => UnitType::Retail]);
        $large = Unit::factory()->for($store)->create(['unit_type' => UnitType::Large]);
        $payload = $this->modernProductPayload($category, $retail, $large);
        $payload['current_stock'] = '10';
        $payload['photo'] = UploadedFile::fake()->image('kopi.jpg', 300, 300);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)->assertRedirect()->assertSessionDoesntHaveErrors();
        $product = Product::query()->sole();
        $this->assertNotNull($product->photo_path);
        Storage::disk('local')->assertExists($product->photo_path);
        $oldPhotoPath = $product->photo_path;

        $payload = $this->modernProductPayload($category, $retail, $large);
        $payload['current_stock'] = '16';
        $payload['_method'] = 'patch';
        $payload['photo'] = UploadedFile::fake()->image('kopi-baru.jpg', 300, 300);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.update', $product->public_id), $payload)->assertRedirect()->assertSessionDoesntHaveErrors();
        $product->refresh();
        $this->assertNotSame($oldPhotoPath, $product->photo_path);
        Storage::disk('local')->assertMissing($oldPhotoPath);
        Storage::disk('local')->assertExists($product->photo_path);

        $expectedPhotoVersion = substr(hash('sha256', $product->photo_path), 0, 12);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.products.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.data.0.photo_url', route('master-data.products.photo', [
                    'product' => $product->public_id,
                    'v' => $expectedPhotoVersion,
                ])));

        unset($payload['photo']);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.update', $product->public_id), $payload)->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertSame('16.000000', InventoryBalance::query()->where('product_id', $product->id)->value('quantity'));
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.products.photo', $product->public_id))->assertOk();

        [, $otherStore] = $this->ownerAndStore();
        $otherStore->users()->attach($owner, [
            'role' => MembershipRole::Admin->value,
            'status' => MembershipStatus::Active->value,
        ]);
        $this->actingAs($owner)->withSession(['active_store_id' => $otherStore->id])
            ->get(route('master-data.products.photo', $product->public_id))->assertNotFound();

        Storage::disk('local')->delete($product->photo_path);
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.products.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('products.data.0.photo_url', null));
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.products.photo', $product->public_id))->assertNotFound();
    }

    public function test_changing_variant_mode_does_not_leave_hidden_stock(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $category = Category::factory()->for($store)->create();
        $retail = Unit::factory()->for($store)->create(['unit_type' => UnitType::Retail]);
        $large = Unit::factory()->for($store)->create(['unit_type' => UnitType::Large]);
        $payload = $this->modernProductPayload($category, $retail, $large, 'separate');
        $payload['variants'] = [
            ['name' => 'Original', 'purchase_price' => '3000', 'selling_price' => '5000', 'current_stock' => '9', 'minimum_stock' => '2'],
        ];
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)->assertRedirect()->assertSessionDoesntHaveErrors();
        $parent = Product::query()->sole();
        $oldVariant = ProductVariant::query()->where('product_id', $parent->id)->sole();

        $payload = $this->modernProductPayload($category, $retail, $large, 'shared');
        $payload['current_stock'] = '24';
        $payload['minimum_stock'] = '6';
        $payload['variants'] = [
            ['name' => 'Dus', 'purchase_price' => '72000', 'selling_price' => '90000', 'conversion_factor' => '24'],
        ];
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.products.update', $parent->public_id), $payload)->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertSame('0.000000', InventoryBalance::query()->where('product_variant_id', $oldVariant->id)->value('quantity'));
        $this->assertSame('24.000000', InventoryBalance::query()->where('product_id', $parent->id)->whereNull('product_variant_id')->value('quantity'));
        $this->assertFalse($oldVariant->fresh()->is_active);

        $payload = $this->modernProductPayload($category, $retail, $large, 'separate');
        $payload['variants'] = [
            ['name' => 'Original', 'purchase_price' => '3000', 'selling_price' => '5000', 'current_stock' => '5', 'minimum_stock' => '1'],
        ];
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.products.update', $parent->public_id), $payload)->assertRedirect()->assertSessionDoesntHaveErrors();

        $this->assertTrue($oldVariant->fresh()->is_active);
        $this->assertSame('5.000000', InventoryBalance::query()->where('product_variant_id', $oldVariant->id)->value('quantity'));
        $this->assertSame(2, ProductVariant::query()->where('product_id', $parent->id)->count());
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
    private function productPayload(?Category $category, Unit $baseUnit): array
    {
        $category ??= Category::factory()->for($baseUnit->store)->create();

        return [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'Teh Botol',
            'sku' => 'SKU-TEH-001',
            'barcode' => '8990000000001',
            'description' => 'Teh siap minum',
            'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $baseUnit->public_id,
            'large_unit_public_id' => $baseUnit->public_id,
            'variant_mode' => 'none',
            'purchase_price' => '2500',
            'selling_price' => '4000',
            'current_stock' => '0',
            'minimum_stock' => '0',
            'variants' => [],
            'is_active' => true,
        ];
    }

    /** @return array<string, mixed> */
    private function modernProductPayload(Category $category, Unit $retail, Unit $large, string $mode = 'none'): array
    {
        return [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'Kopi Susu',
            'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $retail->public_id,
            'large_unit_public_id' => $large->public_id,
            'variant_mode' => $mode,
            'purchase_price' => '3000',
            'selling_price' => '5000',
            'current_stock' => '0',
            'minimum_stock' => '0',
            'variants' => [],
            'is_active' => true,
        ];
    }
}
