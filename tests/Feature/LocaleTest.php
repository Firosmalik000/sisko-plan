<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    public function test_every_indonesian_server_translation_has_a_malay_translation(): void
    {
        $indonesian = json_decode(file_get_contents(lang_path('id.json')), true, flags: JSON_THROW_ON_ERROR);
        $malay = json_decode(file_get_contents(lang_path('ms.json')), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame([], array_values(array_diff(array_keys($indonesian), array_keys($malay))));
    }

    public function test_guest_can_change_the_application_locale(): void
    {
        $this->from(route('login'))
            ->post(route('locale.update'), ['locale' => 'ms'])
            ->assertRedirect(route('login'))
            ->assertSessionHas('locale', 'ms');
    }

    public function test_locale_is_shared_with_inertia_pages(): void
    {
        $this->withSession(['locale' => 'ms'])
            ->get(route('login'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/login')
                ->where('locale', 'ms')
                ->where('locales.0.code', 'id')
                ->where('locales.1.code', 'ms'));
    }

    public function test_malay_locale_uses_malay_validation_messages(): void
    {
        $this->withSession(['locale' => 'ms'])
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
