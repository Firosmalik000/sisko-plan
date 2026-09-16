<?php

namespace App\Actions\Stores;

use App\Actions\Audit\RecordAudit;
use App\Actions\Subscriptions\StartDefaultSubscription;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\Country;
use App\Models\Store;
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
        Business $business,
        BusinessMembership $actor,
        string $name,
        ?string $ipAddress,
        string $countryCode,
        ?string $address = null,
        ?string $timezone = null,
    ): Store {
        return DB::transaction(function () use ($business, $actor, $name, $ipAddress, $countryCode, $address, $timezone): Store {
            abort_unless($actor->business_id === $business->id && $actor->user !== null, 403);
            $this->subscriptionAccess->assertStoreCapacity($business);
            $country = Country::query()
                ->with('currency')
                ->where('code', $countryCode)
                ->where('is_active', true)
                ->sharedLock()
                ->first();
            if ($country === null) {
                throw ValidationException::withMessages([
                    'country' => __('Selected country is unavailable.'),
                ]);
            }

            $store = Store::create([
                'business_id' => $business->id,
                'country_id' => $country->id,
                'name' => $name,
            ]);

            $store->settings()->create([
                'currency' => $country->currency_code,
                'timezone' => $timezone ?? $country->default_timezone,
                'address' => $address,
            ]);
            $this->starterData->handle($store);
            $this->subscriptions->handle($business);
            $this->recordAudit->handle($actor->user, 'store.created', $store, $store, $ipAddress, [
                'country' => $country->code,
                'currency' => $country->currency_code,
                'timezone' => $timezone ?? $country->default_timezone,
            ]);

            return $store;
        });
    }
}
