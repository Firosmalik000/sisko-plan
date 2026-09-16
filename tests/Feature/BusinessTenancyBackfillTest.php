<?php

namespace Tests\Feature;

use App\Enums\BusinessRole;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BusinessTenancyBackfillTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_factory_uses_business_as_the_only_tenant_owner(): void
    {
        $owner = User::factory()->create();
        $stores = Store::factory()->count(2)->ownedBy($owner)->create();

        $this->assertCount(1, $stores->pluck('business_id')->unique());
        $this->assertDatabaseHas('business_memberships', [
            'business_id' => $stores->first()->business_id,
            'user_id' => $owner->id,
            'business_role' => BusinessRole::Owner->value,
        ]);
        $this->assertDatabaseMissing('store_memberships', [
            'business_membership_id' => $owner->businessMemberships()->value('id'),
        ]);
    }
}
