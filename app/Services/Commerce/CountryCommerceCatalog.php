<?php

namespace App\Services\Commerce;

use App\Models\Country;
use App\Models\Marketplace;
use App\Models\PaymentMethod;
use App\Models\Store;
use Illuminate\Database\Eloquent\Collection;

class CountryCommerceCatalog
{
    /** @return Collection<int, PaymentMethod> */
    public function paymentMethods(Country $country): Collection
    {
        return PaymentMethod::query()->where('is_active', true)
            ->join('country_payment_method', function ($join) use ($country): void {
                $join->on('country_payment_method.payment_method_id', '=', 'payment_methods.id')
                    ->where('country_payment_method.country_id', $country->id);
            })
            ->where('country_payment_method.is_enabled', true)
            ->orderBy('country_payment_method.priority')->get('payment_methods.*');
    }

    /** @return Collection<int, Marketplace> */
    public function marketplaces(Store $store): Collection
    {
        $disabled = $store->marketplaces()->wherePivot('is_enabled', false)->pluck('marketplaces.id');

        return $this->marketplacesForCountry($store->country?->code)->whereNotIn('id', $disabled)->values();
    }

    /** @return Collection<int, Marketplace> */
    public function marketplacesForCountry(?string $countryCode): Collection
    {
        $country = Country::query()->where('code', strtoupper((string) $countryCode))->first();
        if ($country === null) {
            return new Collection;
        }

        return Marketplace::query()->where('is_active', true)
            ->join('country_marketplace', function ($join) use ($country): void {
                $join->on('country_marketplace.marketplace_id', '=', 'marketplaces.id')
                    ->where('country_marketplace.country_id', $country->id);
            })
            ->where('country_marketplace.is_enabled', true)
            ->orderBy('country_marketplace.priority')->get('marketplaces.*');
    }
}
