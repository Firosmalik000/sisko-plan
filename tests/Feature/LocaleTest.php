<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\App;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    private const LOCALE_ORDER = ['en', 'id', 'ms', 'vi', 'th', 'fil', 'km', 'lo', 'my', 'tet'];

    public function test_first_visit_locale_follows_the_ip_country_header(): void
    {
        foreach ([
            'ID' => 'id',
            'MY' => 'ms',
            'VN' => 'vi',
            'KH' => 'km',
            'LA' => 'lo',
            'MM' => 'my',
            'PH' => 'fil',
            'SG' => 'en',
            'TH' => 'th',
            'TL' => 'tet',
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

    public function test_first_html_response_uses_the_detected_market_currency_metadata(): void
    {
        $this->withHeader('CF-IPCountry', 'SG')
            ->get(route('login'))
            ->assertSee('data-market="SG"', false)
            ->assertSee('data-currency="SGD"', false)
            ->assertSee('data-currency-symbol="S$"', false)
            ->assertSee('data-currency-decimals="2"', false)
            ->assertSee('data-currency-position="before"', false);
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
        $locales = ['en', 'fil', 'id', 'km', 'lo', 'ms', 'my', 'tet', 'th', 'vi'];
        $english = json_decode(file_get_contents(lang_path('en.json')), true, flags: JSON_THROW_ON_ERROR);

        foreach ($locales as $locale) {
            $translations = json_decode(file_get_contents(lang_path("{$locale}.json")), true, flags: JSON_THROW_ON_ERROR);
            $this->assertSame(array_keys($english), array_keys($translations), "JSON message keys differ for {$locale}.");
            $this->assertNotContains('', array_values($translations));

            foreach ($english as $key => $message) {
                preg_match_all('/:([A-Za-z_][A-Za-z0-9_]*)/', $message, $expectedParameters);
                preg_match_all('/:([A-Za-z_][A-Za-z0-9_]*)/', $translations[$key], $actualParameters);
                sort($expectedParameters[1]);
                sort($actualParameters[1]);
                $this->assertSame($expectedParameters[1], $actualParameters[1], "Placeholder mismatch for {$locale}: {$key}");
            }
        }
    }

    public function test_laravel_language_groups_are_complete_for_every_supported_locale(): void
    {
        $locales = ['en', 'fil', 'id', 'km', 'lo', 'ms', 'my', 'tet', 'th', 'vi'];

        foreach (['auth', 'pagination', 'passwords', 'validation', 'countries'] as $group) {
            $english = Arr::dot(require lang_path("en/{$group}.php"));

            foreach ($locales as $locale) {
                $translations = Arr::dot(require lang_path("{$locale}/{$group}.php"));
                $this->assertSame(array_keys($english), array_keys($translations), "{$group} keys differ for {$locale}.");
                $this->assertNotContains('', array_values($translations));

                foreach ($english as $key => $message) {
                    if (! is_string($message) || ! is_string($translations[$key])) {
                        continue;
                    }

                    preg_match_all('/:([A-Za-z_][A-Za-z0-9_]*)/', $message, $expectedParameters);
                    preg_match_all('/:([A-Za-z_][A-Za-z0-9_]*)/', $translations[$key], $actualParameters);
                    sort($expectedParameters[1]);
                    sort($actualParameters[1]);
                    $this->assertSame($expectedParameters[1], $actualParameters[1], "Placeholder mismatch for {$locale} {$group}.{$key}");
                }
            }
        }
    }

    public function test_dynamic_server_messages_are_localized_with_their_parameters(): void
    {
        App::setLocale('id');
        $this->assertSame(
            'Batas 3 toko pada paket Usaha sudah tercapai.',
            __('The limit of :limit stores for the :plan plan has been reached.', ['limit' => 3, 'plan' => 'Usaha']),
        );

        App::setLocale('ms');
        $this->assertSame(
            'Had 3 kedai bagi pelan Usaha telah dicapai.',
            __('The limit of :limit stores for the :plan plan has been reached.', ['limit' => 3, 'plan' => 'Usaha']),
        );
        $this->assertSame(
            'Selesaikan SO-001 sebelum memulakan kiraan stok baharu.',
            __('Complete :document before starting a new stock count.', ['document' => 'SO-001']),
        );

        App::setLocale('en');
        $this->assertSame(
            'The limit of 3 stores for the Business plan has been reached.',
            __('The limit of :limit stores for the :plan plan has been reached.', ['limit' => 3, 'plan' => 'Business']),
        );

        App::setLocale('vi');
        $this->assertSame('Đã đạt giới hạn 3 cửa hàng của gói Business.', __('The limit of :limit stores for the :plan plan has been reached.', ['limit' => 3, 'plan' => 'Business']));
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
            ->withSession(['market' => 'MY', 'locale' => 'ms'])
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
            ->withSession(['market' => 'MY', 'locale' => 'en'])
            ->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/welcome')
                ->where('market', 'MY')
                ->where('locale', 'en')
                ->has('locales', 10)
                ->where('locales', fn ($locales) => $locales->pluck('code')->all() === self::LOCALE_ORDER));

        $this->from(route('login'))
            ->post(route('locale.update'), ['locale' => 'en'])
            ->assertRedirect(route('login'))
            ->assertSessionHas('locale', 'en');
    }

    public function test_customer_portal_offers_all_supported_languages_without_changing_market(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'ID', 'locale' => 'id'])
            ->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'ID')
                ->where('locale', 'id')
                ->has('locales', 10)
                ->where('locales', fn ($locales) => $locales->pluck('code')->all() === self::LOCALE_ORDER));

        $this->actingAs($user)
            ->withSession(['market' => 'ID', 'locale' => 'id'])
            ->from(route('stores.index'))
            ->post(route('locale.update'), ['locale' => 'vi'])
            ->assertRedirect(route('stores.index'))
            ->assertSessionHas('market', 'ID')
            ->assertSessionHas('locale', 'vi');
    }

    public function test_malaysia_customer_can_select_indonesian_without_changing_market(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'MY', 'locale' => 'en'])
            ->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'MY')
                ->where('locale', 'en')
                ->has('locales', 10)
                ->where('locales', fn ($locales) => $locales->pluck('code')->all() === self::LOCALE_ORDER));

        $this->actingAs($user)
            ->withSession(['market' => 'MY', 'locale' => 'en'])
            ->from(route('stores.index'))
            ->post(route('locale.update'), ['locale' => 'id'])
            ->assertRedirect(route('stores.index'))
            ->assertSessionHas('market', 'MY')
            ->assertSessionHas('locale', 'id');
    }

    public function test_platform_admin_offers_all_supported_languages(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->withSession(['market' => 'ID', 'locale' => 'id'])
            ->get(route('super-admin.security.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'ID')
                ->where('locale', 'id')
                ->has('locales', 10)
                ->where('locales', fn ($locales) => $locales->pluck('code')->all() === self::LOCALE_ORDER));
    }

    public function test_customer_validation_messages_use_english(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'ID', 'locale' => 'en'])
            ->from(route('stores.create'))
            ->post(route('stores.store'), [])
            ->assertRedirect(route('stores.create'))
            ->assertSessionHasErrors([
                'name' => 'The name field is required.',
            ]);
    }

    public function test_malay_locale_uses_malay_validation_messages(): void
    {
        $this->withSession(['market' => 'MY', 'locale' => 'ms'])
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
