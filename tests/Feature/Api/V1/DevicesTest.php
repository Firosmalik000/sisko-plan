<?php

namespace Tests\Feature\Api\V1;

use App\Models\Device;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak `/devices` register/revoke (design §10, Req 15.1/15.6).
 *
 * Non store-scoped: registrasi push melekat pada user/perangkat. Upsert
 * idempotent per (user_id, device_id); revoke scoped ke user (404 lintas-user).
 */
class DevicesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, string>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'device_id' => (string) Str::uuid(),
            'platform' => 'android',
            'push_token' => 'fcm-token-'.Str::random(20),
            'push_provider' => 'fcm',
        ], $overrides);
    }

    public function test_register_creates_device_and_returns_resource_without_push_token(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $payload = $this->payload(['device_id' => 'dev-123']);

        $response = $this->postJson('/api/v1/devices', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.device_id', 'dev-123')
            ->assertJsonPath('data.platform', 'android')
            ->assertJsonPath('data.push_provider', 'fcm');

        // push_token tidak boleh dibocorkan kembali.
        $this->assertArrayNotHasKey('push_token', $response->json('data'));

        $this->assertDatabaseHas('devices', [
            'user_id' => $user->id,
            'device_id' => 'dev-123',
            'platform' => 'android',
        ]);
    }

    public function test_register_upserts_same_device_id_idempotently(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $first = $this->postJson('/api/v1/devices', $this->payload([
            'device_id' => 'dev-abc',
            'push_token' => 'token-one',
        ]))->assertStatus(201);

        $publicId = $first->json('data.public_id');

        $second = $this->postJson('/api/v1/devices', $this->payload([
            'device_id' => 'dev-abc',
            'platform' => 'ios',
            'push_token' => 'token-two',
            'push_provider' => 'apns',
        ]))->assertOk();

        // Baris yang sama diperbarui (public_id stabil), bukan duplikat.
        $this->assertSame($publicId, $second->json('data.public_id'));
        $this->assertSame('apns', $second->json('data.push_provider'));

        $this->assertDatabaseCount('devices', 1);
        $this->assertDatabaseHas('devices', [
            'user_id' => $user->id,
            'device_id' => 'dev-abc',
            'push_token' => 'token-two',
            'push_provider' => 'apns',
        ]);
    }

    public function test_register_validates_platform_and_provider(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/devices', $this->payload(['platform' => 'windows']))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $this->postJson('/api/v1/devices', $this->payload(['push_provider' => 'webpush']))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $missing = $this->payload();
        unset($missing['push_token']);
        $this->postJson('/api/v1/devices', $missing)
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_register_requires_authentication(): void
    {
        $this->postJson('/api/v1/devices', $this->payload())
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_revoke_deletes_own_device(): void
    {
        $user = User::factory()->create();
        $device = Device::factory()->for($user)->create();
        Sanctum::actingAs($user);

        $this->deleteJson("/api/v1/devices/{$device->public_id}")
            ->assertOk()
            ->assertJsonPath('data.revoked', true);

        $this->assertDatabaseMissing('devices', ['id' => $device->id]);
    }

    public function test_revoke_other_users_device_is_not_found(): void
    {
        $owner = User::factory()->create();
        $device = Device::factory()->for($owner)->create();

        $intruder = User::factory()->create();
        Sanctum::actingAs($intruder);

        $this->deleteJson("/api/v1/devices/{$device->public_id}")
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');

        // Device korban tetap ada.
        $this->assertDatabaseHas('devices', ['id' => $device->id]);
    }

    public function test_logout_revokes_current_device_push_registration(): void
    {
        $user = User::factory()->create();

        // Registrasi device dengan device_id yang cocok dengan token per-device.
        $token = $user->createToken('dev', ['*']);
        $token->accessToken->forceFill(['device_id' => 'dev-logout'])->save();
        Device::factory()->for($user)->create(['device_id' => 'dev-logout']);

        $this->withHeader('Authorization', 'Bearer '.$token->plainTextToken)
            ->deleteJson('/api/v1/auth/tokens/current')
            ->assertOk()
            ->assertJsonPath('data.revoked', true);

        $this->assertDatabaseMissing('devices', [
            'user_id' => $user->id,
            'device_id' => 'dev-logout',
        ]);
    }
}
