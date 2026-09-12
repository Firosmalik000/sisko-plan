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
        return [self::ENGLISH, self::MALAYSIA, self::INDONESIA, self::VIETNAM];
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
        $header = (string) config('localization.country_header', 'CF-IPCountry');
        $country = strtoupper(trim((string) $request->header($header)));

        return match ($country) {
            'ID' => self::INDONESIA,
            'MY' => self::MALAYSIA,
            'VN' => self::VIETNAM,
            default => self::ENGLISH,
        };
    }

    public static function market(Request $request): string
    {
        $market = $request->session()->get('market');
        if (in_array($market, [self::INDONESIA, self::MALAYSIA, self::VIETNAM], true)) {
            return $market;
        }

        $locale = $request->session()->get('locale', config('app.locale', self::INDONESIA));

        return match ($locale) {
            self::MALAYSIA => self::MALAYSIA,
            self::VIETNAM => self::VIETNAM,
            default => self::INDONESIA,
        };
    }

    /** @return list<array{code:string,label:string}> */
    public static function options(Request $request): array
    {
        return [
            ['code' => self::ENGLISH, 'label' => 'English'],
            ['code' => self::MALAYSIA, 'label' => 'Bahasa Melayu'],
            ['code' => self::INDONESIA, 'label' => 'Bahasa Indonesia'],
            ['code' => self::VIETNAM, 'label' => 'Tiếng Việt'],
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
}
