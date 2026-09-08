<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\App;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_server_translation_has_the_required_market_outputs(): void
    {
        $indonesian = json_decode(file_get_contents(lang_path('id.json')), true, flags: JSON_THROW_ON_ERROR);
        $malay = json_decode(file_get_contents(lang_path('ms.json')), true, flags: JSON_THROW_ON_ERROR);
        $english = json_decode(file_get_contents(lang_path('en.json')), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame([], array_values(array_diff(array_keys($indonesian), array_keys($malay))));
        $this->assertSame([], array_values(array_diff(array_keys($malay), array_keys($indonesian), array_keys($english))));
        $this->assertSame([], array_values(array_diff(array_keys($english), array_keys($malay))));

        foreach ([$indonesian, $malay, $english] as $translations) {
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
    }

    public function test_public_pricing_reasons_follow_the_selected_market_language(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->withSession(['market' => 'ms', 'locale' => 'ms'])
            ->get(route('pricing'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/pricing')
                ->where('plans.0.disabled_reason', 'Akaun pentadbir platform tidak menggunakan pelan kedai.'));
    }

    public function test_guest_can_select_the_malaysia_market(): void
    {
        $this->from(route('login'))
            ->post(route('locale.update'), ['locale' => 'ms'])
            ->assertRedirect(route('login'))
            ->assertSessionHas('market', 'ms')
            ->assertSessionHas('locale', 'ms');
    }

    public function test_public_pages_only_offer_indonesia_and_malaysia(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'ms', 'locale' => 'en'])
            ->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('public/welcome')
                ->where('market', 'ms')
                ->where('locale', 'ms')
                ->where('locales.0.code', 'id')
                ->where('locales.1.code', 'ms'));

        $this->from(route('login'))
            ->post(route('locale.update'), ['locale' => 'en'])
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('locale');
    }

    public function test_indonesia_customer_can_switch_between_indonesian_and_english_without_changing_market(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'id', 'locale' => 'id'])
            ->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'id')
                ->where('locale', 'id')
                ->where('locales.0.code', 'id')
                ->where('locales.1.code', 'en'));

        $this->actingAs($user)
            ->withSession(['market' => 'id', 'locale' => 'id'])
            ->from(route('stores.index'))
            ->post(route('locale.update'), ['locale' => 'en', 'context' => 'customer'])
            ->assertRedirect(route('stores.index'))
            ->assertSessionHas('market', 'id')
            ->assertSessionHas('locale', 'en');
    }

    public function test_malaysia_customer_can_switch_between_malay_and_english_without_changing_market(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->withSession(['market' => 'ms', 'locale' => 'en'])
            ->get(route('stores.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'ms')
                ->where('locale', 'en')
                ->where('locales.0.code', 'ms')
                ->where('locales.1.code', 'en'));

        $this->actingAs($user)
            ->withSession(['market' => 'ms', 'locale' => 'en'])
            ->from(route('stores.index'))
            ->post(route('locale.update'), ['locale' => 'id', 'context' => 'customer'])
            ->assertRedirect(route('stores.index'))
            ->assertSessionHasErrors('locale')
            ->assertSessionHas('market', 'ms')
            ->assertSessionHas('locale', 'en');
    }

    public function test_platform_admin_uses_the_public_market_switcher(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->withSession(['market' => 'id', 'locale' => 'id'])
            ->get(route('super-admin.security.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('market', 'id')
                ->where('locale', 'id')
                ->where('locales.0.code', 'id')
                ->where('locales.1.code', 'ms'));
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
