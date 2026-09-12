<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Preferensi notifikasi per-pengguna (Req 29). Operational & security terkunci
 * ON; hanya promo yang dapat dimatikan tanpa memengaruhi dua kategori lain.
 */
class NotificationPreferencesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/v1/me/notification-preferences')->assertStatus(401);
    }

    public function test_defaults_all_enabled(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/v1/me/notification-preferences')
            ->assertOk()
            ->assertJsonPath('data.notification_preferences.operational', true)
            ->assertJsonPath('data.notification_preferences.promo', true)
            ->assertJsonPath('data.notification_preferences.security', true);
    }

    public function test_disabling_promo_keeps_operational_and_security_on(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me/notification-preferences', ['promo' => false])
            ->assertOk()
            ->assertJsonPath('data.notification_preferences.promo', false)
            ->assertJsonPath('data.notification_preferences.operational', true)
            ->assertJsonPath('data.notification_preferences.security', true);

        // Persisted & re-read.
        $this->getJson('/api/v1/me/notification-preferences')
            ->assertJsonPath('data.notification_preferences.promo', false)
            ->assertJsonPath('data.notification_preferences.security', true);
    }
}
