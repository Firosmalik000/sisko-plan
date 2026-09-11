<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Feature test PATCH /me/profile & PATCH /stores/{store}/settings (Req 21).
 */
class ProfileAndSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    private function attach(Store $store, User $user, MembershipRole $role): void
    {
        $store->users()->syncWithoutDetaching([
            $user->id => ['role' => $role->value, 'status' => MembershipStatus::Active->value],
        ]);
    }

    public function test_profile_update_requires_authentication(): void
    {
        $this->patchJson('/api/v1/me/profile', ['name' => 'X'])
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_profile_update_changes_name_and_email(): void
    {
        $user = User::factory()->create(['name' => 'Old', 'email' => 'old@example.com']);
        Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user, ['store.read']);

        $this->patchJson('/api/v1/me/profile', [
            'name' => 'Budi Sant오노', // Unicode campuran
            'email' => 'new@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.name', 'Budi Sant오노')
            ->assertJsonPath('data.user.email', 'new@example.com');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'email' => 'new@example.com']);
    }

    public function test_profile_update_rejects_duplicate_email_but_allows_own(): void
    {
        $other = User::factory()->create(['email' => 'taken@example.com']);
        $user = User::factory()->create(['email' => 'me@example.com']);
        Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me/profile', ['email' => 'taken@example.com'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        // Email sendiri diperbolehkan (unique-except-self).
        $this->patchJson('/api/v1/me/profile', ['email' => 'me@example.com'])->assertOk();

        $this->assertNotNull($other->fresh());
    }

    public function test_profile_update_rejects_control_characters_in_name(): void
    {
        $user = User::factory()->create();
        Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me/profile', ['name' => "Bad\x00Name"])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_store_settings_owner_can_update_identity_and_receipt(): void
    {
        $user = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user, ['store.settings']);

        $response = $this->patchJson("/api/v1/stores/{$store->public_id}/settings", [
            'name' => 'Toko Sejahtera 商店',
            'address' => "Jl. Merdeka No. 1\nBlok B",
            'phone' => '+62 812 3456 7890',
            'email' => 'toko@example.com',
            'timezone' => 'Asia/Makassar',
            'currency' => 'idr',
            'locale' => 'id',
            'receipt_header' => 'Terima kasih 🅰️',
            'receipt_footer' => 'Barang dibeli tidak dapat ditukar',
            'receipt_paper_size' => '80mm',
            'theme_color' => '#ee4d2d',
        ])->assertOk();

        $response->assertJsonPath('data.name', 'Toko Sejahtera 商店')
            ->assertJsonPath('data.settings.timezone', 'Asia/Makassar')
            ->assertJsonPath('data.settings.currency_code', 'IDR')
            ->assertJsonPath('data.settings.receipt_paper_size', '80mm')
            ->assertJsonPath('data.settings.theme_color', '#ee4d2d');

        $this->assertDatabaseHas('stores', ['id' => $store->id, 'name' => 'Toko Sejahtera 商店']);
        $this->assertDatabaseHas('store_settings', ['store_id' => $store->id, 'timezone' => 'Asia/Makassar']);
    }

    public function test_store_settings_cashier_forbidden(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $owner->id]);

        $cashier = User::factory()->create();
        $this->attach($store, $cashier, MembershipRole::Cashier);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->patchJson("/api/v1/stores/{$store->public_id}/settings", ['name' => 'Hack'])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_store_settings_rejects_invalid_theme_color_and_control_chars(): void
    {
        $user = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user, ['store.settings']);

        $this->patchJson("/api/v1/stores/{$store->public_id}/settings", ['theme_color' => 'red'])
            ->assertStatus(422);

        $this->patchJson("/api/v1/stores/{$store->public_id}/settings", ['name' => "Toko\x07Bell"])
            ->assertStatus(422);
    }

    public function test_store_settings_tenant_isolation(): void
    {
        $userA = User::factory()->create();
        Store::factory()->create(['owner_user_id' => $userA->id]);

        $userB = User::factory()->create();
        $storeB = Store::factory()->create(['owner_user_id' => $userB->id]);

        Sanctum::actingAs($userA, ['store.settings']);

        // userA bukan member storeB → ditolak middleware store.membership
        // (404 menyembunyikan keberadaan toko lintas-tenant).
        $this->patchJson("/api/v1/stores/{$storeB->public_id}/settings", ['name' => 'X'])
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
