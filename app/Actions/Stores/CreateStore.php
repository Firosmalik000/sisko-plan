<?php

namespace App\Actions\Stores;

use App\Actions\Audit\RecordAudit;
use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Store;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionAccess;
use Illuminate\Support\Facades\DB;

class CreateStore
{
    public function __construct(
        private RecordAudit $recordAudit,
        private StartDefaultSubscription $subscriptions,
        private SubscriptionAccess $subscriptionAccess,
        private SeedStoreStarterData $starterData,
    ) {}

    public function handle(User $owner, string $name, ?string $ipAddress = null): Store
    {
        return DB::transaction(function () use ($owner, $name, $ipAddress): Store {
            $this->subscriptionAccess->assertStoreCapacity($owner);

            $store = Store::create([
                'owner_user_id' => $owner->id,
                'name' => $name,
            ]);

            $store->users()->attach($owner->id, [
                'role' => MembershipRole::Owner->value,
                'status' => MembershipStatus::Active->value,
            ]);
            $store->settings()->create();
            $this->starterData->handle($store);
            $this->subscriptions->handle($store);
            $this->recordAudit->handle($owner, 'store.created', $store, $store, $ipAddress);

            return $store;
        });
    }
}
