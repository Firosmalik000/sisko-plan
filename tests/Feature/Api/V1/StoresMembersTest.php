<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Manajemen toko & anggota Api/V1 (Req 21, 22): create (reuse CreateStore),
 * update, nonaktif/pulihkan (status), anggota add/updateRole/deactivate, penegakan
 * role server-side (cashier FORBIDDEN, owner OWNERSHIP_LOCKED), jaga histori.
 */
class StoresMembersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    private function ownerOf(Store $store): User
    {
        return User::find($store->owner_user_id);
    }

    private function cashierOf(Store $store): User
    {
        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value],
        ]);

        return $cashier;
    }

    public function test_owner_creates_store_via_reused_action(): void
    {
        $owner = User::factory()->create();
        Sanctum::actingAs($owner, ['store.read', 'store.settings']);

        $response = $this->postJson('/api/v1/stores', [
            'name' => 'Toko Baru',
            'country_code' => 'ID',
            'address' => 'Jl. Merdeka 1',
        ])->assertStatus(201)
            ->assertJsonPath('data.name', 'Toko Baru')
            ->assertJsonPath('data.status', 'active');

        // Owner otomatis jadi anggota owner aktif (dari CreateStore).
        $publicId = $response->json('data.public_id');
        $store = Store::where('public_id', $publicId)->firstOrFail();
        $this->assertSame($owner->id, $store->owner_user_id);
    }

    public function test_owner_updates_store_identity(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'store.settings']);

        $this->patchJson("/api/v1/stores/{$store->public_id}", [
            'name' => 'Nama Diperbarui',
            'address' => 'Alamat Baru',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Nama Diperbarui')
            ->assertJsonPath('data.settings.address', 'Alamat Baru');
    }

    public function test_owner_deactivates_and_restores_store(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'store.settings']);

        $this->deleteJson("/api/v1/stores/{$store->public_id}")
            ->assertOk()->assertJsonPath('data.status', StoreStatus::Archived->value);

        $this->postJson("/api/v1/stores/{$store->public_id}/restore")
            ->assertOk()->assertJsonPath('data.status', StoreStatus::Active->value);
    }

    public function test_deactivate_twice_conflicts(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'store.settings']);

        $this->deleteJson("/api/v1/stores/{$store->public_id}")->assertOk();
        $this->deleteJson("/api/v1/stores/{$store->public_id}")
            ->assertStatus(409)->assertJsonPath('error.code', 'CONFLICT');
    }

    public function test_owner_adds_member_and_updates_role_and_deactivates(): void
    {
        $store = Store::factory()->create();
        $newUser = User::factory()->create(['email' => 'staff@example.com']);
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'store.settings']);

        $added = $this->postJson("/api/v1/stores/{$store->public_id}/members", [
            'email' => 'staff@example.com',
            'role' => MembershipRole::Cashier->value,
        ])->assertStatus(201)->assertJsonPath('data.role', 'cashier');

        $memberPublicId = $added->json('data.public_id');
        $this->assertSame($newUser->public_id, $memberPublicId);

        $this->patchJson("/api/v1/stores/{$store->public_id}/members/{$memberPublicId}", [
            'role' => MembershipRole::Admin->value,
        ])->assertOk()->assertJsonPath('data.role', 'admin');

        // Nonaktif menjaga histori (baris tetap ada, status Suspended).
        $this->deleteJson("/api/v1/stores/{$store->public_id}/members/{$memberPublicId}")
            ->assertOk()->assertJsonPath('data.status', MembershipStatus::Suspended->value);
        $this->assertDatabaseHas('store_memberships', [
            'store_id' => $store->id,
            'user_id' => $newUser->id,
            'status' => MembershipStatus::Suspended->value,
        ]);
    }

    public function test_cannot_change_owner_role(): void
    {
        $store = Store::factory()->create();
        $owner = $this->ownerOf($store);
        Sanctum::actingAs($owner, ['store.read', 'store.settings']);

        $this->patchJson("/api/v1/stores/{$store->public_id}/members/{$owner->public_id}", [
            'role' => MembershipRole::Admin->value,
        ])->assertStatus(409)->assertJsonPath('error.code', 'OWNERSHIP_LOCKED');

        $this->deleteJson("/api/v1/stores/{$store->public_id}/members/{$owner->public_id}")
            ->assertStatus(409)->assertJsonPath('error.code', 'OWNERSHIP_LOCKED');
    }

    public function test_promoting_member_to_owner_is_rejected_by_validation(): void
    {
        $store = Store::factory()->create();
        $member = $this->cashierOf($store);
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'store.settings']);

        $this->patchJson("/api/v1/stores/{$store->public_id}/members/{$member->public_id}", [
            'role' => 'owner',
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_cashier_cannot_manage_members(): void
    {
        $store = Store::factory()->create();
        $cashier = $this->cashierOf($store);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->getJson("/api/v1/stores/{$store->public_id}/members")
            ->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');

        $this->postJson("/api/v1/stores/{$store->public_id}/members", [
            'email' => 'x@example.com', 'role' => 'cashier',
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }
}
