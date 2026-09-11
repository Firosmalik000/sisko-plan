<?php

namespace Tests\Feature\Api\V1;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Rate limit named limiter API mobile (Req 23.4, design §16): melebihi ambang →
 * 429 envelope RATE_LIMITED (retryable=true), di-key per user/device/store.
 */
class ApiRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
        RateLimiter::clear('');
    }

    public function test_auth_endpoint_returns_rate_limited_envelope_when_exceeded(): void
    {
        config(['security.api_rate_limits.auth_per_minute' => 2]);

        $payload = ['email' => 'nobody@example.com', 'password' => 'wrong', 'device_id' => 'dev-1'];

        // Dua percobaan pertama diproses (gagal auth, bukan 429).
        $this->postJson('/api/v1/auth/tokens', $payload);
        $this->postJson('/api/v1/auth/tokens', $payload);

        // Percobaan ketiga melewati limiter.
        $this->postJson('/api/v1/auth/tokens', $payload)
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'RATE_LIMITED')
            ->assertJsonPath('error.retryable', true);
    }

    public function test_read_endpoint_is_throttled_per_user(): void
    {
        config(['security.api_rate_limits.read_per_minute' => 3]);

        $user = User::factory()->create();
        Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user, ['store.read']);

        for ($i = 0; $i < 3; $i++) {
            $this->getJson('/api/v1/me')->assertOk();
        }

        $this->getJson('/api/v1/me')
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'RATE_LIMITED')
            ->assertJsonPath('error.retryable', true);
    }

    public function test_limiter_isolates_different_devices(): void
    {
        config(['security.api_rate_limits.auth_per_minute' => 1]);

        $base = ['email' => 'nobody@example.com', 'password' => 'wrong'];

        // Device A memakai jatahnya lalu diblok.
        $this->postJson('/api/v1/auth/tokens', $base + ['device_id' => 'A']);
        $this->postJson('/api/v1/auth/tokens', $base + ['device_id' => 'A'])->assertStatus(429);

        // Device B (identitas berbeda) tidak ikut terblok.
        $this->postJson('/api/v1/auth/tokens', $base + ['device_id' => 'B'])
            ->assertStatus(422); // gagal validasi/auth, bukan 429
    }
}
