<?php

namespace Tests\Feature;

use App\Enums\BusinessRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TeamActivityTest extends TestCase
{
    use RefreshDatabase;

    public function test_manager_team_activity_is_limited_to_assigned_stores(): void
    {
        $owner = User::factory()->create();
        $business = Business::factory()->create();
        BusinessMembership::factory()->for($business)->for($owner)->create(['business_role' => BusinessRole::Owner]);
        $assigned = Store::factory()->for($business)->ownedBy($owner)->create(['name' => 'Assigned']);
        Store::factory()->for($business)->ownedBy($owner)->create(['name' => 'Hidden']);
        $manager = User::factory()->create();
        $membership = BusinessMembership::factory()->for($business)->for($manager)->create(['business_role' => BusinessRole::Staff]);
        $membership->stores()->attach($assigned, [
            'role' => MembershipRole::Manager,
            'status' => MembershipStatus::Active,
        ]);
        $this->actingAs($manager)->withSession(['active_business_id' => $business->id, 'active_store_id' => $assigned->id])
            ->get(route('team.activity.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/team/activity')
                ->has('stores', 1)
                ->where('stores.0.public_id', $assigned->public_id));
    }
}
