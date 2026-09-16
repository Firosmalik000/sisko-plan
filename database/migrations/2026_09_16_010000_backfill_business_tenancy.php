<?php

use App\Enums\BusinessRole;
use App\Enums\BusinessStatus;
use App\Enums\MembershipRole;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            $ambiguousUser = DB::table('store_memberships')
                ->join('stores', 'stores.id', '=', 'store_memberships.store_id')
                ->whereNotNull('store_memberships.user_id')
                ->groupBy('store_memberships.user_id')
                ->havingRaw('COUNT(DISTINCT stores.owner_user_id) > 1')
                ->value('store_memberships.user_id');

            if ($ambiguousUser !== null) {
                throw new RuntimeException("Legacy user [{$ambiguousUser}] belongs to stores with different owners; Business assignment is ambiguous.");
            }

            DB::table('stores')->select('owner_user_id')->distinct()->orderBy('owner_user_id')
                ->each(function (object $ownerRow): void {
                    $owner = DB::table('users')->where('id', $ownerRow->owner_user_id)->first(['id', 'name']);

                    if ($owner === null) {
                        throw new RuntimeException("Store owner [{$ownerRow->owner_user_id}] does not exist.");
                    }

                    $businessIds = DB::table('stores')->where('owner_user_id', $owner->id)
                        ->whereNotNull('business_id')->distinct()->pluck('business_id');

                    if ($businessIds->count() > 1) {
                        throw new RuntimeException("Legacy owner [{$owner->id}] is already linked to multiple Businesses.");
                    }

                    $businessId = $businessIds->first();

                    if ($businessId === null) {
                        $businessName = DB::table('stores')->where('owner_user_id', $owner->id)
                            ->orderByRaw("CASE WHEN status = 'active' THEN 0 ELSE 1 END")
                            ->orderBy('id')->value('name') ?: $owner->name;
                        $businessId = DB::table('businesses')->insertGetId([
                            'public_id' => (string) Str::ulid(),
                            'name' => $businessName,
                            'status' => BusinessStatus::Active->value,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    DB::table('stores')->where('owner_user_id', $owner->id)->whereNull('business_id')
                        ->update(['business_id' => $businessId]);
                    $this->membershipId((int) $businessId, (int) $owner->id, $owner->name, BusinessRole::Owner);
                });

            DB::table('store_memberships')->whereNull('business_membership_id')->orderBy('id')
                ->eachById(function (object $assignment): void {
                    $store = DB::table('stores')->where('id', $assignment->store_id)
                        ->first(['business_id', 'owner_user_id']);

                    if ($store === null || $store->business_id === null) {
                        throw new RuntimeException("Store assignment [{$assignment->id}] has no resolved Business.");
                    }

                    if ($assignment->role === MembershipRole::Owner->value) {
                        if ((int) $assignment->user_id !== (int) $store->owner_user_id) {
                            throw new RuntimeException("Legacy owner assignment [{$assignment->id}] does not match the Store owner.");
                        }

                        DB::table('store_memberships')->where('id', $assignment->id)->delete();

                        return;
                    }

                    $role = match ($assignment->role) {
                        MembershipRole::Admin->value => MembershipRole::Manager->value,
                        MembershipRole::Cashier->value, MembershipRole::Manager->value => $assignment->role,
                        default => throw new RuntimeException("Unknown legacy Store role [{$assignment->role}]."),
                    };
                    $user = DB::table('users')->where('id', $assignment->user_id)->first(['id', 'name']);

                    if ($user === null) {
                        throw new RuntimeException("Store assignment user [{$assignment->user_id}] does not exist.");
                    }

                    $membershipId = $this->membershipId(
                        (int) $store->business_id,
                        (int) $user->id,
                        $user->name,
                        BusinessRole::Staff,
                    );
                    DB::table('store_memberships')->where('id', $assignment->id)->update([
                        'business_membership_id' => $membershipId,
                        'role' => $role,
                    ]);
                });

            if (DB::table('stores')->whereNull('business_id')->exists()) {
                throw new RuntimeException('Business tenancy backfill left Stores without a Business.');
            }

            if (DB::table('store_memberships')->whereNull('business_membership_id')->exists()) {
                throw new RuntimeException('Business tenancy backfill left Store assignments without a Business Membership.');
            }
        });
    }

    public function down(): void
    {
        DB::transaction(function (): void {
            DB::table('store_memberships')->where('role', MembershipRole::Manager->value)
                ->update(['role' => MembershipRole::Admin->value]);

            DB::table('stores')->orderBy('id')->each(function (object $store): void {
                $exists = DB::table('store_memberships')->where('store_id', $store->id)
                    ->where('user_id', $store->owner_user_id)->exists();

                if (! $exists) {
                    DB::table('store_memberships')->insert([
                        'store_id' => $store->id,
                        'user_id' => $store->owner_user_id,
                        'role' => MembershipRole::Owner->value,
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            });

            DB::table('store_memberships')->update(['business_membership_id' => null]);
            DB::table('stores')->update(['business_id' => null]);
            DB::table('business_memberships')->delete();
            DB::table('businesses')->delete();
        });
    }

    private function membershipId(int $businessId, int $userId, string $displayName, BusinessRole $role): int
    {
        $membership = DB::table('business_memberships')->where('business_id', $businessId)
            ->where('user_id', $userId)->first(['id', 'business_role']);

        if ($membership !== null) {
            if ($role === BusinessRole::Owner && $membership->business_role !== BusinessRole::Owner->value) {
                DB::table('business_memberships')->where('id', $membership->id)->update([
                    'business_role' => BusinessRole::Owner->value,
                    'updated_at' => now(),
                ]);
            }

            return (int) $membership->id;
        }

        return DB::table('business_memberships')->insertGetId([
            'public_id' => (string) Str::ulid(),
            'business_id' => $businessId,
            'user_id' => $userId,
            'display_name' => $displayName,
            'business_role' => $role->value,
            'status' => 'active',
            'joined_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
