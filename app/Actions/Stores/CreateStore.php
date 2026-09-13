<?php

namespace App\Actions\Stores;

use App\Actions\Audit\RecordAudit;
use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Country;
use App\Models\Store;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateStore
{
    public function __construct(
        private RecordAudit $recordAudit,
        private StartDefaultSubscription $subscriptions,
        private SubscriptionAccess $subscriptionAccess,
        private SeedStoreStarterData $starterData,
    ) {}

    public function handle(
        User $owner,
        string $name,
        ?string $ipAddress = null,
        ?string $countryCode = null,
        ?string $address = null,
        ?string $timezone = null,
    ): Store {
        return DB::transaction(function () use ($owner, $name, $ipAddress, $countryCode, $address, $timezone): Store {
            $this->subscriptionAccess->assertStoreCapacity($owner);
            $country = Country::query()
                ->with('currency')
                ->where('code', $countryCode ?? 'ID')
                ->where('is_active', true)
                ->sharedLock()
                ->first();
            if ($country === null) {
                throw ValidationException::withMessages([
                    'country' => __('Selected country is unavailable.'),
                ]);
            }

            $store = Store::create([
                'owner_user_id' => $owner->id,
                'country_id' => $country->id,
                'name' => $name,
            ]);

            $store->users()->attach($owner->id, [
                'role' => MembershipRole::Owner->value,
                'status' => MembershipStatus::Active->value,
            ]);
            $store->settings()->create([
                'currency' => $country->currency_code,
                'timezone' => $timezone ?? $country->default_timezone,
                'address' => $address,
            ]);
            $this->starterData->handle($store);
            $this->subscriptions->handle($store);
            $this->recordAudit->handle($owner, 'store.created', $store, $store, $ipAddress, [
                'country' => $country->code,
                'currency' => $country->currency_code,
                'timezone' => $timezone ?? $country->default_timezone,
            ]);

            return $store;
        });
    }
}
