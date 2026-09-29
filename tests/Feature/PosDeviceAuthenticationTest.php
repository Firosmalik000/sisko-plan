<?php

namespace Tests\Feature;

use App\Enums\BusinessRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\BusinessMembership;
use App\Models\FinancialAccount;
use App\Models\PosDevice;
use App\Models\Register;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PosDeviceAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_activate_a_store_device_without_persisting_the_raw_token(): void
    {
        [$owner, $store] = $this->storeFixture();

        $response = $this->actingAs($owner)->post(route('pos-devices.store', $store), [
            'name' => 'Kasir Depan',
        ]);

        $response->assertRedirectToRoute('terminal.lock');
        $cookie = $response->getCookie('pos_device_token');
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertTrue($cookie->isSecure());
        $this->assertSame('lax', strtolower((string) $cookie->getSameSite()));
        $this->assertGuest();
        $device = PosDevice::query()->sole();
        $this->assertSame($store->id, $device->store_id);
        $this->assertNotSame($cookie->getValue(), $device->token_hash);
        $this->assertSame(64, strlen($device->token_hash));
    }

    public function test_first_device_activation_provisions_one_reusable_default_register(): void
    {
        [$owner, $store] = $this->storeFixture();

        $this->actingAs($owner)->post(route('pos-devices.store', $store), [
            'name' => 'Tablet Depan',
        ])->assertRedirectToRoute('terminal.lock');
        $this->actingAs($owner)->post(route('pos-devices.store', $store), [
            'name' => 'Tablet Belakang',
        ])->assertRedirectToRoute('terminal.lock');

        $cashAccount = FinancialAccount::query()->where('store_id', $store->id)->sole();
        $register = Register::query()->where('store_id', $store->id)->sole();

        $this->assertSame('cash', $cashAccount->type->value);
        $this->assertSame('Kas', $cashAccount->name);
        $this->assertSame('Kasir Utama', $register->name);
        $this->assertSame($cashAccount->id, $register->cash_financial_account_id);
        $this->assertSame('active', $register->status);
    }

    public function test_device_activation_reuses_an_existing_active_cash_account(): void
    {
        [$owner, $store] = $this->storeFixture();
        $cashAccount = FinancialAccount::factory()->for($store)->create([
            'name' => 'Cash Drawer',
            'type' => 'cash',
            'is_active' => true,
        ]);

        $this->actingAs($owner)->post(route('pos-devices.store', $store), [
            'name' => 'Tablet Depan',
        ])->assertRedirectToRoute('terminal.lock');

        $this->assertDatabaseCount('financial_accounts', 1);
        $this->assertSame($cashAccount->id, Register::query()->sole()->cash_financial_account_id);
    }

    public function test_cashier_cannot_activate_a_device(): void
    {
        [, $store] = $this->storeFixture();
        [$cashier] = $this->staffFixture($store, MembershipRole::Cashier);

        $this->actingAs($cashier)->post(route('pos-devices.store', $store), ['name' => 'Illegal'])
            ->assertForbidden();
    }

    public function test_unactivated_browser_cannot_open_or_unlock_terminal(): void
    {
        $this->get(route('terminal.lock'))->assertForbidden();
        $this->post(route('terminal.unlock'), ['member_id' => 'missing', 'pin' => '123456'])->assertForbidden();
    }

    public function test_activated_device_unlocks_only_assigned_active_staff_with_their_pin(): void
    {
        [$owner, $store] = $this->storeFixture();
        [, $member] = $this->staffFixture($store, MembershipRole::Cashier, '123456');
        [, $otherStore] = $this->storeFixture();
        [, $unassigned] = $this->staffFixture($otherStore, MembershipRole::Cashier, '654321');
        $cookie = $this->activate($owner, $store);

        $this->withCookie('pos_device_token', $cookie)
            ->post(route('terminal.unlock'), ['member_id' => $unassigned->public_id, 'pin' => '654321'])
            ->assertSessionHasErrors('member_id');
        $this->withCookie('pos_device_token', $cookie)
            ->post(route('terminal.unlock'), ['member_id' => $member->public_id, 'pin' => '000000'])
            ->assertSessionHasErrors('pin');
        $this->withCookie('pos_device_token', $cookie)
            ->post(route('terminal.unlock'), ['member_id' => $member->public_id, 'pin' => '123456'])
            ->assertRedirectToRoute('terminal.home')
            ->assertSessionHas('pos_actor_membership_id', $member->id);
    }

    public function test_revoked_device_and_suspended_member_are_denied(): void
    {
        [$owner, $store] = $this->storeFixture();
        [, $member] = $this->staffFixture($store, MembershipRole::Cashier, '123456');
        $cookie = $this->activate($owner, $store);

        $member->update(['status' => MembershipStatus::Suspended]);
        $this->withCookie('pos_device_token', $cookie)
            ->post(route('terminal.unlock'), ['member_id' => $member->public_id, 'pin' => '123456'])
            ->assertSessionHasErrors('member_id');

        $member->update(['status' => MembershipStatus::Active]);
        $device = PosDevice::query()->sole();
        $device->update(['status' => 'revoked', 'revoked_at' => now()]);
        $this->withCookie('pos_device_token', $cookie)->get(route('terminal.lock'))->assertForbidden();
    }

    public function test_repeated_wrong_pin_attempts_temporarily_lock_that_device_and_member_pair(): void
    {
        config()->set('pos.pin_max_attempts', 3);
        [$owner, $store] = $this->storeFixture();
        [, $member] = $this->staffFixture($store, MembershipRole::Cashier, '123456');
        $cookie = $this->activate($owner, $store);

        foreach (range(1, 3) as $_) {
            $this->withCookie('pos_device_token', $cookie)
                ->post(route('terminal.unlock'), ['member_id' => $member->public_id, 'pin' => '000000'])
                ->assertSessionHasErrors('pin');
        }
        $this->withCookie('pos_device_token', $cookie)
            ->post(route('terminal.unlock'), ['member_id' => $member->public_id, 'pin' => '123456'])
            ->assertSessionHasErrors('pin')
            ->assertSessionMissing('pos_actor_membership_id');
    }

    public function test_terminal_actor_is_locked_after_idle_timeout_or_explicit_switch(): void
    {
        [$owner, $store] = $this->storeFixture();
        [, $member] = $this->staffFixture($store, MembershipRole::Cashier, '123456');
        $cookie = $this->activate($owner, $store);

        $this->withCookie('pos_device_token', $cookie)->withSession([
            'pos_actor_membership_id' => $member->id,
            'pos_actor_last_activity_at' => now()->subMinutes(20)->timestamp,
        ])->get(route('terminal.home'))->assertRedirectToRoute('terminal.lock');

        $this->withCookie('pos_device_token', $cookie)->withSession([
            'pos_actor_membership_id' => $member->id,
            'pos_actor_last_activity_at' => now()->timestamp,
        ])->post(route('terminal.lock.store'))->assertRedirectToRoute('terminal.lock')
            ->assertSessionMissing('pos_actor_membership_id');
    }

    public function test_activated_device_can_render_terminal_lock_with_active_members(): void
    {
        [$owner, $store] = $this->storeFixture();
        [, $member] = $this->staffFixture($store, MembershipRole::Cashier, '123456');
        [, $otherStore] = $this->storeFixture();
        [, $unassigned] = $this->staffFixture($otherStore, MembershipRole::Cashier, '654321');

        // Staff without PIN -> excluded
        $noPinUser = User::factory()->create();
        $noPinMember = BusinessMembership::factory()->create([
            'business_id' => $store->business_id,
            'user_id' => $noPinUser->id,
            'display_name' => 'No PIN Staff',
            'business_role' => BusinessRole::Staff,
            'pos_pin_hash' => null,
        ]);
        $noPinMember->stores()->attach($store, [
            'role' => MembershipRole::Cashier,
            'status' => MembershipStatus::Active,
        ]);

        // Staff suspended at store level -> excluded
        $storeSuspendedUser = User::factory()->create();
        $storeSuspendedMember = BusinessMembership::factory()->create([
            'business_id' => $store->business_id,
            'user_id' => $storeSuspendedUser->id,
            'display_name' => 'Store Suspended Staff',
            'business_role' => BusinessRole::Staff,
            'pos_pin_hash' => Hash::make('111111'),
        ]);
        $storeSuspendedMember->stores()->attach($store, [
            'role' => MembershipRole::Cashier,
            'status' => MembershipStatus::Suspended,
        ]);

        // Staff suspended at business level -> excluded
        $businessSuspendedUser = User::factory()->create();
        $businessSuspendedMember = BusinessMembership::factory()->create([
            'business_id' => $store->business_id,
            'user_id' => $businessSuspendedUser->id,
            'display_name' => 'Business Suspended Staff',
            'business_role' => BusinessRole::Staff,
            'status' => MembershipStatus::Suspended,
            'pos_pin_hash' => Hash::make('222222'),
        ]);
        $businessSuspendedMember->stores()->attach($store, [
            'role' => MembershipRole::Cashier,
            'status' => MembershipStatus::Active,
        ]);

        // Owner with PIN -> included
        $ownerMembership = BusinessMembership::query()
            ->where('business_id', $store->business_id)
            ->where('business_role', BusinessRole::Owner->value)
            ->firstOrFail();
        $ownerMembership->update(['pos_pin_hash' => Hash::make('999999')]);

        $cookie = $this->activate($owner, $store);

        $this->withCookie('pos_device_token', $cookie)
            ->get(route('terminal.lock'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('terminal/lock')
                ->has('members', 2)
                ->where('members', fn ($membersList) => collect($membersList)->pluck('public_id')->sort()->values()->all() ===
                    collect([$ownerMembership->public_id, $member->public_id])->sort()->values()->all()
                )
            );
    }

    public function test_owner_can_exit_terminal_mode_with_valid_credentials(): void
    {
        [$owner, $store] = $this->storeFixture();
        $cookie = $this->activate($owner, $store);

        $response = $this->withCookie('pos_device_token', $cookie)
            ->post(route('terminal.exit'), [
                'email' => $owner->email,
                'password' => 'password',
            ]);

        $response->assertRedirectToRoute('dashboard');
        $this->assertAuthenticatedAs($owner);
    }

    public function test_exit_terminal_mode_fails_with_invalid_credentials(): void
    {
        [$owner, $store] = $this->storeFixture();
        $cookie = $this->activate($owner, $store);

        $response = $this->withCookie('pos_device_token', $cookie)
            ->post(route('terminal.exit'), [
                'email' => $owner->email,
                'password' => 'wrong-password',
            ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_exit_terminal_mode_fails_for_staff_user(): void
    {
        [$owner, $store] = $this->storeFixture();
        [$staff] = $this->staffFixture($store, MembershipRole::Cashier);
        $cookie = $this->activate($owner, $store);

        $response = $this->withCookie('pos_device_token', $cookie)
            ->post(route('terminal.exit'), [
                'email' => $staff->email,
                'password' => 'password',
            ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    /** @return array{User,Store} */
    private function storeFixture(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->ownedBy($owner)->create();

        return [$owner, $store];
    }

    /** @return array{User,BusinessMembership} */
    private function staffFixture(Store $store, MembershipRole $role, string $pin = '123456'): array
    {
        $user = User::factory()->create();
        $member = BusinessMembership::factory()->create([
            'business_id' => $store->business_id,
            'user_id' => $user->id,
            'display_name' => $user->name,
            'business_role' => BusinessRole::Staff,
            'pos_pin_hash' => Hash::make($pin),
        ]);
        $member->stores()->attach($store, [
            'role' => $role,
            'status' => MembershipStatus::Active,
        ]);

        return [$user, $member];
    }

    private function activate(User $owner, Store $store): string
    {
        $response = $this->actingAs($owner)->post(route('pos-devices.store', $store), ['name' => 'Kasir Utama']);
        $response->assertRedirectToRoute('terminal.lock');
        $cookie = $response->getCookie('pos_device_token');
        $this->assertNotNull($cookie);

        return $cookie->getValue();
    }
}
