<?php

namespace App\Support;

use App\Models\Marketplace;
use App\Services\Commerce\CountryCommerceCatalog;

class MarketplaceCatalog
{
    /** @return array<int, array{code:string, label:string}> */
    public static function forCountry(?string $countryCode): array
    {
        return app(CountryCommerceCatalog::class)->marketplacesForCountry($countryCode)
            ->map(fn (Marketplace $marketplace): array => ['code' => $marketplace->code, 'label' => $marketplace->label])->all();
    }

    /** @return array<int, string> */
    public static function codesForCountry(?string $countryCode): array
    {
        return array_column(self::forCountry($countryCode), 'code');
    }

    public static function label(?string $countryCode, string $code): ?string
    {
        foreach (self::forCountry($countryCode) as $marketplace) {
            if ($marketplace['code'] === $code) {
                return $marketplace['label'];
            }
        }

        return null;
    }
}
