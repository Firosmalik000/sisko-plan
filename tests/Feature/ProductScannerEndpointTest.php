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
            ->assertJsonPath('data.0.match.productPublicId', $product->public_id)
            ->assertJsonPath('data.0.selectedOption.productId', $product->public_id)
            ->assertJsonPath('data.0.selectedOption.unitId', $unit->unit->public_id)
            ->assertJsonPath('data.0.match.methods.0', 'barcode');

        $sku = $unit->sku;

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.lookup'), [
                'purpose' => 'purchase',
                'type' => 'sku',
                'identifier' => $sku,
            ])
            ->assertOk()
            ->assertJsonPath('data.0.match.methods.0', 'sku');
    }

    public function test_recognition_groups_store_candidates_and_requires_a_sale_option(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        $product = Product::factory()->for($store)->create([
            'name' => 'Teh Hijau',
            'variant_mode' => 'shared',
        ]);
        $unit = Unit::query()->findOrFail($product->base_unit_id);
        $variants = collect(['250 gram', '500 gram'])->map(function (string $name) use ($product, $store, $unit): ProductVariant {
            $variant = ProductVariant::create([
                'store_id' => $store->id,
                'product_id' => $product->id,
                'name' => $name,
                'is_active' => true,
            ]);
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

            return $variant;
        });
        $foreign = Product::factory()->create();
        $this->mock(CatalogIntelligenceClient::class, function (MockInterface $mock) use ($product, $variants, $foreign): void {
            $mock->shouldReceive('recognize')->once()->andReturn([
                'status' => 'success',
                'data' => ['images' => [[
                    'image_index' => 0,
                    'items' => [[
                        'item_index' => 0,
                        'recognition_status' => 'found',
                        'candidates' => [
                            ['catalog_item_key' => "product:{$product->public_id}", 'confidence' => 0.91, 'methods' => ['visual']],
                            ['catalog_item_key' => "variant:{$variants->first()->public_id}", 'confidence' => 0.88, 'methods' => ['visual', 'ocr']],
                            ['catalog_item_key' => "product:{$foreign->public_id}", 'confidence' => 0.8, 'methods' => ['visual']],
                        ],
                    ]],
                ]]],
            ]);
        });

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.recognize'), [
                'purpose' => 'sale',
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
                'images' => [UploadedFile::fake()->image('one.jpg')],
                'capture_ids' => ['capture-1'],
            ])
            ->assertOk()
            ->assertJsonCount(1, 'data.0.candidates')
            ->assertJsonPath('data.0.candidates.0.productPublicId', $product->public_id)
            ->assertJsonCount(2, 'data.0.candidates.0.options')
            ->assertJsonPath('data.0.match.productPublicId', $product->public_id)
            ->assertJsonPath('data.0.selectedOption', null);
    }

    public function test_recognition_rejects_more_than_configured_image_limit(): void
    {
        [$user, $store] = $this->ownerAndStore();

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.recognize'), [
                'purpose' => 'sale',
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
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
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
                'images' => [UploadedFile::fake()->image('one.jpg')],
            ])->assertForbidden();
    }

    public function test_scanner_quota_is_account_scoped_and_resets_each_month(): void
    {
        $this->travelTo('2026-09-07 10:00:00');
        [$user, $store] = $this->ownerAndStore();
        $store->subscription()->sole()->plan()->update(['max_scans' => 2]);
        $payload = [
            'purpose' => 'sale',
            'type' => 'barcode',
            'identifier' => 'not-found',
        ];

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.lookup'), $payload)->assertOk();
        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.lookup'), $payload)->assertOk();
        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.lookup'), $payload)
            ->assertTooManyRequests()
            ->assertJsonPath('code', 'SCAN_LIMIT_REACHED')
            ->assertJsonPath('used', 2)
            ->assertJsonPath('limit', 2);
        $this->assertDatabaseHas('subscription_scan_usages', [
            'user_id' => $user->id,
            'period_start' => '2026-09-01',
            'used' => 2,
        ]);
        $this->assertDatabaseCount('subscription_scan_events', 2);

        // 17:01 UTC is already the next calendar month in Asia/Jakarta.
        $this->travelTo('2026-09-30 17:01:00');
        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.usages.store'), ['purpose' => 'product'])->assertOk();
        $this->assertDatabaseHas('subscription_scan_usages', [
            'user_id' => $user->id,
            'period_start' => '2026-10-01',
            'used' => 1,
        ]);
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
                    'item_type' => 'packaged_product',
                    'identity' => [
                        'display_name' => 'Aqua Air Mineral 600 ml',
                    ],
                    'pricing' => [
                        'estimated_purchase_price' => '2700',
                        'recommended_selling_price' => '3500',
                    ],
                ],
            ]);
        });

        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.discover'), [
                'purpose' => 'product',
                'market' => 'ID',
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
                'images' => collect(range(1, 3))->map(fn (int $index) => UploadedFile::fake()->image("{$index}.jpg"))->all(),
            ])
            ->assertOk()
            ->assertJsonPath('data.identity.display_name', 'Aqua Air Mineral 600 ml')
            ->assertJsonMissingPath('data.name');

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

        $parentBody = collect($requestBodies)->first(fn (string $body, string $url) => str_ends_with($url, "product:{$product->public_id}"));
        $withPhotoBody = collect($requestBodies)->first(fn (string $body, string $url) => str_ends_with($url, "variant:{$withPhoto->public_id}"));
        $withoutPhotoBody = collect($requestBodies)->first(fn (string $body, string $url) => str_ends_with($url, "variant:{$withoutPhoto->public_id}"));

        $this->assertIsString($parentBody);
        $this->assertIsString($withPhotoBody);
        $this->assertIsString($withoutPhotoBody);
        $this->assertStringContainsString('"active":true', $parentBody);
        $this->assertStringContainsString('name="images"', $parentBody);
        $this->assertStringContainsString('name="images"', $withPhotoBody);
        $this->assertStringNotContainsString('name="images"', $withoutPhotoBody);
    }

    public function test_capacity_rejection_does_not_consume_scan_quota(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        Http::fake(['*/api/v1/catalog-item-recognitions' => Http::response([
            'status' => 'error', 'data' => ['code' => 'SERVICE_BUSY'],
        ], 429)]);
        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.recognize'), [
                'purpose' => 'sale',
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
                'images' => [UploadedFile::fake()->image('one.jpg')],
            ])->assertStatus(429)->assertJsonPath('code', 'SCANNER_BUSY')->assertJsonPath('retryable', true);
        $this->assertDatabaseCount('subscription_scan_events', 0);
    }

    public function test_discovery_retries_charge_once_and_changed_content_is_rejected_at_limit(): void
    {
        [$user, $store] = $this->ownerAndStore();
        $store->subscription()->sole()->plan()->update(['max_scans' => 1]);
        config()->set('services.catalog_intelligence.enabled', true);
        $this->mock(CatalogIntelligenceClient::class, function (MockInterface $mock): void {
            $mock->shouldReceive('discover')->twice()->withArgs(
                fn ($store, $images, $market, $requestId): bool => $requestId === '318067e4-d56e-4538-9363-d16eb5a0d12b',
            )->andReturn(['status' => 'success', 'data' => []]);
        });
        $payload = [
            'purpose' => 'product', 'market' => 'ID',
            'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ];
        $this->actingAs($user)->withSession(['active_store_id' => $store->id]);
        $this->postJson(route('scanner.catalog-items.discover'), $payload)->assertOk();
        $this->postJson(route('scanner.catalog-items.discover'), $payload)->assertOk();
        $payload['images'] = [UploadedFile::fake()->image('changed.jpg', 30, 30)];
        $this->postJson(route('scanner.catalog-items.discover'), $payload)
            ->assertStatus(429)->assertJsonPath('retryable', false)->assertJsonPath('code', 'SCAN_LIMIT_REACHED');
        $this->assertDatabaseCount('subscription_scan_events', 1);
    }

    public function test_discovery_provider_quota_is_not_retryable(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        Http::fake(['*' => Http::response([
            'status' => 'error', 'data' => ['code' => 'DISCOVERY_QUOTA_EXCEEDED'],
        ], 429)]);
        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.discover'), [
                'purpose' => 'product', 'market' => 'ID',
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
                'images' => [UploadedFile::fake()->image('one.jpg')],
            ])->assertStatus(429)->assertJsonPath('code', 'DISCOVERY_QUOTA_EXCEEDED')->assertJsonPath('retryable', false);
        $this->assertDatabaseCount('subscription_scan_events', 0);
    }

    public function test_discovery_context_comes_from_store_and_session_not_payload(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        $body = '';
        Http::fake(function ($request) use (&$body) {
            $body = $request->body();

            return Http::response(['status' => 'success', 'data' => []]);
        });
        $this->actingAs($user)->withSession(['active_store_id' => $store->id, 'locale' => 'en'])
            ->postJson(route('scanner.catalog-items.discover'), [
                'purpose' => 'product', 'market' => 'SG', 'currency' => 'SGD', 'language' => 'vi',
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
                'images' => [UploadedFile::fake()->image('one.jpg')],
            ])->assertOk();
        $this->assertStringContainsString('name="market"', $body);
        $this->assertStringContainsString(strtoupper($store->country->code), $body);
        $this->assertStringContainsString('name="language"', $body);
        $this->assertStringContainsString('en', $body);
        $this->assertStringContainsString(strtoupper($store->country->currency_code), $body);
        $this->assertStringNotContainsString('SGD', $body);
    }

    public function test_temporary_discovery_failure_can_retry_without_charging_quota(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        Http::fake(['*' => Http::response([
            'status' => 'error', 'data' => ['code' => 'DISCOVERY_UNAVAILABLE'],
        ], 503)]);
        $this->actingAs($user)->withSession(['active_store_id' => $store->id])
            ->postJson(route('scanner.catalog-items.discover'), [
                'purpose' => 'product', 'market' => 'ID',
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
                'images' => [UploadedFile::fake()->image('one.jpg')],
            ])->assertStatus(503)->assertJsonPath('retryable', true);
        $this->assertDatabaseCount('subscription_scan_events', 0);
    }

    public function test_busy_then_success_and_identical_recognition_retry_charge_once(): void
    {
        [$user, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', true);
        Http::fake(['*' => Http::sequence()
            ->push(['status' => 'error', 'data' => ['code' => 'SERVICE_BUSY']], 429)
            ->push(['status' => 'success', 'data' => ['images' => []]])
            ->push(['status' => 'success', 'data' => ['images' => []]])
            ->push(['status' => 'success', 'data' => ['images' => []]])]);
        $payload = [
            'purpose' => 'sale',
            'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ];
        $this->actingAs($user)->withSession(['active_store_id' => $store->id]);
        $this->postJson(route('scanner.catalog-items.recognize'), $payload)->assertStatus(429);
        $this->assertDatabaseCount('subscription_scan_events', 0);
        $this->postJson(route('scanner.catalog-items.recognize'), $payload)->assertOk();
        $this->postJson(route('scanner.catalog-items.recognize'), $payload)->assertOk();
        $this->assertDatabaseCount('subscription_scan_events', 1);
        $payload['images'] = [UploadedFile::fake()->image('changed.jpg', 30, 30)];
        $this->postJson(route('scanner.catalog-items.recognize'), $payload)->assertOk();
        $this->assertDatabaseCount('subscription_scan_events', 2);
    }

    public function test_foreign_store_session_falls_back_to_authorized_store_for_discovery(): void
    {
        [$user, $store] = $this->ownerAndStore();
        $foreignStore = Store::factory()->create();
        config()->set('services.catalog_intelligence.enabled', true);
        $this->mock(CatalogIntelligenceClient::class, function (MockInterface $mock) use ($store): void {
            $mock->shouldReceive('discover')->once()->withArgs(
                fn ($sentStore, $images, $market, $requestId): bool => $sentStore->id === $store->id,
            )->andReturn(['status' => 'success', 'data' => []]);
        });
        $this->actingAs($user)->withSession(['active_store_id' => $foreignStore->id])
            ->postJson(route('scanner.catalog-items.discover'), [
                'purpose' => 'product', 'market' => 'ID',
                'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
                'images' => [UploadedFile::fake()->image('one.jpg')],
            ])->assertOk();
        $this->assertDatabaseMissing('subscription_scan_events', ['store_id' => $foreignStore->id]);
    }

    public function test_photo_endpoints_require_uuid_and_limit_discovery_to_three_images(): void
    {
        [$user, $store] = $this->ownerAndStore();
        $this->actingAs($user)->withSession(['active_store_id' => $store->id]);
        foreach (['recognize' => 'sale', 'discover' => 'product'] as $operation => $purpose) {
            $this->postJson(route('scanner.catalog-items.'.$operation), [
                'purpose' => $purpose, 'market' => 'ID', 'scan_request_id' => 'invalid',
                'images' => [UploadedFile::fake()->image('one.jpg')],
            ])->assertUnprocessable()->assertJsonValidationErrors('scan_request_id');
        }
        $this->postJson(route('scanner.catalog-items.discover'), [
            'purpose' => 'product', 'market' => 'ID',
            'scan_request_id' => '318067e4-d56e-4538-9363-d16eb5a0d12b',
            'images' => collect(range(1, 4))->map(fn (int $index) => UploadedFile::fake()->image("{$index}.jpg"))->all(),
        ])->assertUnprocessable()->assertJsonValidationErrors('images');
        $this->assertDatabaseCount('subscription_scan_events', 0);
    }

    /** @return array{User, Store} */
    private function ownerAndStore(): array
    {
        $user = User::factory()->create();
        $store = Store::factory()->for($user, 'owner')->create();

        return [$user, $store];
    }
}
