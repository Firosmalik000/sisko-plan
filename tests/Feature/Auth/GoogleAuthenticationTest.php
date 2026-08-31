<?php

namespace Tests\Feature\Auth;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use RuntimeException;
use Tests\TestCase;

class GoogleAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.google', [
            'enabled' => true,
            'client_id' => 'google-client-id',
            'client_secret' => 'google-client-secret',
            'redirect' => 'http://localhost/auth/google/callback',
        ]);
    }

    public function test_login_page_exposes_google_login_when_configured(): void
    {
        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->where('googleAuthEnabled', true));
    }

    public function test_guest_can_be_redirected_to_google(): void
    {
        Socialite::fake('google');

        $this->get(route('auth.google.redirect'))
            ->assertRedirect('https://socialite.fake/google/authorize');
    }

    public function test_google_routes_are_hidden_when_provider_is_not_configured(): void
    {
        config(['services.google.enabled' => false]);

        $this->get(route('auth.google.redirect'))->assertNotFound();
        $this->get(route('auth.google.callback'))->assertNotFound();
    }

    public function test_verified_google_user_can_create_and_login_to_tenant_account(): void
    {
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

        $user = User::query()->where('email', 'owner@example.com')->sole();
        $this->assertAuthenticatedAs($user);
        $this->assertSame('google-user-1', $user->google_id);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($user->last_login_at);
        $this->assertNull($user->platform_role);
    }

    public function test_google_login_links_existing_account_by_verified_email(): void
    {
        $existing = User::factory()->unverified()->create(['email' => 'owner@example.com']);
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

        $this->assertSame(1, User::query()->where('email', 'owner@example.com')->count());
        $this->assertSame('google-user-1', $existing->refresh()->google_id);
        $this->assertNotNull($existing->email_verified_at);
        $this->assertAuthenticatedAs($existing);
    }

    public function test_google_login_preserves_two_factor_challenge(): void
    {
        $user = User::factory()->withTwoFactor()->create(['email' => 'owner@example.com']);
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('two-factor.login'))
            ->assertSessionHas('login.id', $user->id)
            ->assertSessionHas('login.remember', true);

        $this->assertGuest();
        $this->assertNull($user->refresh()->last_login_at);
    }

    public function test_unverified_google_email_is_rejected(): void
    {
        Socialite::fake('google', $this->googleUser(['email_verified' => false]));

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Google tidak memberikan email terverifikasi.');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'owner@example.com']);
    }

    public function test_provider_failure_returns_a_generic_error(): void
    {
        Socialite::fake('google', fn () => throw new RuntimeException('provider credential detail'));

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Login Google tidak dapat diselesaikan. Silakan coba lagi.');

        $this->assertGuest();
    }

    public function test_suspended_account_is_not_linked_or_authenticated(): void
    {
        $user = User::factory()->create([
            'email' => 'owner@example.com',
            'status' => UserStatus::Suspended,
        ]);
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Akun Anda sedang dinonaktifkan.');

        $this->assertGuest();
        $this->assertNull($user->refresh()->google_id);
    }

    public function test_platform_admin_is_not_linked_or_authenticated_through_google(): void
    {
        $admin = User::factory()->superAdmin()->create(['email' => 'owner@example.com']);
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Admin platform harus masuk menggunakan metode utama.');

        $this->assertGuest();
        $this->assertNull($admin->refresh()->google_id);
    }

    /** @param array<string, mixed> $attributes */
    private function googleUser(array $attributes = []): GoogleUser
    {
        return GoogleUser::fake([
            'id' => 'google-user-1',
            'name' => 'Owner Google',
            'email' => 'owner@example.com',
            'email_verified' => true,
            ...$attributes,
        ]);
    }
}
