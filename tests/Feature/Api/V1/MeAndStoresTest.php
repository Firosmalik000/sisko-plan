<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MeAndStoresTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    private function attach(Store $store, User $user, MembershipRole $role, MembershipStatus $status = MembershipStatus::Active): void
    {
        $store->users()->syncWithoutDetaching([
            $user->id => ['role' => $role->value, 'status' => $status->value],
        ]);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/me')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_me_returns_identity_and_capabilities(): void
    {
        $user = User::factory()->create();
        Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/me')->assertOk();

        $response->assertJsonPath('data.user.public_id', $user->public_id)
            ->assertJsonPath('data.user.email', $user->email);

        $caps = $response->json('data.capabilities');
        $this->assertContains('sale.create', $caps);
        $this->assertContains('store.read', $caps);
    }

    public function test_stores_returns_only_active_memberships(): void
    {
        $user = User::factory()->create();
        $active = Store::factory()->create(['owner_user_id' => $user->id]);

        $suspendedOwner = User::factory()->create();
        $suspended = Store::factory()->create(['owner_user_id' => $suspendedOwner->id]);
        $this->attach($suspended, $user, MembershipRole::Cashier, MembershipStatus::Suspended);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/stores')->assertOk();

        $publicIds = array_column($response->json('data.stores'), 'public_id');
        $this->assertContains($active->public_id, $publicIds);
        $this->assertNotContains($suspended->public_id, $publicIds);
    }

    public function test_stores_uses_public_id_not_integer(): void
    {
        $user = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user);

        $store0 = $this->getJson('/api/v1/stores')->assertOk()->json('data.stores.0');
        $this->assertSame($store->public_id, $store0['public_id']);
        $this->assertArrayNotHasKey('id', $store0);
        $this->assertSame('owner', $store0['membership']['role']);
    }
}
