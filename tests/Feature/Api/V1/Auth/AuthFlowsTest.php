<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature test alur Auth Api/V1 tambahan: register, forgot/reset, verify,
 * confirm-password. Property pesan-aman (Req 2.3, 5.2): respons forgot untuk
 * email terdaftar vs tidak tidak dapat dibedakan.
 */
class AuthFlowsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    public function test_register_creates_user_and_issues_device_token(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi Santoso',
            'email' => 'budi@example.com',
            'password' => 'Rahasia#2026',
            'password_confirmation' => 'Rahasia#2026',
            'device_id' => 'device-abc',
        ])->assertStatus(201);

        $response->assertJsonPath('data.user.email', 'budi@example.com')
            ->assertJsonPath('data.device_id', 'device-abc');
        $this->assertIsString($response->json('data.token'));
        $this->assertDatabaseHas('users', ['email' => 'budi@example.com']);
    }

    public function test_register_rejects_mismatched_password_confirmation(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi',
            'email' => 'budi2@example.com',
            'password' => 'Rahasia#2026',
            'password_confirmation' => 'Beda#2026',
            'device_id' => 'device-abc',
        ])->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'dup@example.com']);

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Budi',
            'email' => 'dup@example.com',
            'password' => 'Rahasia#2026',
            'password_confirmation' => 'Rahasia#2026',
            'device_id' => 'device-abc',
        ])->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    /**
     * Property: pesan forgot-password tidak membocorkan keberadaan email
     * (Req 5.2). Respons untuk email terdaftar & tidak terdaftar identik.
     */
    public function test_forgot_password_response_does_not_reveal_email_existence(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'known@example.com']);

        $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.com']);
        $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'nobody@example.com']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json('data'), $unknown->json('data'));
    }

    public function test_reset_password_with_valid_token_updates_password(): void
    {
        $user = User::factory()->create(['email' => 'reset@example.com']);
        $token = Password::createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => 'reset@example.com',
            'password' => 'BaruBanget#2026',
            'password_confirmation' => 'BaruBanget#2026',
        ])->assertOk();
    }

    public function test_reset_password_with_invalid_token_is_rejected(): void
    {
        User::factory()->create(['email' => 'reset2@example.com']);

        $this->postJson('/api/v1/auth/reset-password', [
            'token' => 'invalid-token',
            'email' => 'reset2@example.com',
            'password' => 'BaruBanget#2026',
            'password_confirmation' => 'BaruBanget#2026',
        ])->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_RESET_TOKEN');
    }

    public function test_resend_verification_requires_auth(): void
    {
        $this->postJson('/api/v1/auth/email/verification-notification')
            ->assertStatus(401);
    }

    public function test_resend_verification_sends_for_unverified_user(): void
    {
        Notification::fake();
        $user = User::factory()->unverified()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/email/verification-notification')
            ->assertOk()
            ->assertJsonPath('data.sent', true);
    }

    public function test_confirm_password_validates_current_password(): void
    {
        $user = User::factory()->create(['password' => 'Sekarang#2026']);
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/auth/confirm-password', ['password' => 'salah'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'INVALID_PASSWORD');

        $this->postJson('/api/v1/auth/confirm-password', ['password' => 'Sekarang#2026'])
            ->assertOk()
            ->assertJsonPath('data.confirmed', true);
    }
}
