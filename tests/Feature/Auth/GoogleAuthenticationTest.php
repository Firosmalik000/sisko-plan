<?php

namespace Tests\Feature\Auth;

use App\Actions\Businesses\ProvisionBusinessOwner;
use App\Enums\BusinessRole;
use App\Enums\BusinessStatus;
use App\Enums\MembershipStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Subscription;
use App\Models\User;
use App\Support\Referrals\ReferralIntent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    public function test_registration_page_exposes_google_login_when_configured(): void
    {
        $this->get(route('register'))->assertInertia(fn (Assert $page) => $page
            ->component('auth/register')
            ->where('googleAuthEnabled', true));
    }

    public function test_guest_can_be_redirected_to_google(): void
    {
        Socialite::fake('google');

        $this->get(route('auth.google.redirect'))
            ->assertRedirect('https://socialite.fake/google/authorize');
    }

    public function test_google_option_remains_visible_when_credentials_are_not_configured(): void
    {
        config([
            'services.google.client_id' => null,
            'services.google.client_secret' => null,
        ]);

        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->where('googleAuthEnabled', true));

        $this->get(route('auth.google.redirect'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Google sign-in has not been configured.');

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Google sign-in has not been configured.');
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
        $this->assertFalse(Hash::needsRehash($user->password));
        $this->assertProvisionedOwner($user);

        $this->get(route('dashboard'))
            ->assertRedirect(route('stores.create'));
        $this->get(route('stores.create'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('customer/stores/create'));
    }

    public function test_existing_google_linked_user_logs_in_without_creating_a_duplicate(): void
    {
        $existing = User::factory()->create([
            'email' => 'owner@example.com',
            'google_id' => 'google-user-1',
        ]);
        app(ProvisionBusinessOwner::class)->handle($existing);
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

        $this->assertSame(1, User::query()->where('email', 'owner@example.com')->count());
        $this->assertAuthenticatedAs($existing);
    }

    public function test_new_google_user_receives_pending_referral_and_own_code(): void
    {
        $referrer = User::factory()->create();
        $this->get(route('referral.capture', ['code' => $referrer->referralCode->code]));
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('dashboard'))
            ->assertSessionMissing(ReferralIntent::SESSION_KEY);

        $user = User::query()->where('email', 'owner@example.com')->sole();
        $this->assertDatabaseHas('referral_attributions', [
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $user->id,
            'referral_code_id' => $referrer->referralCode->id,
        ]);
        $this->assertNotNull($user->referralCode()->first());
    }

    public function test_referral_intent_survives_google_redirect(): void
    {
        $referrer = User::factory()->create();
        Socialite::fake('google');
        $this->get(route('referral.capture', ['code' => $referrer->referralCode->code]));

        $this->get(route('auth.google.redirect'))
            ->assertRedirect('https://socialite.fake/google/authorize')
            ->assertSessionHas(ReferralIntent::SESSION_KEY, fn (array $intent): bool => $intent['code'] === $referrer->referralCode->code);
    }

    public function test_google_login_links_existing_account_by_verified_email(): void
    {
        $existing = User::factory()->unverified()->create(['email' => 'owner@example.com']);
        $password = $existing->password;
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

        $this->assertSame(1, User::query()->where('email', 'owner@example.com')->count());
        $this->assertSame('google-user-1', $existing->refresh()->google_id);
        $this->assertNotNull($existing->email_verified_at);
        $this->assertSame($password, $existing->password);
        $this->assertProvisionedOwner($existing);
        $this->assertAuthenticatedAs($existing);
    }

    public function test_repeated_google_callback_does_not_duplicate_account_or_provisioning(): void
    {
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));
        auth()->logout();
        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

        $this->assertSame(1, User::query()->where('email', 'owner@example.com')->count());
        $this->assertSame(1, Business::query()->count());
        $this->assertSame(1, BusinessMembership::query()->count());
        $this->assertSame(1, Subscription::query()->count());
    }

    public function test_provisioning_failure_rolls_back_new_google_user(): void
    {
        $businesses = new class extends ProvisionBusinessOwner
        {
            public function __construct() {}

            public function handle(User $user): BusinessMembership
            {
                Business::create([
                    'name' => $user->name,
                    'status' => BusinessStatus::Active,
                ]);

                throw new RuntimeException('provisioning failed');
            }
        };
        $this->app->instance(ProvisionBusinessOwner::class, $businesses);
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Google sign-in could not be completed. Please try again.');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'owner@example.com']);
        $this->assertDatabaseCount('businesses', 0);
        $this->assertDatabaseCount('referral_codes', 0);
    }

    public function test_missing_optional_google_profile_data_does_not_block_signup(): void
    {
        Socialite::fake('google', $this->googleUser([
            'name' => null,
            'nickname' => null,
            'avatar' => null,
        ]));

        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

        $user = User::query()->where('email', 'owner@example.com')->sole();
        $this->assertSame('owner', $user->name);
        $this->assertAuthenticatedAs($user);
        $this->assertProvisionedOwner($user);
    }

    public function test_existing_google_linked_account_is_not_retroactively_attributed(): void
    {
        $referrer = User::factory()->create();
        $existing = User::factory()->create(['email' => 'owner@example.com', 'google_id' => 'google-user-1']);
        $this->get(route('referral.capture', ['code' => $referrer->referralCode->code]));
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

        $this->assertDatabaseMissing('referral_attributions', ['referred_user_id' => $existing->id]);
    }

    public function test_existing_local_account_linked_to_google_is_not_retroactively_attributed(): void
    {
        $referrer = User::factory()->create();
        $existing = User::factory()->create(['email' => 'owner@example.com', 'google_id' => null]);
        $this->get(route('referral.capture', ['code' => $referrer->referralCode->code]));
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))->assertRedirect(route('dashboard'));

        $this->assertSame('google-user-1', $existing->refresh()->google_id);
        $this->assertDatabaseMissing('referral_attributions', ['referred_user_id' => $existing->id]);
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
            ->assertSessionHas('oauth_error', 'Google did not provide a verified email address.');

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'owner@example.com']);
    }

    public function test_provider_failure_returns_a_generic_error(): void
    {
        Socialite::fake('google', fn () => throw new RuntimeException('provider credential detail'));

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Google sign-in could not be completed. Please try again.');

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
            ->assertSessionHas('oauth_error', 'Your account is currently deactivated.');

        $this->assertGuest();
        $this->assertNull($user->refresh()->google_id);
    }

    public function test_platform_admin_is_not_linked_or_authenticated_through_google(): void
    {
        $admin = User::factory()->superAdmin()->create(['email' => 'owner@example.com']);
        Socialite::fake('google', $this->googleUser());

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('login'))
            ->assertSessionHas('oauth_error', 'Platform administrators must sign in using the primary method.');

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

    private function assertProvisionedOwner(User $user): void
    {
        $membership = $user->businessMemberships()->with('business.subscription.plan')->sole();

        $this->assertSame(BusinessRole::Owner, $membership->business_role);
        $this->assertSame(MembershipStatus::Active, $membership->status);
        $this->assertSame(BusinessStatus::Active, $membership->business->status);
        $this->assertSame(SubscriptionStatus::Active, $membership->business->subscription->status);
        $this->assertTrue($membership->business->subscription->plan->is_default);
    }
}
