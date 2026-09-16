<?php

namespace App\Actions\Businesses;

use App\Actions\Audit\RecordAudit;
use App\Enums\BusinessRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\UserStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Store;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionAccess;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CreateBusinessMember
{
    public function __construct(
        private SubscriptionAccess $subscriptions,
        private RecordAudit $audit,
    ) {}

    /** @param array{display_name:string,role:string,store_ids?:list<string>,pin:?string,personal_device_access:bool,email:?string} $data */
    public function handle(Business $business, BusinessMembership $actor, array $data, ?string $ipAddress): BusinessMembership
    {
        $this->authorize($business, $actor);

        return DB::transaction(function () use ($business, $actor, $data, $ipAddress): BusinessMembership {
            $lockedBusiness = Business::query()->lockForUpdate()->findOrFail($business->id);
            $this->subscriptions->assertBusinessMemberCapacity($lockedBusiness);
            $personalAccess = (bool) $data['personal_device_access'];
            $email = filled($data['email'] ?? null) ? mb_strtolower(trim((string) $data['email'])) : null;
            if ($personalAccess && $email === null) {
                throw ValidationException::withMessages(['email' => __('An email address is required for personal device access.')]);
            }
            if (! $personalAccess && ! preg_match('/^\d{6}$/', (string) ($data['pin'] ?? ''))) {
                throw ValidationException::withMessages(['pin' => __('The PIN must contain exactly six digits.')]);
            }
            if ($email !== null && User::query()->where('email', $email)->exists()) {
                throw ValidationException::withMessages(['email' => __('The email has already been taken.')]);
            }

            $role = $data['role'];
            $businessRole = $role === 'admin' ? BusinessRole::Admin : BusinessRole::Staff;
            $stores = $this->stores($lockedBusiness, $data['store_ids'] ?? []);
            if ($businessRole === BusinessRole::Staff && $stores->isEmpty()) {
                throw ValidationException::withMessages(['store_ids' => __('Select at least one Store assignment.')]);
            }
            $user = $personalAccess ? User::create([
                'name' => $data['display_name'], 'email' => $email,
                'password' => Str::password(48), 'status' => UserStatus::Active,
            ]) : null;
            $member = BusinessMembership::create([
                'business_id' => $lockedBusiness->id,
                'user_id' => $user?->id,
                'display_name' => $data['display_name'],
                'business_role' => $businessRole,
                'status' => $personalAccess ? MembershipStatus::Invited : MembershipStatus::Active,
                'pos_pin_hash' => filled($data['pin'] ?? null) ? Hash::make($data['pin']) : null,
                'pin_changed_at' => filled($data['pin'] ?? null) ? now() : null,
                'invited_at' => $personalAccess ? now() : null,
                'joined_at' => $personalAccess ? null : now(),
            ]);
            if ($businessRole === BusinessRole::Staff) {
                foreach ($stores as $store) {
                    $member->stores()->attach($store->id, [
                        'role' => $role === 'manager' ? MembershipRole::Manager : MembershipRole::Cashier,
                        'status' => MembershipStatus::Active,
                    ]);
                }
            }

            $this->audit->handle($actor, 'business.member_created', $member, $stores->first(), $ipAddress, [
                'membership_public_id' => $member->public_id,
                'role' => $role,
                'store_public_ids' => $stores->pluck('public_id')->all(),
                'personal_device_access' => $personalAccess,
            ]);
            if ($personalAccess) {
                $this->audit->handle($actor, 'business.member_invitation_sent', $member, $stores->first(), $ipAddress, [
                    'membership_public_id' => $member->public_id,
                    'role' => $role,
                    'store_public_ids' => $stores->pluck('public_id')->all(),
                ]);
            }

            return $member->load(['user', 'stores']);
        }, 3);
    }

    private function authorize(Business $business, BusinessMembership $actor): void
    {
        abort_unless($actor->business_id === $business->id
            && $actor->status === MembershipStatus::Active
            && in_array($actor->business_role, [BusinessRole::Owner, BusinessRole::Admin], true), 403);
    }

    /**
     * @param  list<string>  $publicIds
     * @return Collection<int, Store>
     */
    private function stores(Business $business, array $publicIds): Collection
    {
        $stores = Store::query()->where('business_id', $business->id)->whereIn('public_id', $publicIds)->get();
        if ($stores->count() !== count(array_unique($publicIds))) {
            throw ValidationException::withMessages(['store_ids' => __('One or more selected Stores are invalid.')]);
        }

        return $stores;
    }
}
