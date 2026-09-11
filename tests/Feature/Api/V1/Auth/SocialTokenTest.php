<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserStatus;
use App\Exceptions\Auth\SocialTokenException;
use App\Models\User;
use App\Models\UserSocialIdentity;
use App\Services\Auth\SocialCredential;
use App\Services\Auth\SocialTokenVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SocialTokenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    private function fakeGoogle(SocialCredential|callable $result): void
    {
        $this->fakeVerifier($result);
    }

    private function fakeApple(SocialCredential|callable $result): void
    {
        $this->fakeVerifier($result);
    }

    private function fakeVerifier(SocialCredential|callable $result): void
    {
        $this->app->instance(SocialTokenVerifier::class, new class($result) implements SocialTokenVerifier
        {
            /** @param SocialCredential|callable $result */
            public function __construct(private mixed $result) {}

            public function verify(string $provider, string $token): SocialCredential
            {
                if (is_callable($this->result)) {
                    return ($this->result)($token);
                }

                return $this->result;
            }
        });
    }

    private function cred(string $provider, string $sub, ?string $email, bool $verified = true, ?string $name = 'Budi'): SocialCredential
    {
        return new SocialCredential($provider, $sub, $email, $verified, $name);
    }

    public function test_google_login_creates_user_identity_and_token(): void
    {
        $this->fakeGoogle($this->cred('google', 'google-sub-1', 'owner@example.com'));

        $response = $this->postJson('/api/v1/auth/social/google', [
            'identity_token' => 'ignored-fake',
            'device_id' => 'dev-1',
        ])->assertOk();

        $response->assertJsonPath('data.device_id', 'dev-1')
            ->assertJsonPath('data.user.email', 'owner@example.com')
            ->assertJsonPath('data.offline_lease.ttl_seconds', 259200);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertDatabaseHas('user_social_identities', [
            'provider' => 'google',
            'provider_subject' => 'google-sub-1',
        ]);
        $this->assertSame(1, User::query()->where('email', 'owner@example.com')->count());
    }

    public function test_second_google_login_same_subject_reuses_user(): void
    {
        $this->fakeGoogle($this->cred('google', 'google-sub-2', 'reuse@example.com'));

        $this->postJson('/api/v1/auth/social/google', ['identity_token' => 't', 'device_id' => 'd1'])->assertOk();
        $this->postJson('/api/v1/auth/social/google', ['identity_token' => 't', 'device_id' => 'd2'])->assertOk();

        $this->assertSame(1, User::query()->where('email', 'reuse@example.com')->count());
        $this->assertSame(1, UserSocialIdentity::query()->where('provider_subject', 'google-sub-2')->count());
    }

    public function test_google_login_links_to_existing_verified_email_account(): void
    {
        $existing = User::factory()->create([
            'email' => 'linkme@example.com',
            'password' => Hash::make('pass'),
        ]);

        $this->fakeGoogle($this->cred('google', 'google-sub-3', 'linkme@example.com'));

        $this->postJson('/api/v1/auth/social/google', ['identity_token' => 't', 'device_id' => 'd'])->assertOk();

        $this->assertSame(1, User::query()->where('email', 'linkme@example.com')->count());
        $this->assertDatabaseHas('user_social_identities', [
            'user_id' => $existing->id,
            'provider' => 'google',
            'provider_subject' => 'google-sub-3',
        ]);
    }

    public function test_unverified_provider_email_is_rejected_and_does_not_link(): void
    {
        User::factory()->create(['email' => 'victim@example.com']);
        $this->fakeGoogle($this->cred('google', 'attacker-sub', 'victim@example.com', verified: false));

        $this->postJson('/api/v1/auth/social/google', ['identity_token' => 't', 'device_id' => 'd'])
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED')
            ->assertJsonPath('error.retryable', false);

        $this->assertDatabaseMissing('user_social_identities', ['provider_subject' => 'attacker-sub']);
    }

    public function test_apple_login_creates_user_and_identity(): void
    {
        $this->fakeApple($this->cred('apple', 'apple-sub-1', 'apple@example.com', name: null));

        $this->postJson('/api/v1/auth/social/apple', ['identity_token' => 't', 'device_id' => 'd'])->assertOk();

        $this->assertDatabaseHas('user_social_identities', [
            'provider' => 'apple',
            'provider_subject' => 'apple-sub-1',
        ]);
    }

    public function test_invalid_token_returns_non_retryable_error(): void
    {
        $this->fakeGoogle(fn () => throw new SocialTokenException('bad token'));

        $this->postJson('/api/v1/auth/social/google', ['identity_token' => 'bad', 'device_id' => 'd'])
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED')
            ->assertJsonPath('error.retryable', false);
    }

    public function test_suspended_user_is_rejected(): void
    {
        $user = User::factory()->create(['email' => 'susp@example.com', 'status' => UserStatus::Suspended]);
        UserSocialIdentity::query()->create([
            'user_id' => $user->id,
            'provider' => 'google',
            'provider_subject' => 'susp-sub',
            'email' => 'susp@example.com',
        ]);
        $this->fakeGoogle($this->cred('google', 'susp-sub', 'susp@example.com'));

        $this->postJson('/api/v1/auth/social/google', ['identity_token' => 't', 'device_id' => 'd'])
            ->assertStatus(422);
    }
}
