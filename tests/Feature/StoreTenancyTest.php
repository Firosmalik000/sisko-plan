<?php

namespace Tests\Feature;

use App\Actions\Stores\SeedStoreStarterData;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Enums\UnitType;
use App\Enums\UserStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StoreTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_a_store_and_becomes_its_active_owner(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('stores.store'), [
            'name' => 'Toko Maju Jaya',
        ]);

        $store = Store::query()->sole();

        $response->assertRedirect(route('dashboard'));
        $this->assertSame($store->id, session('active_store_id'));
        $this->assertDatabaseHas('store_user', [
            'store_id' => $store->id,
            'user_id' => $user->id,
            'role' => MembershipRole::Owner->value,
            'status' => MembershipStatus::Active->value,
        ]);
        $this->assertDatabaseHas('store_settings', ['store_id' => $store->id]);
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
        $ownedStore = Store::factory()->for($user, 'owner')->create();
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
        $store = Store::factory()->for($user, 'owner')->create();
        $store->users()->updateExistingPivot($user->id, [
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
        $store = Store::factory()->for($user, 'owner')->create([
            'status' => StoreStatus::Suspended,
        ]);

        $this->actingAs($user)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertRedirect(route('stores.create'));
    }

    public function test_owner_can_add_and_suspend_an_existing_user(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)->post(route('stores.members.store', $store), [
            'email' => $member->email,
            'role' => MembershipRole::Cashier->value,
        ])->assertRedirect();

        $this->assertDatabaseHas('store_user', [
            'store_id' => $store->id,
            'user_id' => $member->id,
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);

        $this->actingAs($owner)->patch(route('stores.members.update', [$store, $member]), [
            'role' => MembershipRole::Admin->value,
            'status' => MembershipStatus::Suspended->value,
        ])->assertRedirect();

        $this->assertDatabaseHas('store_user', [
            'store_id' => $store->id,
            'user_id' => $member->id,
            'role' => MembershipRole::Admin->value,
            'status' => MembershipStatus::Suspended->value,
        ]);
    }

    public function test_owner_can_create_a_worker_account_and_membership_together(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)->post(route('stores.members.store', $store), [
            'mode' => 'create',
            'name' => 'Kasir Baru',
            'email' => 'kasir.baru@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => MembershipRole::Cashier->value,
        ])->assertRedirect();

        $worker = User::query()->where('email', 'kasir.baru@example.com')->sole();

        $this->assertSame('Kasir Baru', $worker->name);
        $this->assertTrue(Hash::check('Password123!', $worker->password));
        $this->assertDatabaseHas('store_user', [
            'store_id' => $store->id,
            'user_id' => $worker->id,
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);
    }

    public function test_worker_account_is_not_created_when_password_is_invalid(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)->post(route('stores.members.store', $store), [
            'mode' => 'create',
            'name' => 'Kasir Baru',
            'email' => 'kasir.baru@example.com',
            'password' => 'pendek',
            'password_confirmation' => 'berbeda',
            'role' => MembershipRole::Cashier->value,
        ])->assertSessionHasErrors('password');

        $this->assertDatabaseMissing('users', [
            'email' => 'kasir.baru@example.com',
        ]);
    }

    public function test_create_worker_mode_cannot_replace_an_existing_account(): void
    {
        $owner = User::factory()->create();
        $existingUser = User::factory()->create([
            'email' => 'pekerja@example.com',
            'password' => 'PasswordLama123!',
        ]);
        $store = Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)->post(route('stores.members.store', $store), [
            'mode' => 'create',
            'name' => 'Nama Pengganti',
            'email' => $existingUser->email,
            'password' => 'PasswordBaru123!',
            'password_confirmation' => 'PasswordBaru123!',
            'role' => MembershipRole::Cashier->value,
        ])->assertSessionHasErrors('email');

        $existingUser->refresh();

        $this->assertNotSame('Nama Pengganti', $existingUser->name);
        $this->assertTrue(Hash::check('PasswordLama123!', $existingUser->password));
        $this->assertDatabaseMissing('store_user', [
            'store_id' => $store->id,
            'user_id' => $existingUser->id,
        ]);
    }

    public function test_owner_cannot_add_themselves_again_with_a_different_role(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)->post(route('stores.members.store', $store), [
            'email' => $owner->email,
            'role' => MembershipRole::Cashier->value,
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseHas('store_user', [
            'store_id' => $store->id,
            'user_id' => $owner->id,
            'role' => MembershipRole::Owner->value,
            'status' => MembershipStatus::Active->value,
        ]);
    }

    public function test_existing_membership_cannot_be_changed_through_add_member_endpoint(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $store->users()->attach($member, [
            'role' => MembershipRole::Admin->value,
            'status' => MembershipStatus::Suspended->value,
        ]);

        $this->actingAs($owner)->post(route('stores.members.store', $store), [
            'email' => $member->email,
            'role' => MembershipRole::Cashier->value,
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseHas('store_user', [
            'store_id' => $store->id,
            'user_id' => $member->id,
            'role' => MembershipRole::Admin->value,
            'status' => MembershipStatus::Suspended->value,
        ]);
    }

    public function test_non_owner_cannot_manage_store_members(): void
    {
        $owner = User::factory()->create();
        $cashier = User::factory()->create();
        $newMember = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $store->users()->attach($cashier, [
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);

        $this->actingAs($cashier)
            ->get(route('stores.show', $store))
            ->assertForbidden();

        $this->actingAs($cashier)->post(route('stores.members.store', $store), [
            'email' => $newMember->email,
            'role' => MembershipRole::Cashier->value,
        ])->assertForbidden();
    }

    public function test_primary_owner_membership_cannot_be_changed(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        $response = $this->actingAs($owner)->patch(
            route('stores.members.update', [$store, $owner]),
            [
                'role' => MembershipRole::Admin->value,
                'status' => MembershipStatus::Suspended->value,
            ],
        );

        $response->assertSessionHasErrors('status');
        $this->assertDatabaseHas('store_user', [
            'store_id' => $store->id,
            'user_id' => $owner->id,
            'role' => MembershipRole::Owner->value,
            'status' => MembershipStatus::Active->value,
        ]);
    }

    public function test_suspended_store_cannot_be_viewed_or_modified_by_its_owner(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create([
            'name' => 'Toko Lama',
            'status' => StoreStatus::Suspended,
        ]);

        $this->actingAs($owner)
            ->get(route('stores.show', $store))
            ->assertForbidden();

        $this->actingAs($owner)
            ->patch(route('stores.update', $store), ['name' => 'Toko Baru'])
            ->assertForbidden();

        $this->actingAs($owner)->post(route('stores.members.store', $store), [
            'email' => $member->email,
            'role' => MembershipRole::Cashier->value,
        ])->assertForbidden();

        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'name' => 'Toko Lama',
        ]);
        $this->assertDatabaseMissing('store_user', [
            'store_id' => $store->id,
            'user_id' => $member->id,
        ]);
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
        Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($owner)->delete(route('profile.destroy'), [
            'password' => 'password',
        ])->assertSessionHasErrors('password');

        $this->assertDatabaseHas('users', ['id' => $owner->id]);
    }
}
