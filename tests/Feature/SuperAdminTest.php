<?php

namespace Tests\Feature;

use App\Enums\PlatformAdminRole;
use App\Enums\StoreStatus;
use App\Enums\UserStatus;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SuperAdminTest extends TestCase
{
    use RefreshDatabase;

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
}
