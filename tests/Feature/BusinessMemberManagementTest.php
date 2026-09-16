<?php

namespace Tests\Feature;

use App\Actions\Businesses\ClaimBusinessMembership;
use App\Actions\Businesses\CreateBusinessMember;
use App\Actions\Businesses\UpdateBusinessMember;
use App\Enums\BusinessRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\AuditLog;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class BusinessMemberManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_pos_only_cashier_without_email_and_pin_is_safe(): void
    {
        [$business, $owner, $store] = $this->businessFixture();

        $member = app(CreateBusinessMember::class)->handle($business, $owner, [
            'display_name' => 'Kasir Satu', 'role' => 'cashier', 'store_ids' => [$store->public_id],
            'pin' => '123456', 'personal_device_access' => false, 'email' => null,
        ], '127.0.0.1');

        $this->assertNull($member->user_id);
        $this->assertTrue(Hash::check('123456', $member->pos_pin_hash));
        $this->assertSame(BusinessRole::Staff, $member->business_role);
        $this->assertDatabaseHas('store_memberships', [
            'business_membership_id' => $member->id, 'store_id' => $store->id,
            'role' => MembershipRole::Cashier->value,
        ]);
        $this->assertArrayNotHasKey('pos_pin_hash', $member->toArray());
        $audit = AuditLog::query()->where('action', 'business.member_created')->latest('id')->first();
        $this->assertStringNotContainsString('123456', json_encode($audit?->metadata));
    }

    public function test_personal_device_access_creates_unique_unverified_invitation(): void
    {
        [$business, $owner, $store] = $this->businessFixture();
        $member = app(CreateBusinessMember::class)->handle($business, $owner, [
            'display_name' => 'Manager', 'role' => 'manager', 'store_ids' => [$store->public_id],
            'pin' => null, 'personal_device_access' => true, 'email' => 'manager@example.com',
        ], null);

        $this->assertSame(MembershipStatus::Invited, $member->status);
        $this->assertNull($member->user?->email_verified_at);

        $this->expectException(ValidationException::class);
        app(CreateBusinessMember::class)->handle($business, $owner, [
            'display_name' => 'Duplicate', 'role' => 'cashier', 'store_ids' => [$store->public_id],
            'pin' => null, 'personal_device_access' => true, 'email' => 'manager@example.com',
        ], null);
    }

    public function test_claiming_pos_membership_preserves_identity_and_history(): void
    {
        [$business, $owner, $store] = $this->businessFixture();
        $member = app(CreateBusinessMember::class)->handle($business, $owner, [
            'display_name' => 'Kasir Klaim', 'role' => 'cashier', 'store_ids' => [$store->public_id],
            'pin' => '234567', 'personal_device_access' => false, 'email' => null,
        ], null);
        $user = User::factory()->create();

        $claimed = app(ClaimBusinessMembership::class)->handle($member, $user, null);

        $this->assertSame($member->id, $claimed->id);
        $this->assertSame($user->id, $claimed->user_id);
        $this->assertNotNull($claimed->joined_at);
    }

    public function test_last_owner_cannot_be_suspended_or_demoted(): void
    {
        [$business, $owner] = $this->businessFixture();

        $this->expectException(ValidationException::class);
        app(UpdateBusinessMember::class)->handle($business, $owner, $owner, [
            'display_name' => $owner->display_name, 'role' => 'admin',
            'status' => MembershipStatus::Suspended->value, 'store_ids' => [], 'pin' => null,
        ], null);
    }

    public function test_manager_cannot_create_business_members(): void
    {
        [$business, $owner, $store] = $this->businessFixture();
        $manager = BusinessMembership::factory()->for($business)->create(['business_role' => BusinessRole::Staff]);
        $manager->stores()->attach($store->id, ['role' => 'manager', 'status' => 'active']);

        $this->expectException(HttpException::class);
        app(CreateBusinessMember::class)->handle($business, $manager, [
            'display_name' => 'No Access', 'role' => 'cashier', 'store_ids' => [$store->public_id],
            'pin' => '345678', 'personal_device_access' => false, 'email' => null,
        ], null);
    }

    public function test_member_capacity_is_rechecked_under_business_lock(): void
    {
        [$business, $owner, $store] = $this->businessFixture();
        app(CreateBusinessMember::class)->handle($business, $owner, [
            'display_name' => 'First', 'role' => 'cashier', 'store_ids' => [$store->public_id],
            'pin' => '456789', 'personal_device_access' => false, 'email' => null,
        ], null);

        $this->expectException(ValidationException::class);
        app(CreateBusinessMember::class)->handle($business, $owner, [
            'display_name' => 'Second', 'role' => 'cashier', 'store_ids' => [$store->public_id],
            'pin' => '567890', 'personal_device_access' => false, 'email' => null,
        ], null);
    }

    /** @return array{Business,BusinessMembership,Store} */
    private function businessFixture(): array
    {
        $user = User::factory()->create();
        $business = Business::factory()->create();
        $owner = BusinessMembership::factory()->for($business)->for($user)->create([
            'business_role' => BusinessRole::Owner,
        ]);
        $store = Store::factory()->for($business)->ownedBy($user)->create();

        return [$business, $owner, $store];
    }
}
