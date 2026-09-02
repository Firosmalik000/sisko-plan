<?php

namespace Tests\Feature;

use App\Models\PlatformSetting;
use App\Models\User;
use App\Support\PlatformPermission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PlatformSettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_branding_defaults_remain_available_before_the_settings_table_exists(): void
    {
        Schema::drop('platform_settings');

        $settings = PlatformSetting::current();

        $this->assertFalse($settings->exists);
        $this->assertSame(config('app.name'), $settings->brand_name);
        $this->assertSame([], $settings->social_links);
    }

    public function test_authorized_platform_admin_can_view_and_update_brand_and_seo_settings(): void
    {
        $admin = User::factory()->platformAdmin()->create();

        $this->actingAs($admin)
            ->get(route('super-admin.brand-seo.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('super-admin/brand-seo/index')
                ->where('can_manage', true)
                ->where('settings.brand_name', config('app.name'))
                ->where('settings.social_links', []));

        $this->actingAs($admin)->patch(route('super-admin.brand-seo.update'), [
            'brand_name' => 'Toko Maju',
            'tagline' => 'Operasional toko dalam satu alur.',
            'site_url' => 'https://tokomaju.example',
            'support_email' => 'halo@tokomaju.example',
            'support_phone' => '+62 812 3456 7890',
            'social_links' => [
                ['platform' => 'Instagram', 'url' => 'https://instagram.com/tokomaju'],
                ['platform' => 'YouTube', 'url' => 'https://youtube.com/@tokomaju'],
            ],
            'seo_title' => 'Kelola Toko Lebih Cepat',
            'seo_description' => 'Kelola transaksi, stok, kas, dan laporan toko dalam satu tempat.',
            'seo_keywords' => 'kasir, stok toko, laporan penjualan',
            'social_image_url' => 'https://tokomaju.example/social.jpg',
            'robots_index' => false,
        ])->assertRedirect();

        $settings = PlatformSetting::current();
        $this->assertSame('Toko Maju', $settings->brand_name);
        $this->assertSame('Instagram', $settings->social_links[0]['platform']);
        $this->assertFalse($settings->robots_index);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'platform_settings.updated',
            'subject_type' => PlatformSetting::class,
            'subject_id' => PlatformSetting::SINGLETON_ID,
        ]);

        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('name', 'Toko Maju')
                ->where('branding.brand_name', 'Toko Maju')
                ->where('branding.robots_index', false));
    }

    public function test_brand_and_seo_settings_validate_urls_limits_and_required_fields(): void
    {
        $admin = User::factory()->platformAdmin()->create();

        $this->actingAs($admin)->patch(route('super-admin.brand-seo.update'), [
            'brand_name' => '',
            'site_url' => 'javascript:alert(1)',
            'support_email' => 'bukan-email',
            'support_phone' => 'hubungi saya!',
            'social_links' => [
                ['platform' => 'Instagram', 'url' => 'ftp://example.com'],
            ],
            'seo_title' => '',
            'social_image_url' => 'data:image/png;base64,abc',
            'robots_index' => true,
        ])->assertSessionHasErrors([
            'brand_name',
            'site_url',
            'support_email',
            'support_phone',
            'social_links.0.url',
            'seo_title',
            'social_image_url',
        ]);

        $this->assertSame(config('app.name'), PlatformSetting::current()->brand_name);
        $this->assertDatabaseMissing('admin_audit_logs', [
            'action' => 'platform_settings.updated',
        ]);
    }

    public function test_authorized_platform_admin_can_upload_serve_replace_and_remove_logo(): void
    {
        Storage::fake('local');
        $admin = User::factory()->platformAdmin()->create();

        $this->actingAs($admin)
            ->post(route('super-admin.brand-seo.logo.update'), [
                'logo' => $this->pngUpload('logo.png'),
            ])
            ->assertRedirect();

        $firstPath = PlatformSetting::current()->logo_path;
        $this->assertNotNull($firstPath);
        Storage::disk('local')->assertExists($firstPath);

        $this->get(route('platform.logo'))->assertOk();
        $logoUrl = route('platform.logo', [
            'v' => substr(hash('sha256', $firstPath), 0, 12),
        ]);
        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('branding.logo_url', $logoUrl))
            ->assertSee('<link rel="icon" href="'.$logoUrl.'">', false)
            ->assertSee('<link rel="apple-touch-icon" href="'.$logoUrl.'">', false)
            ->assertSee('<meta property="og:image" content="'.$logoUrl.'">', false);

        $this->actingAs($admin)
            ->post(route('super-admin.brand-seo.logo.update'), [
                'logo' => $this->pngUpload('replacement.png'),
            ])
            ->assertRedirect();

        $secondPath = PlatformSetting::current()->logo_path;
        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('local')->assertMissing($firstPath);
        Storage::disk('local')->assertExists($secondPath);

        $this->actingAs($admin)
            ->delete(route('super-admin.brand-seo.logo.destroy'))
            ->assertRedirect();

        $this->assertNull(PlatformSetting::current()->logo_path);
        Storage::disk('local')->assertMissing($secondPath);
        $this->get(route('platform.logo'))->assertNotFound();
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'platform_settings.logo_removed',
        ]);
    }

    public function test_platform_logo_rejects_unsupported_and_oversized_files(): void
    {
        Storage::fake('local');
        $admin = User::factory()->platformAdmin()->create();

        $this->actingAs($admin)
            ->post(route('super-admin.brand-seo.logo.update'), [
                'logo' => UploadedFile::fake()->createWithContent(
                    'logo.svg',
                    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
                ),
            ])
            ->assertSessionHasErrors('logo');

        $this->actingAs($admin)
            ->post(route('super-admin.brand-seo.logo.update'), [
                'logo' => UploadedFile::fake()->create('logo.png', 2049, 'image/png'),
            ])
            ->assertSessionHasErrors('logo');

        $this->assertNull(PlatformSetting::current()->logo_path);
    }

    public function test_branding_view_and_manage_permissions_are_enforced_separately(): void
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->syncPermissions([PlatformPermission::BRANDING_VIEW]);

        $this->actingAs($admin)
            ->get(route('super-admin.brand-seo.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('can_manage', false));

        $this->actingAs($admin)
            ->patch(route('super-admin.brand-seo.update'), [])
            ->assertForbidden();

        $this->actingAs($admin)
            ->post(route('super-admin.brand-seo.logo.update'), [
                'logo' => $this->pngUpload('logo.png'),
            ])
            ->assertForbidden();

        $admin->syncPermissions([PlatformPermission::BRANDING_MANAGE]);
        $this->actingAs($admin)
            ->get(route('super-admin.brand-seo.index'))
            ->assertForbidden();
    }

    public function test_store_user_cannot_access_platform_brand_settings(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('super-admin.brand-seo.index'))
            ->assertForbidden();
    }

    private function pngUpload(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
        );
    }
}
