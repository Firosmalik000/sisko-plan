<?php

namespace Tests\Feature;

use App\Enums\BusinessRole;
use App\Enums\MembershipRole;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class StaffAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('roleCapabilities')]
    public function test_role_capability_matrix(string $role, string $ability, bool $allowed): void
    {
        [$user, $store] = $this->actorForRole($role);

        $this->assertSame($allowed, Gate::forUser($user)->allows($ability, $store));
    }

    /** @return iterable<string, array{string,string,bool}> */
    public static function roleCapabilities(): iterable
    {
        foreach ([
            'owner' => ['business.manage', 'members.manage', 'store.manage', 'sales.checkout', 'sales.view-all', 'register.approve', 'reports.view'],
            'admin' => ['members.manage', 'store.manage', 'sales.checkout', 'sales.view-all', 'register.approve', 'reports.view'],
            'manager' => ['store.manage', 'sales.checkout', 'sales.view-all', 'register.approve', 'reports.view'],
            'cashier' => ['sales.checkout'],
        ] as $role => $allowed) {
            foreach (['business.manage', 'members.manage', 'store.manage', 'sales.checkout', 'sales.view-all', 'register.approve', 'reports.view'] as $ability) {
                yield "{$role}:{$ability}" => [$role, $ability, in_array($ability, $allowed, true)];
            }
        }
    }

    /** @return array{User,Store} */
    private function actorForRole(string $role): array
    {
        $owner = User::factory()->create();
        $business = Business::factory()->create();
        BusinessMembership::factory()->for($business)->for($owner)->create(['business_role' => BusinessRole::Owner]);
        $store = Store::factory()->for($business)->ownedBy($owner)->create();
        if ($role === 'owner') {
            return [$owner, $store];
        }

        $user = User::factory()->create();
        $businessRole = $role === 'admin' ? BusinessRole::Admin : BusinessRole::Staff;
        $member = BusinessMembership::factory()->for($business)->for($user)->create(['business_role' => $businessRole]);
        if (in_array($role, ['manager', 'cashier'], true)) {
            $member->stores()->attach($store->id, [
                'role' => $role === 'manager' ? MembershipRole::Manager : MembershipRole::Cashier,
                'status' => 'active',
            ]);
        }

        return [$user, $store];
    }
}
