<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

final class LocaleContext
{
    public const ENGLISH = 'en';

    public const INDONESIA = 'id';

    public const MALAYSIA = 'ms';

    public const VIETNAM = 'vi';

    /** @return list<string> */
    public static function allowedLocales(Request $request, ?bool $customerPortal = null): array
    {
        return ['en', 'id', 'ms', 'vi', 'th', 'fil', 'km', 'lo', 'my', 'tet'];
    }

    public static function locale(Request $request): string
    {
        $locale = $request->session()->get('locale');

        return is_string($locale) && in_array($locale, self::allowedLocales($request), true)
            ? $locale
            : self::localeFromCountry($request);
    }

    public static function localeFromCountry(Request $request): string
    {
        return (string) (config('localization.countries.'.self::countryFromRequest($request).'.locale') ?? self::ENGLISH);
    }

    public static function market(Request $request): string
    {
        $market = strtoupper(trim((string) $request->session()->get('market')));
        if (array_key_exists($market, config('localization.countries', []))) {
            return $market;
        }

        $country = self::countryFromRequest($request);

        return array_key_exists($country, config('localization.countries', [])) ? $country : 'ID';
    }

    /** @return list<array{code:string,label:string}> */
    public static function options(Request $request): array
    {
        return [
            ['code' => self::ENGLISH, 'label' => 'English'],
            ['code' => self::INDONESIA, 'label' => 'Bahasa Indonesia'],
            ['code' => self::MALAYSIA, 'label' => 'Bahasa Melayu'],
            ['code' => self::VIETNAM, 'label' => 'Tiếng Việt'],
            ['code' => 'th', 'label' => 'ไทย'],
            ['code' => 'fil', 'label' => 'Filipino'],
            ['code' => 'km', 'label' => 'ភាសាខ្មែរ'],
            ['code' => 'lo', 'label' => 'ພາສາລາວ'],
            ['code' => 'my', 'label' => 'မြန်မာဘာသာ'],
            ['code' => 'tet', 'label' => 'Tetum'],
        ];
    }

    public static function isCustomerPortal(Request $request): bool
    {
        if ($request->routeIs('home', 'pricing')) {
            return false;
        }

        return self::isCustomerAccount($request);
    }

    public static function isCustomerAccount(Request $request): bool
    {
        $user = $request->user();

        return $user instanceof User && ! $user->isPlatformAdmin();
    }

    private static function countryFromRequest(Request $request): string
    {
        $header = (string) config('localization.country_header', 'CF-IPCountry');

        return strtoupper(trim((string) $request->header($header)));
    }
}
