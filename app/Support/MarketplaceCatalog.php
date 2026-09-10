<?php

namespace App\Support;

class MarketplaceCatalog
{
    /** @return array<int, array{code:string, label:string}> */
    public static function forCountry(?string $countryCode): array
    {
        $marketplaces = config('sales.marketplaces', []);
        $configured = $marketplaces[strtoupper((string) $countryCode)] ?? $marketplaces['default'] ?? [];

        return array_values(array_filter($configured, fn (mixed $marketplace): bool => is_array($marketplace)
            && is_string($marketplace['code'] ?? null)
            && is_string($marketplace['label'] ?? null)
        ));
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
