<?php

namespace Tests\Feature;

use App\Enums\BusinessRole;
use App\Enums\BusinessStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_join_multiple_businesses_but_only_once_per_business(): void
    {
        $user = User::factory()->create();
        $first = Business::factory()->create();
        $second = Business::factory()->create();

        BusinessMembership::factory()->for($first)->for($user)->create();
        BusinessMembership::factory()->for($second)->for($user)->create();

        $this->expectException(QueryException::class);
        BusinessMembership::factory()->for($first)->for($user)->create();
    }

    public function test_pos_only_member_can_exist_without_a_user(): void
    {
        $member = BusinessMembership::factory()->posOnly()->create();

        $this->assertNull($member->user_id);
        $this->assertSame(BusinessRole::Staff, $member->business_role);
    }

    public function test_switching_business_clears_an_inaccessible_active_store(): void
    {
        $user = User::factory()->create();
        $firstBusiness = Business::factory()->create();
        $secondBusiness = Business::factory()->create();
        BusinessMembership::factory()->for($firstBusiness)->for($user)->create(['business_role' => BusinessRole::Owner]);
        BusinessMembership::factory()->for($secondBusiness)->for($user)->create(['business_role' => BusinessRole::Owner]);
        $firstStore = Store::factory()->for($firstBusiness)->ownedBy($user)->create();

        $this->actingAs($user)->withSession([
            'active_business_id' => $firstBusiness->id,
            'active_store_id' => $firstStore->id,
            'pos_actor_membership_id' => 999,
            'register_session_id' => 999,
        ])->post(route('businesses.switch', $secondBusiness))->assertRedirect(route('dashboard'));

        $this->assertSame($secondBusiness->id, session('active_business_id'));
        $this->assertNull(session('active_store_id'));
        $this->assertNull(session('pos_actor_membership_id'));
        $this->assertNull(session('register_session_id'));
    }

    public function test_user_cannot_select_store_from_another_business(): void
    {
        $user = User::factory()->create();
        $business = Business::factory()->create();
        BusinessMembership::factory()->for($business)->for($user)->create(['business_role' => BusinessRole::Owner]);
        $otherStore = Store::factory()->create();

        $this->actingAs($user)->withSession(['active_business_id' => $business->id])
            ->post(route('stores.switch', $otherStore))->assertForbidden();
    }

    public function test_single_business_and_store_are_selected_without_extra_input(): void
    {
        $user = User::factory()->create();
        $business = Business::factory()->create();
        BusinessMembership::factory()->for($business)->for($user)->create(['business_role' => BusinessRole::Owner]);
        $store = Store::factory()->for($business)->ownedBy($user)->create();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();

        $this->assertSame($business->id, session('active_business_id'));
        $this->assertSame($store->id, session('active_store_id'));
    }

    public function test_suspended_business_blocks_operations_but_owner_can_open_store_management(): void
    {
        $user = User::factory()->create();
        $business = Business::factory()->create(['status' => BusinessStatus::Suspended]);
        BusinessMembership::factory()->for($business)->for($user)->create(['business_role' => BusinessRole::Owner]);
        Store::factory()->for($business)->ownedBy($user)->create();

        $this->actingAs($user)->get(route('dashboard'))->assertRedirect(route('stores.index'));
        $this->actingAs($user)->get(route('stores.index'))->assertOk();
    }
}
