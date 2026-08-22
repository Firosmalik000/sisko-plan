<?php

namespace Tests\Feature;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\UnitType;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Services\Intelligence\CatalogIntelligenceClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery\MockInterface;
use Tests\TestCase;

class ProductScannerEndpointTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.catalog_intelligence.max_images', 3);
    }

    public function test_guest_cannot_use_scanner_endpoints(): void
    {
        $this->postJson('/scanner/catalog-item-lookups', [])->assertUnauthorized();
    }

    public function test_exact_identifier_lookup_stays_local_and_returns_canonical_item(): void
    {
        [$user, $store] = $this->ownerAndStore();
        $product = Product::factory()->for($store)->create(['name' => 'Kopi Arabika']);
        $unit = $product->productUnits()->with('unit')->sole();
        $barcode = $unit->barcode;
        $this->mock(CatalogIntelligenceClient::class, fn (MockInterface $mock) => $mock->shouldNotReceive('recognize'));

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.lookup'), [
                'purpose' => 'sale',
                'type' => 'barcode',
                'identifier' => $barcode,
                'capture_id' => 'barcode-capture',
            ])
            ->assertOk()
            ->assertJsonPath('data.0.status', 'found')
            ->assertJsonPath('data.0.productId', $product->public_id)
            ->assertJsonPath('data.0.unitId', $unit->unit->public_id)
            ->assertJsonPath('data.0.methods.0', 'barcode');

        $sku = $unit->sku;

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.lookup'), [
                'purpose' => 'purchase',
                'type' => 'sku',
                'identifier' => $sku,
            ])
            ->assertOk()
            ->assertJsonPath('data.0.methods.0', 'sku');
    }

    public function test_recognition_resolves_only_active_store_catalog_keys(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        $product = Product::factory()->for($store)->create(['name' => 'Teh Hijau']);
        $foreign = Product::factory()->create();
        $this->mock(CatalogIntelligenceClient::class, function (MockInterface $mock) use ($product, $foreign): void {
            $mock->shouldReceive('recognize')->once()->andReturn([
                'status' => 'success',
                'data' => ['images' => [[
                    'image_index' => 0,
                    'items' => [[
                        'item_index' => 0,
                        'recognition_status' => 'uncertain',
                        'candidates' => [
                            ['catalog_item_key' => "product:{$product->public_id}", 'confidence' => 0.91, 'methods' => ['visual']],
                            ['catalog_item_key' => "product:{$foreign->public_id}", 'confidence' => 0.8, 'methods' => ['visual']],
                        ],
                    ]],
                ]]],
            ]);
        });

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.recognize'), [
                'purpose' => 'sale',
                'images' => [UploadedFile::fake()->image('one.jpg')],
                'capture_ids' => ['capture-1'],
            ])
            ->assertOk()
            ->assertJsonCount(1, 'data.0.candidates')
            ->assertJsonPath('data.0.candidates.0.productPublicId', $product->public_id);
    }

    public function test_recognition_rejects_more_than_configured_image_limit(): void
    {
        [$user, $store] = $this->ownerAndStore();

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.recognize'), [
                'purpose' => 'sale',
                'images' => collect(range(1, 4))->map(fn (int $index) => UploadedFile::fake()->image("{$index}.jpg"))->all(),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('images');
    }

    public function test_cashier_can_scan_sales_but_cannot_discover_new_products(): void
    {
        [, $store] = $this->ownerAndStore();
        $cashier = User::factory()->create();
        $store->users()->attach($cashier, [
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);

        $this->actingAs($cashier)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.lookup'), [
                'purpose' => 'sale',
                'type' => 'barcode',
                'identifier' => 'not-found',
            ])->assertOk();

        $this->actingAs($cashier)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.discover'), [
                'purpose' => 'product',
                'market' => 'ID',
                'images' => [UploadedFile::fake()->image('one.jpg')],
            ])->assertForbidden();
    }

    public function test_product_discovery_forwards_up_to_three_images_without_writing_products(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        $this->mock(CatalogIntelligenceClient::class, function (MockInterface $mock): void {
            $mock->shouldReceive('discover')->once()->withArgs(
                fn ($sentStore, array $images, string $market, string $requestId): bool => count($images) === 3 && $market === 'ID' && $requestId !== '',
            )->andReturn([
                'status' => 'success',
                'message' => 'Discovery completed.',
                'data' => [
                    'name' => 'Aqua Air Mineral 600 ml',
                    'estimated_purchase_price' => 2700,
                    'recommended_selling_price' => 3500,
                ],
            ]);
        });

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.discover'), [
                'purpose' => 'product',
                'market' => 'ID',
                'images' => collect(range(1, 3))->map(fn (int $index) => UploadedFile::fake()->image("{$index}.jpg"))->all(),
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Aqua Air Mineral 600 ml');

        $this->assertDatabaseCount('products', 0);
    }

    public function test_inertia_shares_only_safe_scanner_configuration(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        config()->set('services.catalog_intelligence.token', 'private-token');

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertOk()
            ->assertDontSee('private-token')
            ->assertInertia(fn (Assert $page) => $page
                ->where('scanner.max_images_per_request', 3)
                ->where('scanner.auto_capture_enabled', true)
                ->where('scanner.visual_recognition_enabled', true));
    }

    public function test_catalog_sync_uses_only_exact_variant_photos_when_multiple_variants_exist(): void
    {
        Storage::fake('local');
        [, $store] = $this->ownerAndStore();
        $unit = Unit::factory()->for($store)->create(['unit_type' => UnitType::Retail]);
        $product = Product::factory()->for($store)->create([
            'base_unit_id' => $unit->id,
            'variant_mode' => 'separate',
            'photo_path' => 'product-photos/parent.jpg',
        ]);
        Storage::disk('local')->put($product->photo_path, 'parent');
        $withPhoto = ProductVariant::create([
            'store_id' => $store->id,
            'product_id' => $product->id,
            'name' => 'Chocolate',
            'photo_path' => 'product-variant-photos/chocolate.jpg',
            'is_active' => true,
        ]);
        $withoutPhoto = ProductVariant::create([
            'store_id' => $store->id,
            'product_id' => $product->id,
            'name' => 'Vanilla',
            'photo_path' => null,
            'is_active' => true,
        ]);
        Storage::disk('local')->put($withPhoto->photo_path, 'variant');
        foreach ([$withPhoto, $withoutPhoto] as $variant) {
            ProductUnit::create([
                'store_id' => $store->id,
                'product_id' => $product->id,
                'product_variant_id' => $variant->id,
                'unit_id' => $unit->id,
                'conversion_factor' => 1,
                'purchase_price' => 1000,
                'selling_price' => 1500,
                'is_active' => true,
            ]);
        }
        $requestBodies = [];
        Http::fake(function (Request $request) use (&$requestBodies) {
            $requestBodies[$request->url()] = $request->body();

            return Http::response([
                'status' => 'success',
                'message' => 'Catalog item synchronized.',
                'data' => [],
            ]);
        });

        app(CatalogIntelligenceClient::class)->syncProduct($product, 'request-id');

        $withPhotoBody = collect($requestBodies)->first(fn (string $body, string $url) => str_ends_with($url, "variant:{$withPhoto->public_id}"));
        $withoutPhotoBody = collect($requestBodies)->first(fn (string $body, string $url) => str_ends_with($url, "variant:{$withoutPhoto->public_id}"));

        $this->assertIsString($withPhotoBody);
        $this->assertIsString($withoutPhotoBody);
        $this->assertStringContainsString('name="images"', $withPhotoBody);
        $this->assertStringNotContainsString('name="images"', $withoutPhotoBody);
    }

    /** @return array{User, Store} */
    private function ownerAndStore(): array
    {
        $user = User::factory()->create();
        $store = Store::factory()->for($user, 'owner')->create();

        return [$user, $store];
    }
}
