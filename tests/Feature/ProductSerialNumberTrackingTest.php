<?php

namespace Tests\Feature;

use App\Actions\Ledgers\PostStockAdjustment;
use App\Actions\Sales\PostSale;
use App\Enums\FinancialAccountType;
use App\Models\Category;
use App\Models\FinancialAccount;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductSerialNumber;
use App\Models\SaleItem;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ProductSerialNumberTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.catalog_intelligence.enabled', false);
    }

    public function test_can_create_product_with_serial_tracking_mode_and_generate_batch_serials(): void
    {
        [$owner, $store, $unit, $category] = $this->setupStoreAndUnits();

        $payload = [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'SIM Card Telkomsel 10GB',
            'sku' => 'SIM-TSEL-001',
            'barcode' => '8991234567890',
            'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $unit->public_id,
            'large_unit_public_id' => $unit->public_id,
            'variant_mode' => 'none',
            'purchase_price' => '15000',
            'selling_price' => '25000',
            'current_stock' => '0',
            'minimum_stock' => '0',
            'variants' => [],
            'is_active' => true,
            'tracking_mode' => 'serial',
            'serial_agent_number' => 'AG998877',
            'serial_agent_position' => 'prefix',
            'serial_range_start' => '001',
            'serial_range_end' => '010',
        ];

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertRedirect();

        $product = Product::query()->where('store_id', $store->id)->where('name', 'SIM Card Telkomsel 10GB')->sole();
        $this->assertSame('serial', $product->tracking_mode);

        $serials = ProductSerialNumber::query()->where('product_id', $product->id)->get();
        $this->assertCount(10, $serials);

        $firstSerial = $serials->firstWhere('serial_number', '001');
        $this->assertNotNull($firstSerial);
        $this->assertSame('AG998877', $firstSerial->agent_number);
        $this->assertSame('prefix', $firstSerial->agent_position);
        $this->assertSame('AG998877001', $firstSerial->full_serial_number);
        $this->assertSame('available', $firstSerial->status);

        $lastSerial = $serials->firstWhere('serial_number', '010');
        $this->assertNotNull($lastSerial);
        $this->assertSame('AG998877010', $lastSerial->full_serial_number);

        $balance = InventoryBalance::query()->where('store_id', $store->id)->where('product_id', $product->id)->sole();
        $this->assertSame('10.000000', $balance->quantity);
    }

    public function test_serial_range_validation_rejects_inverted_range(): void
    {
        [$owner, $store, $unit, $category] = $this->setupStoreAndUnits();

        $payload = [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'SIM Inverted',
            'sku' => 'SIM-INV-001',
            'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $unit->public_id,
            'large_unit_public_id' => $unit->public_id,
            'variant_mode' => 'none',
            'purchase_price' => '10000',
            'selling_price' => '20000',
            'current_stock' => '0',
            'minimum_stock' => '0',
            'variants' => [],
            'is_active' => true,
            'tracking_mode' => 'serial',
            'serial_range_start' => '050',
            'serial_range_end' => '010',
        ];

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertSessionHasErrors(['serial_range_end']);
    }

    public function test_can_create_single_item_serial_when_range_end_is_omitted_and_persists_agent_name(): void
    {
        [$owner, $store, $unit, $category] = $this->setupStoreAndUnits();

        $payload = [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'Voucher Game Single',
            'sku' => 'VCH-001',
            'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $unit->public_id,
            'large_unit_public_id' => $unit->public_id,
            'variant_mode' => 'none',
            'purchase_price' => '50000',
            'selling_price' => '55000',
            'current_stock' => '0',
            'minimum_stock' => '0',
            'variants' => [],
            'is_active' => true,
            'tracking_mode' => 'serial',
            'serial_agent_number' => 'AG777',
            'serial_agent_name' => 'Outlet Roxy',
            'serial_agent_position' => 'prefix',
            'serial_range_start' => 'SN-100',
            'serial_range_end' => null,
        ];

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertRedirect();

        $product = Product::query()->where('store_id', $store->id)->where('name', 'Voucher Game Single')->sole();
        $this->assertSame('serial', $product->tracking_mode);

        $serials = ProductSerialNumber::query()->where('product_id', $product->id)->get();
        $this->assertCount(1, $serials);

        $serial = $serials->first();
        $this->assertSame('SN-100', $serial->serial_number);
        $this->assertSame('AG777', $serial->agent_number);
        $this->assertSame('Outlet Roxy', $serial->agent_name);
        $this->assertSame('prefix', $serial->agent_position);
        $this->assertSame('AG777SN-100', $serial->full_serial_number);
        $this->assertSame('available', $serial->status);

        $balance = InventoryBalance::query()->where('store_id', $store->id)->where('product_id', $product->id)->sole();
        $this->assertSame('1.000000', $balance->quantity);
    }

    public function test_can_append_new_batch_of_serials_when_updating_product_and_stock_increases(): void
    {
        [$owner, $store, $unit, $category] = $this->setupStoreAndUnits();

        // 1. Initial product with 3 serials
        $initialPayload = [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'SIM Multi-Batch',
            'sku' => 'SIM-MB-01',
            'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $unit->public_id,
            'large_unit_public_id' => $unit->public_id,
            'variant_mode' => 'none',
            'purchase_price' => '10000',
            'selling_price' => '15000',
            'current_stock' => '0',
            'minimum_stock' => '0',
            'variants' => [],
            'is_active' => true,
            'tracking_mode' => 'serial',
            'serial_agent_number' => 'AG100',
            'serial_agent_name' => 'Agent Primary',
            'serial_agent_position' => 'prefix',
            'serial_range_start' => '001',
            'serial_range_end' => '003',
        ];

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $initialPayload)
            ->assertRedirect();

        $product = Product::query()->where('store_id', $store->id)->where('name', 'SIM Multi-Batch')->sole();
        $this->assertCount(3, ProductSerialNumber::query()->where('product_id', $product->id)->get());
        $this->assertSame('3.000000', InventoryBalance::query()->where('store_id', $store->id)->where('product_id', $product->id)->sole()->quantity);

        // 2. Add second batch (004 to 005) via update
        $updatePayload = [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'SIM Multi-Batch',
            'sku' => 'SIM-MB-01',
            'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $unit->public_id,
            'large_unit_public_id' => $unit->public_id,
            'variant_mode' => 'none',
            'purchase_price' => '10000',
            'selling_price' => '15000',
            'current_stock' => '3',
            'minimum_stock' => '0',
            'variants' => [],
            'is_active' => true,
            'tracking_mode' => 'serial',
            'serial_agent_number' => 'AG200',
            'serial_agent_name' => 'Agent Secondary',
            'serial_agent_position' => 'prefix',
            'serial_range_start' => '004',
            'serial_range_end' => '005',
        ];

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('master-data.products.update', $product->public_id), $updatePayload)
            ->assertRedirect();

        $allSerials = ProductSerialNumber::query()->where('product_id', $product->id)->orderBy('serial_number')->get();
        $this->assertCount(5, $allSerials);

        $newSerial = $allSerials->firstWhere('serial_number', '004');
        $this->assertSame('AG200', $newSerial->agent_number);
        $this->assertSame('Agent Secondary', $newSerial->agent_name);

        $balance = InventoryBalance::query()->where('store_id', $store->id)->where('product_id', $product->id)->sole();
        $this->assertSame('5.000000', $balance->quantity);
    }

    public function test_pos_sale_with_serial_numbers_marks_serials_as_sold_and_reduces_inventory(): void
    {
        [$owner, $store, $unit, $category, $cash] = $this->setupStoreAndUnitsWithCash();

        // Create serial tracked product
        $product = Product::factory()->for($store)->create([
            'base_unit_id' => $unit->id,
            'tracking_mode' => 'serial',
        ]);
        $productUnit = $product->productUnits()->sole();
        $productUnit->update(['selling_price' => '25000']);

        // Generate 5 serials
        $serialModels = [];
        for ($i = 1; $i <= 5; $i++) {
            $num = str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $serialModels[] = ProductSerialNumber::create([
                'store_id' => $store->id,
                'product_id' => $product->id,
                'agent_number' => 'AG888',
                'agent_position' => 'prefix',
                'serial_number' => $num,
                'full_serial_number' => 'AG888'.$num,
                'status' => 'available',
            ]);
        }

        // Open stock using PostStockAdjustment
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [[
            'product_id' => $product->id,
            'product_variant_id' => null,
            'quantity' => '5',
            'unit_cost' => '15000',
        ]], '2026-09-25T08:00:00Z', null, 'stock-adjustment-serial');

        // Sell serials 001 and 002
        $selectedPublicIds = [$serialModels[0]->public_id, $serialModels[1]->public_id];

        $sale = app(PostSale::class)->handle(
            $store,
            $owner,
            $cash->id,
            [[
                'product_unit_id' => $productUnit->id,
                'quantity' => '2',
                'item_discount' => '0',
                'serial_number_ids' => $selectedPublicIds,
            ]],
            '0',
            '50000',
            '2026-09-25T10:00:00Z',
            null,
            'serial-sale-01'
        );

        $this->assertNotNull($sale);
        $saleItem = SaleItem::query()->where('sale_id', $sale->id)->sole();

        // Verify serial records status
        $soldSerials = ProductSerialNumber::query()->whereIn('public_id', $selectedPublicIds)->get();
        $this->assertCount(2, $soldSerials);
        foreach ($soldSerials as $sold) {
            $this->assertSame('sold', $sold->status);
            $this->assertSame($sale->id, $sold->sale_id);
            $this->assertSame($saleItem->id, $sold->sale_item_id);
            $this->assertNotNull($sold->sold_at);
        }

        // Verify remaining serials are still available
        $remainingSerials = ProductSerialNumber::query()
            ->where('product_id', $product->id)
            ->where('status', 'available')
            ->pluck('serial_number')
            ->all();
        $this->assertEqualsCanonicalizing(['003', '004', '005'], $remainingSerials);

        // Verify inventory balance reduced from 5 to 3
        $balance = InventoryBalance::query()->where('store_id', $store->id)->where('product_id', $product->id)->sole();
        $this->assertSame('3.000000', $balance->quantity);
    }

    public function test_pos_sale_rejects_already_sold_or_nonexistent_serial_numbers(): void
    {
        [$owner, $store, $unit, $category, $cash] = $this->setupStoreAndUnitsWithCash();

        $product = Product::factory()->for($store)->create([
            'base_unit_id' => $unit->id,
            'tracking_mode' => 'serial',
        ]);
        $productUnit = $product->productUnits()->sole();
        $productUnit->update(['selling_price' => '25000']);

        $soldSerial = ProductSerialNumber::create([
            'store_id' => $store->id,
            'product_id' => $product->id,
            'serial_number' => '001',
            'full_serial_number' => '001',
            'status' => 'sold',
            'sold_at' => now(),
        ]);

        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [[
            'product_id' => $product->id,
            'product_variant_id' => null,
            'quantity' => '1',
            'unit_cost' => '15000',
        ]], '2026-09-25T08:00:00Z', null, 'stock-adjustment-sold');

        $this->expectException(ValidationException::class);

        app(PostSale::class)->handle(
            $store,
            $owner,
            $cash->id,
            [[
                'product_unit_id' => $productUnit->id,
                'quantity' => '1',
                'item_discount' => '0',
                'serial_number_ids' => [$soldSerial->public_id],
            ]],
            '0',
            '25000',
            '2026-09-25T10:00:00Z',
            null,
            'serial-sale-err'
        );
    }

    public function test_products_index_serializes_serial_numbers_and_agent_info_for_detail_and_edit(): void
    {
        [$owner, $store, $unit, $category] = $this->setupStoreAndUnits();

        $payload = [
            'idempotency_key' => (string) Str::uuid(),
            'name' => 'SIM Card Halo Telco',
            'sku' => 'HALO-001',
            'category_public_id' => $category->public_id,
            'retail_unit_public_id' => $unit->public_id,
            'large_unit_public_id' => $unit->public_id,
            'variant_mode' => 'none',
            'purchase_price' => '10000',
            'selling_price' => '20000',
            'current_stock' => '0',
            'minimum_stock' => '0',
            'variants' => [],
            'is_active' => true,
            'tracking_mode' => 'serial',
            'serial_agent_number' => 'AG123456',
            'serial_agent_name' => 'Outlet Roxy',
            'serial_agent_position' => 'prefix',
            'serial_range_start' => '01441400',
            'serial_range_end' => '01441405',
        ];

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('master-data.products.store'), $payload)
            ->assertRedirect();

        $response = $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('master-data.products.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('customer/master-data/products/index')
            ->has('storeAgents', 1)
            ->where('storeAgents.0.agent_number', 'AG123456')
            ->where('storeAgents.0.agent_name', 'Outlet Roxy')
            ->has('products.data', 1)
            ->where('products.data.0.serial_agent_number', 'AG123456')
            ->where('products.data.0.serial_agent_name', 'Outlet Roxy')
            ->where('products.data.0.serial_agent_position', 'prefix')
            ->has('products.data.0.serial_numbers', 6)
            ->where('products.data.0.serial_numbers.0.status', 'available')
        );
    }

    private function setupStoreAndUnits(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->ownedBy($owner)->create();
        $unit = Unit::factory()->for($store)->create(['name' => 'Pieces', 'symbol' => 'pcs']);
        $category = Category::factory()->for($store)->create();

        return [$owner, $store, $unit, $category];
    }

    private function setupStoreAndUnitsWithCash(): array
    {
        [$owner, $store, $unit, $category] = $this->setupStoreAndUnits();
        $cash = FinancialAccount::factory()->for($store)->create([
            'name' => 'Kas Toko',
            'type' => FinancialAccountType::Cash,
        ]);

        return [$owner, $store, $unit, $category, $cash];
    }
}
