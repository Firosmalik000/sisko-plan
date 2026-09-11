<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreMembershipGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);

        Route::middleware(['api', 'auth:sanctum', 'store.membership'])
            ->prefix('api/v1')
            ->get('_test/stores/{store}/ping', fn () => response()->json(['data' => ['ok' => true], 'meta' => ['request_id' => 'x']]));

        Route::middleware(['api', 'auth:sanctum', 'store.membership:owner'])
            ->prefix('api/v1')
            ->get('_test/stores/{store}/owner-only', fn () => response()->json(['data' => ['ok' => true], 'meta' => ['request_id' => 'x']]));
    }

    private function attach(Store $store, User $user, MembershipRole $role, MembershipStatus $status = MembershipStatus::Active): void
    {
        $store->users()->syncWithoutDetaching([
            $user->id => ['role' => $role->value, 'status' => $status->value],
        ]);
    }

    public function test_member_can_access_store_scoped_route(): void
    {
        $user = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $user->id]);
        Sanctum::actingAs($user);

        $this->getJson("/api/v1/_test/stores/{$store->public_id}/ping")->assertOk();
    }

    public function test_non_member_is_treated_as_not_found_cross_tenant(): void
    {
        $user = User::factory()->create();
        $otherOwner = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $otherOwner->id]);
        Sanctum::actingAs($user);

        $this->getJson("/api/v1/_test/stores/{$store->public_id}/ping")
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'NOT_FOUND');
    }

    public function test_suspended_membership_is_rejected(): void
    {
        $user = User::factory()->create();
        $ownerU = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $ownerU->id]);
        $this->attach($store, $user, MembershipRole::Cashier, MembershipStatus::Suspended);
        Sanctum::actingAs($user);

        $this->getJson("/api/v1/_test/stores/{$store->public_id}/ping")->assertStatus(404);
    }

    public function test_role_restricted_route_forbids_non_owner(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $owner->id]);
        $cashier = User::factory()->create();
        $this->attach($store, $cashier, MembershipRole::Cashier);
        Sanctum::actingAs($cashier);

        $this->getJson("/api/v1/_test/stores/{$store->public_id}/owner-only")
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_role_restricted_route_allows_owner(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->create(['owner_user_id' => $owner->id]);
        Sanctum::actingAs($owner);

        $this->getJson("/api/v1/_test/stores/{$store->public_id}/owner-only")->assertOk();
    }
}
