<?php

namespace Tests\Feature;

use App\Enums\PromotionFrequency;
use App\Enums\PromotionLocale;
use App\Enums\PromotionPlacement;
use App\Enums\PromotionStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Promotion;
use App\Models\Store;
use App\Models\User;
use App\Services\Promotions\PromotionDelivery;
use App\Support\PlatformPermission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PromotionManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_view_and_manage_permissions_are_enforced(): void
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->syncPermissions([PlatformPermission::PROMOTIONS_VIEW]);

        $this->actingAs($admin)->get(route('super-admin.promotions.index'))
            ->assertInertia(fn (Assert $page) => $page->component('platform/promotions/index')->where('can_manage', false));
        $this->actingAs($admin)->post(route('super-admin.promotions.store'), [])->assertForbidden();

        $admin->syncPermissions([PlatformPermission::PROMOTIONS_MANAGE]);
        $this->actingAs($admin)->get(route('super-admin.promotions.index'))->assertForbidden();
    }

    public function test_admin_can_create_dashboard_and_app_open_promotions_with_private_images_and_audits(): void
    {
        Storage::fake('local');
        $admin = User::factory()->platformAdmin()->create();

        $this->actingAs($admin)->post(route('super-admin.promotions.store'), $this->payload([
            'image' => $this->image('landscape.png', 1600, 900),
            'destination_url' => '/pricing',
            'frequency' => 'once_per_day',
        ]))->assertRedirect()->assertSessionHasNoErrors();

        $banner = Promotion::query()->sole();
        $this->assertSame(PromotionPlacement::DashboardBanner, $banner->placement);
        $this->assertNull($banner->frequency);
        $this->assertStringStartsWith('platform-promotions/', $banner->image_path);
        $this->assertStringNotContainsString('landscape.png', $banner->image_path);
        Storage::disk('local')->assertExists($banner->image_path);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'promotion.created', 'subject_id' => $banner->id]);

        $this->actingAs($admin)->post(route('super-admin.promotions.store'), $this->payload([
            'name' => 'App open EN',
            'placement' => 'app_open',
            'locale' => 'en',
            'image' => $this->image('portrait.webp', 1080, 1350),
            'frequency' => 'once_per_day',
        ]))->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseHas('promotions', ['name' => 'App open EN', 'frequency' => 'once_per_day']);
    }

    public function test_validation_rejects_bad_files_dimensions_dates_urls_and_frequency(): void
    {
        Storage::fake('local');
        $admin = User::factory()->platformAdmin()->create();

        $cases = [
            [$this->payload(['image' => UploadedFile::fake()->create('poster.svg', 10, 'image/svg+xml')]), 'image'],
            [$this->payload(['image' => UploadedFile::fake()->create('poster.png', 5121, 'image/png')]), 'image'],
            [$this->payload(['image' => $this->image('portrait.png', 900, 1200)]), 'image'],
            [$this->payload(['placement' => 'app_open', 'image' => $this->image('landscape.png', 1280, 720), 'frequency' => 'once_per_day']), 'image'],
            [$this->payload(['destination_url' => 'javascript:alert(1)', 'image' => $this->image('landscape.png', 1600, 900)]), 'destination_url'],
            [$this->payload(['destination_url' => '//evil.example', 'image' => $this->image('landscape.png', 1600, 900)]), 'destination_url'],
            [$this->payload(['destination_url' => '/\\evil.example', 'image' => $this->image('landscape.png', 1600, 900)]), 'destination_url'],
            [$this->payload(['ends_at' => '2026-09-11T00:00:00Z', 'image' => $this->image('landscape.png', 1600, 900)]), 'ends_at'],
            [$this->payload(['placement' => 'app_open', 'image' => $this->image('portrait.png', 1080, 1350), 'frequency' => null]), 'frequency'],
        ];

        foreach ($cases as [$payload, $error]) {
            $this->actingAs($admin)->post(route('super-admin.promotions.store'), $payload)->assertSessionHasErrors($error);
        }
        $this->assertDatabaseCount('promotions', 0);
    }

    public function test_update_preserves_or_replaces_image_and_delete_cleans_storage(): void
    {
        Storage::fake('local');
        $admin = User::factory()->platformAdmin()->create();
        $promotion = $this->createPromotion();
        Storage::disk('local')->put($promotion->image_path, $this->image('old.png', 1600, 900)->getContent());

        $this->actingAs($admin)->patch(route('super-admin.promotions.update', $promotion), $this->payload([
            'name' => 'Updated',
            'image' => null,
        ]))->assertRedirect()->assertSessionHasNoErrors();
        $this->assertSame($promotion->image_path, $promotion->fresh()->image_path);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'promotion.updated', 'subject_id' => $promotion->id]);

        $this->actingAs($admin)->patch(route('super-admin.promotions.update', $promotion), $this->payload([
            'placement' => 'app_open',
            'frequency' => 'once_per_day',
            'image' => null,
        ]))->assertSessionHasErrors('image');
        $this->assertSame(PromotionPlacement::DashboardBanner, $promotion->fresh()->placement);

        $this->actingAs($admin)->patch(route('super-admin.promotions.status', $promotion), [
            'status' => 'paused',
        ])->assertRedirect();
        $this->assertDatabaseHas('admin_audit_logs', [
            'action' => 'promotion.status_changed',
            'subject_id' => $promotion->id,
        ]);

        $oldPath = $promotion->image_path;
        $this->actingAs($admin)->post(route('super-admin.promotions.update', $promotion), [
            ...$this->payload(['image' => $this->image('new.png', 1600, 900)]),
            '_method' => 'patch',
        ])->assertRedirect()->assertSessionHasNoErrors();
        $promotion->refresh();
        Storage::disk('local')->assertMissing($oldPath);
        Storage::disk('local')->assertExists($promotion->image_path);

        $newPath = $promotion->image_path;
        $this->actingAs($admin)->delete(route('super-admin.promotions.destroy', $promotion))->assertRedirect();
        $this->assertDatabaseMissing('promotions', ['id' => $promotion->id]);
        Storage::disk('local')->assertMissing($newPath);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'promotion.deleted', 'subject_id' => $promotion->id]);
    }

    public function test_delivery_enforces_runtime_locale_placement_sorting_and_safe_payload(): void
    {
        $now = now();
        $this->createPromotion(['name' => 'Second', 'sort_order' => 20]);
        $this->createPromotion(['name' => 'First', 'sort_order' => 0, 'locale' => PromotionLocale::All]);
        $this->createPromotion(['name' => 'Wrong locale', 'locale' => PromotionLocale::English]);
        $this->createPromotion(['name' => 'Draft', 'status' => PromotionStatus::Draft]);
        $this->createPromotion(['name' => 'Paused', 'status' => PromotionStatus::Paused]);
        $this->createPromotion(['name' => 'Future', 'starts_at' => $now->addDay(), 'ends_at' => $now->addDays(2)]);
        $this->createPromotion(['name' => 'Expired', 'starts_at' => $now->subDays(2), 'ends_at' => $now->subDay()]);
        $this->createPromotion(['name' => 'App', 'placement' => PromotionPlacement::AppOpen, 'frequency' => PromotionFrequency::OncePerDay]);

        $delivery = app(PromotionDelivery::class);
        $banners = $delivery->dashboardBanners('id');
        $this->assertSame(['First', 'Second'], $banners->pluck('name')->all());
        $this->assertSame(['App'], $delivery->appOpenPromotions('id')->pluck('name')->all());
        $payload = $delivery->bannerPayload($banners->first());
        $this->assertArrayNotHasKey('image_path', $payload);
        $this->assertStringContainsString('/promotion-media/', $payload['image_url']);
    }

    public function test_controlled_image_endpoint_requires_permission_or_customer_eligibility(): void
    {
        Storage::fake('local');
        $promotion = $this->createPromotion();
        Storage::disk('local')->put($promotion->image_path, 'image');
        $admin = User::factory()->platformAdmin()->create();
        $admin->syncPermissions([]);

        $this->actingAs($admin)->get(route('promotions.image', $promotion))->assertForbidden();
        $admin->syncPermissions([PlatformPermission::PROMOTIONS_VIEW]);
        $this->actingAs($admin)->get(route('promotions.image', $promotion))->assertOk()->assertHeader('x-content-type-options', 'nosniff');

        $customer = User::factory()->create();
        $this->actingAs($customer)->withSession(['locale' => 'id'])->get(route('promotions.image', $promotion))->assertOk();
        $promotion->update(['status' => PromotionStatus::Paused]);
        $this->actingAs($customer)->withSession(['locale' => 'id'])->get(route('promotions.image', $promotion))->assertNotFound();
    }

    public function test_delivery_locale_targeting_supports_every_customer_locale_and_global_content(): void
    {
        $this->createPromotion(['name' => 'Global', 'locale' => PromotionLocale::All, 'sort_order' => 0]);
        foreach ([
            'id' => PromotionLocale::Indonesian,
            'ms' => PromotionLocale::Malay,
            'vi' => PromotionLocale::Vietnamese,
            'en' => PromotionLocale::English,
        ] as $locale => $promotionLocale) {
            $this->createPromotion(['name' => strtoupper($locale), 'locale' => $promotionLocale]);
        }

        $delivery = app(PromotionDelivery::class);
        foreach (['id', 'ms', 'vi', 'en'] as $locale) {
            $this->assertSame(['Global', strtoupper($locale)], $delivery->dashboardBanners($locale)->pluck('name')->all());
        }
    }

    public function test_customer_dashboard_and_shell_receive_only_their_eligible_placement(): void
    {
        $customer = User::factory()->create();
        $store = Store::factory()->ownedBy($customer)->create();
        $banner = $this->createPromotion(['name' => 'Dashboard']);
        $appOpen = $this->createPromotion([
            'name' => 'Interstitial',
            'placement' => PromotionPlacement::AppOpen,
            'frequency' => PromotionFrequency::OncePerSession,
            'sort_order' => 0,
        ]);

        $this->actingAs($customer)
            ->withSession(['active_store_id' => $store->id, 'locale' => 'id'])
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/dashboard/index')
                ->has('promotions', 1)
                ->where('promotions.0.public_id', $banner->public_id)
                ->missing('promotions.0.image_path')
                ->has('appOpenPromotions', 1)
                ->where('appOpenPromotions.0.public_id', $appOpen->public_id)
                ->missing('appOpenPromotions.0.image_path'));
        $this->actingAs($customer)->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page->where('appOpenPromotions', []));

        $customerWithoutStore = User::factory()->create();
        $business = Business::factory()->create();
        BusinessMembership::factory()->for($business)->for($customerWithoutStore)->create([
            'business_role' => 'owner',
            'status' => 'active',
        ]);
        $this->actingAs($customerWithoutStore)->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('activeStore', null)
                ->has('appOpenPromotions', 1)
                ->where('appOpenPromotions.0.public_id', $appOpen->public_id));
        $admin = User::factory()->platformAdmin()->create();
        $this->actingAs($admin)->get(route('super-admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('appOpenPromotions', []));
    }

    /** @param array<string, mixed> $overrides */
    private function payload(array $overrides = []): array
    {
        return array_replace([
            'name' => 'September banner',
            'placement' => 'dashboard_banner',
            'locale' => 'id',
            'image' => null,
            'destination_url' => null,
            'starts_at' => '2026-09-12T00:00:00Z',
            'ends_at' => '2026-09-30T23:59:00Z',
            'sort_order' => 0,
            'status' => 'active',
            'frequency' => null,
        ], $overrides);
    }

    /** @param array<string, mixed> $overrides */
    private function createPromotion(array $overrides = []): Promotion
    {
        return Promotion::create(array_replace([
            'name' => 'Banner',
            'placement' => PromotionPlacement::DashboardBanner,
            'image_path' => 'platform-promotions/test.png',
            'destination_url' => '/pricing',
            'locale' => PromotionLocale::Indonesian,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addDay(),
            'sort_order' => 10,
            'status' => PromotionStatus::Active,
            'frequency' => null,
        ], $overrides));
    }

    private function image(string $name, int $width, int $height): UploadedFile
    {
        $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
        $png = substr_replace($png, pack('N', $width).pack('N', $height), 16, 8);

        return UploadedFile::fake()->createWithContent($name, $png);
    }
}
