<?php

namespace Tests\Feature;

use App\Enums\StoreStatus;
use App\Enums\UserStatus;
use App\Models\PlatformAdmin;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SuperAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_login_uses_a_separate_guard(): void
    {
        $admin = PlatformAdmin::factory()->create();

        $this->post(route('super-admin.login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertRedirect(route('super-admin.dashboard'));

        $this->assertAuthenticated('platform_admin');
        $this->assertGuest('web');
        $this->assertDatabaseHas('admin_audit_logs', [
            'platform_admin_id' => $admin->id,
            'action' => 'admin.login',
        ]);
    }

    public function test_store_user_cannot_access_super_admin_surface(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('super-admin.dashboard'))
            ->assertRedirect(route('super-admin.login'));
    }

    public function test_inactive_super_admin_cannot_log_in(): void
    {
        $admin = PlatformAdmin::factory()->create(['is_active' => false]);

        $this->post(route('super-admin.login.store'), [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest('platform_admin');
    }

    public function test_super_admin_can_suspend_a_user_and_action_is_audited(): void
    {
        $admin = PlatformAdmin::factory()->create();
        $user = User::factory()->create();

        $this->actingAs($admin, 'platform_admin')->patch(
            route('super-admin.users.status', $user),
            ['status' => UserStatus::Suspended->value],
        )->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'status' => UserStatus::Suspended->value,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'platform_admin_id' => $admin->id,
            'action' => 'user.status_updated',
            'subject_type' => User::class,
            'subject_id' => $user->id,
        ]);
    }

    public function test_super_admin_can_suspend_a_store_and_action_is_audited(): void
    {
        $admin = PlatformAdmin::factory()->create();
        $store = Store::factory()->create();

        $this->actingAs($admin, 'platform_admin')->patch(
            route('super-admin.stores.status', $store),
            ['status' => StoreStatus::Suspended->value],
        )->assertRedirect();

        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'status' => StoreStatus::Suspended->value,
        ]);
        $this->assertDatabaseHas('admin_audit_logs', [
            'platform_admin_id' => $admin->id,
            'action' => 'store.status_updated',
            'subject_type' => Store::class,
            'subject_id' => $store->id,
        ]);
    }
}
