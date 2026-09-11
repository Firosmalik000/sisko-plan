<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\UserStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class TokenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.debug' => false]);
    }

    private function attachMembership(Store $store, User $user, MembershipRole $role): void
    {
        $store->users()->syncWithoutDetaching([
            $user->id => [
                'role' => $role->value,
                'status' => MembershipStatus::Active->value,
            ],
        ]);
    }

    public function test_login_success_returns_token_device_id_abilities_and_offline_lease(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret-pass')]);
        // Store factory attaches its owner_user_id as active owner.
        Store::factory()->create(['owner_user_id' => $user->id]);

        $response = $this->postJson('/api/v1/auth/tokens', [
            'email' => $user->email,
            'password' => 'secret-pass',
            'device_id' => 'dev-uuid-123',
            'device_name' => 'Pixel 8',
        ])->assertOk();

        $response->assertJsonPath('data.device_id', 'dev-uuid-123')
            ->assertJsonPath('data.user.public_id', $user->public_id)
            ->assertJsonPath('data.user.email', $user->email)
            ->assertJsonPath('data.offline_lease.ttl_seconds', 259200);

        $this->assertIsString($response->json('data.token'));
        $this->assertNotEmpty($response->json('data.token'));

        // Owner abilities per matrix §3.4.
        $abilities = $response->json('data.abilities');
        sort($abilities);
        $expected = ['sale.create', 'sale.reconcile', 'scan.use', 'store.read', 'store.settings', 'product.write'];
        sort($expected);
        $this->assertSame($expected, $abilities);

        $grantedAt = $response->json('data.offline_lease.granted_at');
        $expiresAt = $response->json('data.offline_lease.expires_at');
        $this->assertTrue(strtotime($expiresAt) > strtotime($grantedAt));

        // device_id disimpan pada token.
        $this->assertDatabaseHas('personal_access_tokens', [
            'tokenable_id' => $user->id,
            'device_id' => 'dev-uuid-123',
        ]);
    }

    public function test_cashier_receives_limited_abilities(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $owner->id]);

        $cashier = User::factory()->create(['password' => Hash::make('secret-pass')]);
        $this->attachMembership($store, $cashier, MembershipRole::Cashier);

        $abilities = $this->postJson('/api/v1/auth/tokens', [
            'email' => $cashier->email,
            'password' => 'secret-pass',
            'device_id' => 'dev-cashier',
        ])->assertOk()->json('data.abilities');

        sort($abilities);
        $this->assertSame(['sale.create', 'scan.use', 'store.read'], $abilities);
    }

    public function test_login_with_wrong_password_is_rejected_with_generic_non_retryable_error(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret-pass')]);

        $response = $this->postJson('/api/v1/auth/tokens', [
            'email' => $user->email,
            'password' => 'wrong-password',
            'device_id' => 'dev-uuid-123',
        ])->assertStatus(422);

        $response->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonPath('error.retryable', false);

        // Pesan generik, tidak membocorkan keberadaan email.
        $message = $response->json('error.fields.email.0');
        $this->assertStringNotContainsStringIgnoringCase('password', $message);
        $this->assertStringNotContainsStringIgnoringCase('terdaftar', $message);
    }

    public function test_login_with_unknown_email_returns_same_generic_error(): void
    {
        $response = $this->postJson('/api/v1/auth/tokens', [
            'email' => 'nobody@example.com',
            'password' => 'secret-pass',
            'device_id' => 'dev-uuid-123',
        ])->assertStatus(422);

        $response->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonPath('error.fields.email.0', __('auth.failed'));
    }

    public function test_suspended_user_cannot_login(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('secret-pass'),
            'status' => UserStatus::Suspended,
        ]);

        $this->postJson('/api/v1/auth/tokens', [
            'email' => $user->email,
            'password' => 'secret-pass',
            'device_id' => 'dev-uuid-123',
        ])->assertStatus(422)
            ->assertJsonPath('error.fields.email.0', __('auth.failed'));
    }

    public function test_platform_admin_cannot_login_via_merchant_app(): void
    {
        $admin = User::factory()->superAdmin()->create([
            'password' => Hash::make('secret-pass'),
        ]);

        $this->postJson('/api/v1/auth/tokens', [
            'email' => $admin->email,
            'password' => 'secret-pass',
            'device_id' => 'dev-uuid-123',
        ])->assertStatus(422)
            ->assertJsonPath('error.fields.email.0', __('auth.failed'));
    }

    public function test_missing_required_fields_are_validated(): void
    {
        $this->postJson('/api/v1/auth/tokens', [
            'email' => 'not-an-email',
        ])->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret-pass')]);
        Store::factory()->create(['owner_user_id' => $user->id]);

        $token = $this->postJson('/api/v1/auth/tokens', [
            'email' => $user->email,
            'password' => 'secret-pass',
            'device_id' => 'dev-uuid-123',
        ])->assertOk()->json('data.token');

        $this->assertSame(1, PersonalAccessToken::query()->where('tokenable_id', $user->id)->count());

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/auth/tokens/current')
            ->assertOk()
            ->assertJsonPath('data.revoked', true);

        $this->assertSame(0, PersonalAccessToken::query()->where('tokenable_id', $user->id)->count());
    }

    public function test_request_with_revoked_token_is_rejected_as_unauthenticated(): void
    {
        $user = User::factory()->create(['password' => Hash::make('secret-pass')]);
        Store::factory()->create(['owner_user_id' => $user->id]);

        $token = $this->postJson('/api/v1/auth/tokens', [
            'email' => $user->email,
            'password' => 'secret-pass',
            'device_id' => 'dev-uuid-123',
        ])->assertOk()->json('data.token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/auth/tokens/current')
            ->assertOk();

        // Reset auth state antar-request agar guard tidak me-reuse user yang sudah
        // terautentikasi di request sebelumnya (bukti murni: token sudah dicabut di DB).
        $this->app['auth']->forgetGuards();
        $this->flushSession();

        // Token yang sudah dicabut ditolak dengan error non-retryable.
        $this->withHeader('Authorization', 'Bearer '.$token)
            ->deleteJson('/api/v1/auth/tokens/current')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED')
            ->assertJsonPath('error.retryable', false);
    }

    public function test_logout_without_token_is_unauthenticated(): void
    {
        $this->deleteJson('/api/v1/auth/tokens/current')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }
}
