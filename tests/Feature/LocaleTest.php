<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_visit_locale_follows_the_ip_country_header(): void
    {
        foreach ([
            'ID' => 'id',
            'MY' => 'ms',
            'VN' => 'vi',
            'SG' => 'en',
            'XX' => 'en',
        ] as $country => $locale) {
            $this->withHeader('CF-IPCountry', $country)
                ->get(route('login'))
                ->assertInertia(fn (Assert $page) => $page
                    ->component('auth/login')
                    ->where('locale', $locale))
                ->assertSessionMissing('locale');
        }
    }

    public function test_missing_ip_country_header_defaults_to_english(): void
    {
        $this->get(route('login'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/login')
                ->where('locale', 'en'));
    }

    public function test_explicit_locale_selection_overrides_the_ip_country(): void
    {
        $this->withSession(['locale' => 'ms'])
            ->withHeader('CF-IPCountry', 'ID')
            ->get(route('login'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/login')
                ->where('locale', 'ms'));
    }

    public function test_every_server_translation_has_the_required_market_outputs(): void
    {
        $indonesian = json_decode(file_get_contents(lang_path('id.json')), true, flags: JSON_THROW_ON_ERROR);
        $malay = json_decode(file_get_contents(lang_path('ms.json')), true, flags: JSON_THROW_ON_ERROR);
        $english = json_decode(file_get_contents(lang_path('en.json')), true, flags: JSON_THROW_ON_ERROR);
        $vietnamese = json_decode(file_get_contents(lang_path('vi.json')), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame([], array_values(array_diff(array_keys($indonesian), array_keys($malay))));
        $this->assertSame([], array_values(array_diff(array_keys($malay), array_keys($indonesian), array_keys($english))));
        $this->assertSame([], array_values(array_diff(array_keys($english), array_keys($malay))));

        foreach ([$indonesian, $malay, $english, $vietnamese] as $translations) {
            $this->assertNotContains('', array_values($translations));
        }
    }

    public function test_dynamic_server_messages_are_localized_with_their_parameters(): void
    {
        App::setLocale('id');
        $this->assertSame(
            'Batas 3 toko pada paket Usaha sudah tercapai.',
            __('Batas :limit toko pada paket :plan sudah tercapai.', ['limit' => 3, 'plan' => 'Usaha']),
        );

        App::setLocale('ms');
        $this->assertSame(
            'Had 3 kedai bagi pelan Usaha telah dicapai.',
            __('Batas :limit toko pada paket :plan sudah tercapai.', ['limit' => 3, 'plan' => 'Usaha']),
        );
        $this->assertSame(
            'Selesaikan SO-001 sebelum memulakan kiraan stok baharu.',
            __('Selesaikan :document sebelum memulai opname baru.', ['document' => 'SO-001']),
        );

        App::setLocale('en');
        $this->assertSame(
            'The limit of 3 stores for the Business plan has been reached.',
            __('Batas :limit toko pada paket :plan sudah tercapai.', ['limit' => 3, 'plan' => 'Business']),
        );

        App::setLocale('vi');
        $this->assertSame('Đã đạt giới hạn 3 cửa hàng của gói Business.', __('Batas :limit toko pada paket :plan sudah tercapai.', ['limit' => 3, 'plan' => 'Business']));
        $this->assertSame('Trường tên là bắt buộc.', __('The name field is required.'));
    }

    public function test_public_pricing_reasons_follow_the_selected_market_language(): void
    {
        $this->seed(PlanSeeder::class);
        Plan::query()->create([
            'code' => 'business-locale-test',
            'name' => 'Business',
            'description' => 'Test plan',
            'kind' => Plan::KIND_BASE,
            'billing_cycle' => Plan::BILLING_FIXED,
            'monthly_price' => '100',
            'duration_months' => 1,
            'max_stores' => 3,
            'max_products' => 1000,
            'max_members' => 5,
            'max_scans' => 100,
            'is_default' => false,
            'is_trial' => false,
            'is_active' => true,
        ]);
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->withSession(['market' => 'ms', 'locale' => 'ms'])
            ->get(route('pricing'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/pricing')
                ->where('plans.0.disabled_reason', 'Akaun pentadbir platform tidak menggunakan pelan kedai.'));
    }

    public function test_guest_can_select_malay_without_changing_market(): void
    {
        $this->from(route('login'))
            ->post(route('locale.update'), ['locale' => 'ms'])
            ->assertRedirect(route('login'))
            ->assertSessionMissing('market')
            ->assertSessionHas('locale', 'ms');
    }

    public function test_guest_can_select_vietnamese_without_changing_market(): void
    {
        $this->from(route('login'))
            ->post(route('locale.update'), ['locale' => 'vi'])
            ->assertRedirect(route('login'))
            ->assertSessionMissing('market')
            ->assertSessionHas('locale', 'vi');
    }

    public function test_public_pages_offer_all_supported_languages(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'ms', 'locale' => 'en'])
            ->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/welcome')
                ->where('market', 'ms')
                ->where('locale', 'en')
                ->where('locales.0.code', 'en')
                ->where('locales.1.code', 'ms')
                ->where('locales.2.code', 'id')
                ->where('locales.3.code', 'vi'));

        $this->from(route('login'))
            ->post(route('locale.update'), ['locale' => 'en'])
            ->assertRedirect(route('login'))
            ->assertSessionHas('locale', 'en');
    }

    public function test_customer_portal_offers_all_supported_languages_without_changing_market(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'id', 'locale' => 'id'])
            ->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'id')
                ->where('locale', 'id')
                ->where('locales.0.code', 'en')
                ->where('locales.1.code', 'ms')
                ->where('locales.2.code', 'id')
                ->where('locales.3.code', 'vi'));

        $this->actingAs($user)
            ->withSession(['market' => 'id', 'locale' => 'id'])
            ->from(route('stores.index'))
            ->post(route('locale.update'), ['locale' => 'vi'])
            ->assertRedirect(route('stores.index'))
            ->assertSessionHas('market', 'id')
            ->assertSessionHas('locale', 'vi');
    }

    public function test_malaysia_customer_can_select_indonesian_without_changing_market(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'ms', 'locale' => 'en'])
            ->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'ms')
                ->where('locale', 'en')
                ->where('locales.0.code', 'en')
                ->where('locales.1.code', 'ms')
                ->where('locales.2.code', 'id')
                ->where('locales.3.code', 'vi'));

        $this->actingAs($user)
            ->withSession(['market' => 'ms', 'locale' => 'en'])
            ->from(route('stores.index'))
            ->post(route('locale.update'), ['locale' => 'id'])
            ->assertRedirect(route('stores.index'))
            ->assertSessionHas('market', 'ms')
            ->assertSessionHas('locale', 'id');
    }

    public function test_platform_admin_offers_all_supported_languages(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->withSession(['market' => 'id', 'locale' => 'id'])
            ->get(route('super-admin.security.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'id')
                ->where('locale', 'id')
                ->where('locales.0.code', 'en')
                ->where('locales.1.code', 'ms')
                ->where('locales.2.code', 'id')
                ->where('locales.3.code', 'vi'));
    }

    public function test_customer_validation_messages_use_english(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'id', 'locale' => 'en'])
            ->from(route('stores.create'))
            ->post(route('stores.store'), [])
            ->assertRedirect(route('stores.create'))
            ->assertSessionHasErrors([
                'name' => 'The name field is required.',
            ]);
    }

    public function test_malay_locale_uses_malay_validation_messages(): void
    {
        $this->withSession(['market' => 'ms', 'locale' => 'ms'])
            ->from(route('login'))
            ->post(route('login.store'), [
                'email' => 'alamat-tidak-sah',
                'password' => '',
            ])
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors([
                'password' => 'password mesti diisi.',
            ]);
    }
}
