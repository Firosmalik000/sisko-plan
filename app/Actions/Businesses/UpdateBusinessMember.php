<?php

namespace App\Actions\Businesses;

use App\Actions\Audit\RecordAudit;
use App\Enums\BusinessRole;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Store;
use App\Services\Subscriptions\SubscriptionAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UpdateBusinessMember
{
    public function __construct(
        private SubscriptionAccess $subscriptions,
        private RecordAudit $audit,
    ) {}

    /** @param array{display_name:string,role:string,status:string,store_ids?:list<string>,pin:?string} $data */
    public function handle(Business $business, BusinessMembership $actor, BusinessMembership $target, array $data, ?string $ipAddress): BusinessMembership
    {
        abort_unless($actor->business_id === $business->id && $target->business_id === $business->id
            && $actor->status === MembershipStatus::Active
            && in_array($actor->business_role, [BusinessRole::Owner, BusinessRole::Admin], true), 403);

        return DB::transaction(function () use ($business, $actor, $target, $data, $ipAddress): BusinessMembership {
            Business::query()->whereKey($business->id)->lockForUpdate()->firstOrFail();
            $locked = BusinessMembership::query()->whereKey($target->id)->lockForUpdate()->firstOrFail();
            $nextStatus = MembershipStatus::from($data['status']);
            $nextBusinessRole = $data['role'] === 'admin' ? BusinessRole::Admin : ($data['role'] === 'owner' ? BusinessRole::Owner : BusinessRole::Staff);

            if ($locked->business_role === BusinessRole::Owner
                && ($nextBusinessRole !== BusinessRole::Owner || $nextStatus !== MembershipStatus::Active)
                && ! $business->memberships()->whereKeyNot($locked->id)->where('business_role', BusinessRole::Owner->value)
                    ->where('status', MembershipStatus::Active->value)->exists()) {
                throw ValidationException::withMessages(['status' => __('The last active Business owner cannot be suspended or demoted.')]);
            }
            if ($nextStatus === MembershipStatus::Active && $locked->status !== MembershipStatus::Active
                && $nextBusinessRole !== BusinessRole::Owner) {
                $this->subscriptions->assertBusinessMemberCapacity($business, $locked->id);
            }

            $storeIds = $data['store_ids'] ?? [];
            $stores = Store::query()->where('business_id', $business->id)->whereIn('public_id', $storeIds)->get();
            if ($stores->count() !== count(array_unique($storeIds))) {
                throw ValidationException::withMessages(['store_ids' => __('One or more selected Stores are invalid.')]);
            }
            if ($nextBusinessRole === BusinessRole::Staff && $stores->isEmpty()) {
                throw ValidationException::withMessages(['store_ids' => __('Select at least one Store assignment.')]);
            }

            $before = ['role' => $locked->business_role->value, 'status' => $locked->status->value];
            $beforeStoreIds = $locked->stores()->pluck('stores.public_id')->sort()->values()->all();
            $attributes = [
                'display_name' => $data['display_name'], 'business_role' => $nextBusinessRole, 'status' => $nextStatus,
            ];
            if (filled($data['pin'] ?? null)) {
                if (! preg_match('/^\d{6}$/', (string) $data['pin'])) {
                    throw ValidationException::withMessages(['pin' => __('The PIN must contain exactly six digits.')]);
                }
                $attributes['pos_pin_hash'] = Hash::make($data['pin']);
                $attributes['pin_changed_at'] = now();
            }
            $locked->update($attributes);
            $locked->stores()->detach();
            if ($nextBusinessRole === BusinessRole::Staff) {
                foreach ($stores as $store) {
                    $locked->stores()->attach($store->id, [
                        'role' => $data['role'] === 'manager' ? MembershipRole::Manager : MembershipRole::Cashier,
                        'status' => MembershipStatus::Active,
                    ]);
                }
            }
            $this->audit->handle($actor, 'business.member_updated', $locked, $stores->first(), $ipAddress, [
                'membership_public_id' => $locked->public_id,
                'before' => $before,
                'role' => $data['role'], 'status' => $nextStatus->value,
                'store_public_ids' => $stores->pluck('public_id')->all(),
                'pin_reset' => filled($data['pin'] ?? null),
            ]);
            $safeMetadata = [
                'membership_public_id' => $locked->public_id,
                'role' => $data['role'],
                'store_public_ids' => $stores->pluck('public_id')->sort()->values()->all(),
            ];
            if ($before['role'] !== $nextBusinessRole->value) {
                $this->audit->handle($actor, 'business.member_role_changed', $locked, $stores->first(), $ipAddress, $safeMetadata);
            }
            if ($before['status'] !== $nextStatus->value) {
                $this->audit->handle($actor, $nextStatus === MembershipStatus::Active
                    ? 'business.member_reactivated' : 'business.member_suspended', $locked, $stores->first(), $ipAddress, $safeMetadata);
            }
            if ($beforeStoreIds !== $safeMetadata['store_public_ids']) {
                $this->audit->handle($actor, 'business.member_assignments_changed', $locked, $stores->first(), $ipAddress, $safeMetadata);
            }
            if (filled($data['pin'] ?? null)) {
                $this->audit->handle($actor, 'business.member_pin_reset', $locked, $stores->first(), $ipAddress, $safeMetadata);
            }

            return $locked->fresh(['user', 'stores']);
        }, 3);
    }
}
