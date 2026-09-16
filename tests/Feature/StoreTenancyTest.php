<?php

namespace Tests\Feature;

use App\Actions\Stores\SeedStoreStarterData;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Enums\UnitType;
use App\Enums\UserStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoreTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_a_store_and_becomes_its_active_owner(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('stores.store'), [
            'name' => 'Toko Maju Jaya',
            'address' => 'Jl. Merdeka No. 10, Jakarta',
        ]);

        $store = Store::query()->sole();

        $response->assertRedirect(route('dashboard'));
        $this->assertSame($store->id, session('active_store_id'));
        $this->assertDatabaseHas('business_memberships', [
            'business_id' => $store->business_id,
            'user_id' => $user->id,
            'business_role' => 'owner',
            'status' => MembershipStatus::Active->value,
        ]);
        $this->assertDatabaseMissing('store_memberships', [
            'store_id' => $store->id,
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseHas('store_settings', [
            'store_id' => $store->id,
            'address' => 'Jl. Merdeka No. 10, Jakarta',
        ]);
        $this->assertSame(8, $store->categories()->count());
        $this->assertSame(19, $store->units()->count());
        $this->assertSame(10, $store->units()->where('unit_type', UnitType::Large)->count());
        $this->assertSame(9, $store->units()->where('unit_type', UnitType::Retail)->count());
        $this->assertDatabaseHas('categories', [
            'store_id' => $store->id,
            'name' => 'Minuman',
        ]);
        $this->assertDatabaseHas('units', [
            'store_id' => $store->id,
            'name' => 'Dus',
            'unit_type' => UnitType::Large->value,
        ]);
        $this->assertDatabaseHas('units', [
            'store_id' => $store->id,
            'name' => 'Botol',
            'unit_type' => UnitType::Retail->value,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'store_id' => $store->id,
            'actor_type' => $user->getMorphClass(),
            'actor_id' => $user->id,
            'action' => 'store.created',
            'subject_type' => $store->getMorphClass(),
            'subject_id' => $store->id,
        ]);
    }

    public function test_starter_data_is_idempotent_and_owned_by_each_store(): void
    {
        $firstStore = Store::factory()->create();
        $secondStore = Store::factory()->create();
        $starterData = app(SeedStoreStarterData::class);

        $starterData->handle($firstStore);
        $starterData->handle($firstStore);
        $starterData->handle($secondStore);

        $this->assertSame(8, $firstStore->categories()->count());
        $this->assertSame(19, $firstStore->units()->count());
        $this->assertSame(8, $secondStore->categories()->count());
        $this->assertSame(19, $secondStore->units()->count());

        $firstStore->categories()->where('name', 'Minuman')->sole()->update([
            'name' => 'Minuman Dingin',
        ]);

        $this->assertDatabaseHas('categories', [
            'store_id' => $firstStore->id,
            'name' => 'Minuman Dingin',
        ]);
        $this->assertDatabaseHas('categories', [
            'store_id' => $secondStore->id,
            'name' => 'Minuman',
        ]);
    }

    public function test_member_can_switch_only_to_an_active_store_they_belong_to(): void
    {
        $user = User::factory()->create();
        $ownedStore = Store::factory()->ownedBy($user)->create();
        $otherStore = Store::factory()->create();

        $this->actingAs($user)
            ->post(route('stores.switch', $ownedStore))
            ->assertRedirect(route('dashboard'));
        $this->assertSame($ownedStore->id, session('active_store_id'));

        $this->actingAs($user)
            ->post(route('stores.switch', $otherStore))
            ->assertForbidden();
        $this->assertSame($ownedStore->id, session('active_store_id'));
    }

    public function test_cross_store_detail_is_denied(): void
    {
        $user = User::factory()->create();
        $otherStore = Store::factory()->create();

        $this->actingAs($user)
            ->get(route('stores.show', $otherStore))
            ->assertForbidden();
    }

    public function test_suspended_membership_cannot_establish_store_context(): void
    {
        $user = User::factory()->create();
        $store = Store::factory()->ownedBy($user)->create();
        $user->businessMemberships()->where('business_id', $store->business_id)->update([
            'status' => MembershipStatus::Suspended->value,
        ]);

        $this->actingAs($user)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertRedirect(route('stores.create'));
    }

    public function test_suspended_store_cannot_remain_active(): void
    {
        $user = User::factory()->create();
        $store = Store::factory()->ownedBy($user)->create([
            'status' => StoreStatus::Suspended,
        ]);

        $this->actingAs($user)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertRedirect(route('stores.create'));
    }

    public function test_suspended_user_cannot_log_in_or_continue_a_session(): void
    {
        $user = User::factory()->create(['status' => UserStatus::Suspended]);

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->actingAs($user)
            ->get(route('stores.index'))
            ->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_primary_store_owner_cannot_delete_their_account(): void
    {
        $owner = User::factory()->create();
        Store::factory()->ownedBy($owner)->create();

        $this->actingAs($owner)->delete(route('profile.destroy'), [
            'password' => 'password',
        ])->assertSessionHasErrors('password');

        $this->assertDatabaseHas('users', ['id' => $owner->id]);
    }
}
