<?php

namespace Tests\Feature\Api\V1\Scanner;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\Intelligence\CatalogIntelligenceClient;
use App\Services\Subscriptions\ScanQuota;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Mockery\MockInterface;
use Tests\TestCase;

/**
 * Kontrak scanner API mobile (design §8, Req 13.4, 13.7, 14.1, 14.6):
 * `GET /scanner/quota` + proxy `POST /scanner/recognitions` & `/discoveries`.
 * CatalogIntelligenceClient selalu di-fake via container (tanpa network nyata).
 * Hidrasi harga/stok berasal dari DB sisko-plan, kuota idempoten per
 * logical_request_id (Property 17), service down tidak memotong kuota.
 */
class ScannerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.catalog_intelligence.enabled', true);
        config()->set('services.catalog_intelligence.max_images', 3);
    }

    /** @return array{User, Store} */
    private function ownerAndStore(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        return [$owner, $store];
    }

    private function setMaxScans(Store $store, int $maxScans): void
    {
        $store->subscription()->sole()->plan()->update(['max_scans' => $maxScans]);
    }

    /** @param array<int, array<string, mixed>> $items */
    private function fakeRecognizeImages(array $items): void
    {
        $this->mock(CatalogIntelligenceClient::class, function (MockInterface $mock) use ($items): void {
            $mock->shouldReceive('recognize')->andReturn([
                'status' => 'success',
                'data' => ['images' => [[
                    'image_index' => 0,
                    'items' => $items,
                ]]],
            ]);
        });
    }

    public function test_quota_returns_full_field_set_for_limited_plan(): void
    {
        $this->travelTo('2026-09-07 10:00:00');
        [$owner, $store] = $this->ownerAndStore();
        $this->setMaxScans($store, 50);
        Sanctum::actingAs($owner, ['store.read']);

        $this->getJson("/api/v1/stores/{$store->public_id}/scanner/quota")
            ->assertOk()
            ->assertJsonPath('data.used', 0)
            ->assertJsonPath('data.limit', 50)
            ->assertJsonPath('data.remaining', 50)
            ->assertJsonPath('data.unlimited', false)
            ->assertJsonPath('data.period_start', '2026-09-01T00:00:00Z')
            ->assertJsonPath('data.reset_at', '2026-10-01T00:00:00Z')
            ->assertJsonStructure(['data' => [
                'used', 'limit', 'remaining', 'unlimited', 'period_start', 'period_end', 'reset_at',
            ]]);
    }

    public function test_quota_reports_unlimited_when_plan_has_no_cap(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $this->setMaxScans($store, 0);
        Sanctum::actingAs($owner, ['store.read']);

        $this->getJson("/api/v1/stores/{$store->public_id}/scanner/quota")
            ->assertOk()
            ->assertJsonPath('data.unlimited', true)
            ->assertJsonPath('data.limit', null)
            ->assertJsonPath('data.remaining', null);
    }

    public function test_quota_requires_store_read_ability(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        Sanctum::actingAs($owner, ['scan.use']);

        $this->getJson("/api/v1/stores/{$store->public_id}/scanner/quota")
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_recognition_returns_found_with_prices_hydrated_from_database(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $product = Product::factory()->for($store)->create(['name' => 'Kopi Susu']);
        // Harga DB otoritatif — intelligence tidak pernah mengirim harga.
        $product->productUnits()->sole()->update(['selling_price' => '17500', 'purchase_price' => '9000']);
        $this->fakeRecognizeImages([[
            'item_index' => 0,
            'recognition_status' => 'found',
            'candidates' => [
                ['catalog_item_key' => "product:{$product->public_id}", 'confidence' => 0.95, 'methods' => ['visual']],
            ],
        ]]);
        Sanctum::actingAs($owner, ['scan.use']);

        $response = $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", [
            'logical_request_id' => 'rec-hydrate-1',
            'images' => [UploadedFile::fake()->image('one.jpg')],
            'capture_ids' => ['capture-1'],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'found')
            ->assertJsonPath('data.candidates.0.match.productPublicId', $product->public_id)
            ->assertJsonPath('data.candidates.0.match.options.0.sellingPrice', '17500.0000')
            ->assertJsonPath('data.quota.used', 1);

        // Kuota terpotong tepat 1.
        $this->assertDatabaseHas('subscription_scan_usages', [
            'user_id' => $owner->id,
            'used' => 1,
        ]);
        $this->assertDatabaseCount('subscription_scan_events', 1);
    }

    public function test_recognition_is_idempotent_per_logical_request_id(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $product = Product::factory()->for($store)->create();
        $this->fakeRecognizeImages([[
            'item_index' => 0,
            'recognition_status' => 'found',
            'candidates' => [
                ['catalog_item_key' => "product:{$product->public_id}", 'confidence' => 0.9, 'methods' => ['visual']],
            ],
        ]]);
        Sanctum::actingAs($owner, ['scan.use']);

        $payload = [
            'logical_request_id' => 'stable-request-id',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ];

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", $payload)
            ->assertOk()->assertJsonPath('data.quota.used', 1);
        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", $payload)
            ->assertOk()->assertJsonPath('data.quota.used', 1);

        // Property 17: kuota terpotong tepat sekali walau di-retry.
        $this->assertDatabaseCount('subscription_scan_events', 1);
    }

    public function test_recognition_returns_quota_exceeded_without_calling_intelligence(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $this->setMaxScans($store, 1);
        // Habiskan kuota lewat request id lain.
        app(ScanQuota::class)->consume($store, 'already-used', 'recognize');
        $this->mock(CatalogIntelligenceClient::class, fn (MockInterface $mock) => $mock->shouldNotReceive('recognize'));
        Sanctum::actingAs($owner, ['scan.use']);

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", [
            'logical_request_id' => 'over-limit',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ])
            ->assertStatus(402)
            ->assertJsonPath('error.code', 'QUOTA_EXCEEDED')
            ->assertJsonPath('error.retryable', false);

        // Tidak menambah used (masih 1 dari konsumsi awal).
        $this->assertDatabaseCount('subscription_scan_events', 1);
    }

    public function test_recognition_returns_service_unavailable_when_disabled_without_charging(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        config()->set('services.catalog_intelligence.enabled', false);
        $this->mock(CatalogIntelligenceClient::class, fn (MockInterface $mock) => $mock->shouldNotReceive('recognize'));
        Sanctum::actingAs($owner, ['scan.use']);

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", [
            'logical_request_id' => 'svc-down',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ])
            ->assertStatus(503)
            ->assertJsonPath('error.code', 'SERVICE_UNAVAILABLE')
            ->assertJsonPath('error.retryable', true);

        $this->assertDatabaseCount('subscription_scan_events', 0);
    }

    public function test_recognition_service_exception_does_not_charge_quota(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $this->mock(CatalogIntelligenceClient::class, function (MockInterface $mock): void {
            $mock->shouldReceive('recognize')->andThrow(new \RuntimeException('upstream timeout'));
        });
        Sanctum::actingAs($owner, ['scan.use']);

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", [
            'logical_request_id' => 'svc-throw',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ])
            ->assertStatus(503)
            ->assertJsonPath('error.code', 'SERVICE_UNAVAILABLE');

        $this->assertDatabaseCount('subscription_scan_events', 0);
    }

    public function test_recognition_requires_scan_use_ability(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $this->mock(CatalogIntelligenceClient::class, fn (MockInterface $mock) => $mock->shouldNotReceive('recognize'));
        Sanctum::actingAs($owner, ['store.read']);

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", [
            'logical_request_id' => 'no-ability',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_recognition_requires_logical_request_id(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        Sanctum::actingAs($owner, ['scan.use']);

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", [
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['error' => ['fields' => ['logical_request_id']]]);
    }

    public function test_discovery_proxies_and_charges_quota_once_per_request_id(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $this->mock(CatalogIntelligenceClient::class, function (MockInterface $mock) use ($store): void {
            $mock->shouldReceive('discover')->twice()->withArgs(
                fn ($sentStore, array $images, string $market, string $requestId): bool => $sentStore->id === $store->id
                    && $market === strtoupper($store->country->code)
                    && $requestId === 'disc-stable',
            )->andReturn([
                'status' => 'success',
                'data' => ['identity' => ['display_name' => 'Aqua 600ml']],
            ]);
        });
        Sanctum::actingAs($owner, ['scan.use']);

        $payload = [
            'logical_request_id' => 'disc-stable',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ];

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/discoveries", $payload)
            ->assertOk()
            ->assertJsonPath('data.discovery.identity.display_name', 'Aqua 600ml')
            ->assertJsonPath('data.quota.used', 1);
        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/discoveries", $payload)
            ->assertOk()
            ->assertJsonPath('data.quota.used', 1);

        $this->assertDatabaseCount('subscription_scan_events', 1);
    }

    public function test_discovery_requires_scan_use_ability(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $this->mock(CatalogIntelligenceClient::class, fn (MockInterface $mock) => $mock->shouldNotReceive('discover'));
        Sanctum::actingAs($owner, ['store.read']);

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/discoveries", [
            'logical_request_id' => 'disc-no-ability',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_scanner_is_store_scoped_and_rejects_cross_tenant(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        [$otherOwner, $otherStore] = $this->ownerAndStore();
        $this->mock(CatalogIntelligenceClient::class, fn (MockInterface $mock) => $mock->shouldNotReceive('recognize'));
        Sanctum::actingAs($owner, ['scan.use', 'store.read']);

        // Owner toko A tak boleh mengakses scanner toko B: perlakukan 404 (tanpa
        // membocorkan keberadaan toko lintas-tenant).
        $this->getJson("/api/v1/stores/{$otherStore->public_id}/scanner/quota")
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
        $this->postJson("/api/v1/stores/{$otherStore->public_id}/scanner/recognitions", [
            'logical_request_id' => 'cross-tenant',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ])->assertStatus(404);

        $this->assertDatabaseMissing('subscription_scan_events', ['store_id' => $otherStore->id]);
    }

    public function test_cashier_with_scan_use_can_recognize(): void
    {
        [$owner, $store] = $this->ownerAndStore();
        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value],
        ]);
        $product = Product::factory()->for($store)->create();
        $this->fakeRecognizeImages([[
            'item_index' => 0,
            'recognition_status' => 'found',
            'candidates' => [
                ['catalog_item_key' => "product:{$product->public_id}", 'confidence' => 0.9, 'methods' => ['visual']],
            ],
        ]]);
        Sanctum::actingAs($cashier, ['scan.use']);

        $this->postJson("/api/v1/stores/{$store->public_id}/scanner/recognitions", [
            'logical_request_id' => 'cashier-scan',
            'images' => [UploadedFile::fake()->image('one.jpg')],
        ])->assertOk()->assertJsonPath('data.status', 'found');
    }
}
