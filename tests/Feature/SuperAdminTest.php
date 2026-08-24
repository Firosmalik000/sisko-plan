<?php

namespace Tests\Feature;

use App\Enums\PlatformAdminRole;
use App\Enums\StoreStatus;
use App\Enums\UserStatus;
use App\Models\CashTransaction;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Models\User;
use App\Support\PlatformPermission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SuperAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_admin_can_update_own_profile_and_password(): void
    {
        $admin = User::factory()->superAdmin()->create([
            'name' => 'Admin Lama',
            'email' => 'admin-lama@example.com',
        ]);

        $this->actingAs($admin)->patch(route('super-admin.security.profile.update'), [
            'name' => 'Admin Baru',
            'email' => 'admin-baru@example.com',
        ])->assertRedirect();

        $this->actingAs($admin)->put(route('super-admin.security.password.update'), [
            'current_password' => 'password',
            'password' => 'KataSandiBaru123!',
            'password_confirmation' => 'KataSandiBaru123!',
        ])->assertRedirect();

        $admin->refresh();
        $this->assertSame('Admin Baru', $admin->name);
        $this->assertSame('admin-baru@example.com', $admin->email);
        $this->assertTrue(Hash::check('KataSandiBaru123!', $admin->password));
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'admin.profile_updated',
            'subject_id' => $admin->id,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'admin.password_updated',
            'subject_id' => $admin->id,
        ]);
    }

    public function test_platform_admin_profile_and_password_updates_are_validated(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $other = User::factory()->create();

        $this->actingAs($admin)->patch(route('super-admin.security.profile.update'), [
            'name' => '',
            'email' => $other->email,
        ])->assertSessionHasErrors(['name', 'email']);

        $this->actingAs($admin)->put(route('super-admin.security.password.update'), [
            'current_password' => 'salah',
            'password' => 'KataSandiBaru123!',
            'password_confirmation' => 'KataSandiBaru123!',
        ])->assertSessionHasErrors('current_password');

        $this->assertTrue(Hash::check('password', $admin->fresh()->password));
    }

    public function test_super_admin_login_uses_the_unified_user_guard(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->post(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('super-admin.dashboard'));

        $this->assertAuthenticatedAs($admin);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'admin.login',
        ]);
    }

    public function test_store_user_cannot_access_super_admin_surface(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('super-admin.dashboard'))
            ->assertForbidden();
    }

    public function test_inactive_super_admin_cannot_log_in(): void
    {
        $admin = User::factory()->superAdmin()->create(['status' => UserStatus::Suspended]);

        $this->post(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_super_admin_can_suspend_a_user_and_action_is_audited(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $user = User::factory()->create();

        $this->actingAs($admin)->patch(
            route('super-admin.users.status', $user),
            ['status' => UserStatus::Suspended->value],
        )->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => UserStatus::Suspended->value,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'user.status_updated',
            'subject_type' => User::class,
            'subject_id' => $user->id,
        ]);
    }

    public function test_only_super_admin_can_delete_an_unowned_user_and_action_is_audited(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $regularAdmin = User::factory()->platformAdmin()->create();
        $user = User::factory()->create();

        $this->actingAs($regularAdmin)->delete(route('super-admin.users.destroy', $user))->assertForbidden();
        $this->actingAs($superAdmin)->delete(route('super-admin.users.destroy', $user))->assertRedirect();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $superAdmin->id,
            'action' => 'user.deleted',
            'subject_type' => User::class,
            'subject_id' => $user->id,
        ]);
    }

    public function test_user_with_store_ownership_or_transaction_history_cannot_be_deleted(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->create();
        Store::factory()->for($owner, 'owner')->create();

        $this->actingAs($admin)->delete(route('super-admin.users.destroy', $owner))
            ->assertSessionHasErrors('user');
        $this->assertDatabaseHas('users', ['id' => $owner->id]);

        $operator = User::factory()->create();
        $store = Store::factory()->create();
        $account = FinancialAccount::factory()->for($store)->create();
        CashTransaction::create([
            'store_id' => $store->id,
            'financial_account_id' => $account->id,
            'direction' => 'in',
            'reason' => 'opening_balance',
            'amount' => '1000',
            'balance_after' => '1000',
            'idempotency_key' => (string) Str::uuid(),
            'occurred_at' => now(),
            'created_by_user_id' => $operator->id,
        ]);

        $this->actingAs($admin)->delete(route('super-admin.users.destroy', $operator))
            ->assertSessionHasErrors('user');
        $this->assertDatabaseHas('users', ['id' => $operator->id]);
    }

    public function test_super_admin_can_impersonate_a_user_and_return_to_the_admin_session(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $user = User::factory()->create();

        $response = $this->actingAs($admin)
            ->post(route('super-admin.users.impersonate', $user))
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($user);
        $response->assertSessionHas('impersonation.admin_id', $admin->id);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'admin.impersonation.started',
            'subject_type' => User::class,
            'subject_id' => $user->id,
        ]);

        $this->post(route('impersonation.leave'))
            ->assertRedirect(route('super-admin.users.index'));

        $this->assertAuthenticatedAs($admin);
        $this->assertFalse(session()->has('impersonation'));
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'admin.impersonation.ended',
            'subject_type' => User::class,
            'subject_id' => $user->id,
        ]);
    }

    public function test_super_admin_can_suspend_a_store_and_action_is_audited(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $store = Store::factory()->create();

        $this->actingAs($admin)->patch(
            route('super-admin.stores.status', $store),
            ['status' => StoreStatus::Suspended->value],
        )->assertRedirect();

        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'status' => StoreStatus::Suspended->value,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $admin->id,
            'action' => 'store.status_updated',
            'subject_type' => Store::class,
            'subject_id' => $store->id,
        ]);
    }

    public function test_only_super_admin_can_manage_platform_admin_accounts(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $regularAdmin = User::factory()->platformAdmin()->create();

        $this->actingAs($regularAdmin)
            ->get(route('super-admin.platform-admins.index'))
            ->assertForbidden();

        $this->actingAs($superAdmin)
            ->get(route('super-admin.platform-admins.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('super-admin/platform-admins/index')
                ->has('admins', 2));

        $this->actingAs($superAdmin)->post(route('super-admin.platform-admins.store'), [
            'name' => 'Operations Admin',
            'email' => 'operations@example.com',
            'password' => 'SecureAdmin123!',
        ])->assertRedirect();

        $created = User::query()->where('email', 'operations@example.com')->sole();
        $this->assertSame(PlatformAdminRole::Admin, $created->platform_role);
        $this->assertEqualsCanonicalizing(
            PlatformPermission::defaultAdmin(),
            $created->getAllPermissions()->pluck('name')->all(),
        );
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $superAdmin->id,
            'action' => 'platform_admin.created',
            'subject_id' => $created->id,
        ]);
    }

    public function test_super_admin_cannot_deactivate_self_but_can_deactivate_platform_admin(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $regularAdmin = User::factory()->platformAdmin()->create();

        $this->actingAs($superAdmin)->patch(
            route('super-admin.platform-admins.status', $superAdmin),
            ['is_active' => false],
        )->assertSessionHasErrors('is_active');
        $this->assertSame(UserStatus::Active, $superAdmin->fresh()?->status);

        $this->actingAs($superAdmin)->patch(
            route('super-admin.platform-admins.status', $regularAdmin),
            ['is_active' => false],
        )->assertRedirect();

        $this->assertSame(UserStatus::Suspended, $regularAdmin->fresh()?->status);
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $superAdmin->id,
            'action' => 'platform_admin.status_updated',
            'subject_id' => $regularAdmin->id,
        ]);
    }

    public function test_platform_permissions_protect_every_portal_menu_and_action(): void
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->syncPermissions([]);
        $targetUser = User::factory()->create();
        $targetAdmin = User::factory()->platformAdmin()->create();
        $store = Store::factory()->create();
        $subscription = $store->subscription()->firstOrFail();
        $plan = $subscription->plan;

        $requests = [
            ['GET', route('super-admin.dashboard')],
            ['GET', route('super-admin.users.index')],
            ['POST', route('super-admin.users.impersonate', $targetUser)],
            ['PATCH', route('super-admin.users.status', $targetUser)],
            ['DELETE', route('super-admin.users.destroy', $targetUser)],
            ['GET', route('super-admin.stores.index')],
            ['PATCH', route('super-admin.stores.status', $store)],
            ['GET', route('super-admin.subscriptions.index')],
            ['GET', route('super-admin.payments.index')],
            ['POST', route('super-admin.plans.store')],
            ['PATCH', route('super-admin.plans.update', $plan)],
            ['PATCH', route('super-admin.subscriptions.update', $subscription)],
            ['POST', route('super-admin.subscriptions.payments.store', $subscription)],
            ['POST', route('super-admin.subscriptions.activate-all')],
            ['GET', route('super-admin.platform-admins.index')],
            ['POST', route('super-admin.platform-admins.store')],
            ['PATCH', route('super-admin.platform-admins.status', $targetAdmin)],
            ['PUT', route('super-admin.platform-admins.permissions.update', $targetAdmin)],
        ];

        foreach ($requests as [$method, $url]) {
            $this->actingAs($admin)->call($method, $url)->assertForbidden();
        }

        $this->actingAs($admin)->get(route('super-admin.security.index'))->assertOk();
    }

    public function test_admin_only_sees_and_opens_the_portal_domain_granted_to_them(): void
    {
        $admin = User::factory()->platformAdmin()->create();
        $admin->syncPermissions([PlatformPermission::USERS_VIEW]);

        $this->actingAs($admin)->get(route('super-admin.users.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('super-admin/users/index')
                ->where('platformAdmin.permissions', [PlatformPermission::USERS_VIEW]));
        $this->actingAs($admin)->get(route('super-admin.dashboard'))->assertForbidden();
        $this->actingAs($admin)->get(route('super-admin.stores.index'))->assertForbidden();

        auth()->logout();
        $this->post(route('login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('super-admin.users.index'));
    }

    public function test_super_admin_can_assign_direct_permissions_and_is_always_full_access(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $admin = User::factory()->platformAdmin()->create();
        $superAdmin->syncPermissions([]);

        $this->actingAs($superAdmin)->put(
            route('super-admin.platform-admins.permissions.update', $admin),
            ['permissions' => [PlatformPermission::USERS_VIEW, PlatformPermission::USERS_IMPERSONATE]],
        )->assertRedirect();

        $this->assertTrue($admin->fresh()->hasDirectPermission(PlatformPermission::USERS_VIEW));
        $this->assertTrue($admin->fresh()->hasDirectPermission(PlatformPermission::USERS_IMPERSONATE));
        $this->assertDatabaseHas('admin_audit_logs', [
            'user_id' => $superAdmin->id,
            'action' => 'platform_admin.permissions_updated',
            'subject_id' => $admin->id,
        ]);
        $this->actingAs($superAdmin)->get(route('super-admin.dashboard'))->assertOk();
        $this->actingAs($superAdmin)->get(route('super-admin.platform-admins.index'))->assertOk();
    }
}
