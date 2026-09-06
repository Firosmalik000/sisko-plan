<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

final class LocaleContext
{
    public const ENGLISH = 'en';

    public const INDONESIA = 'id';

    public const MALAYSIA = 'ms';

    /** @return list<string> */
    public static function allowedLocales(Request $request, ?bool $customerPortal = null): array
    {
        return ($customerPortal ?? self::isCustomerPortal($request))
            ? [self::market($request), self::ENGLISH]
            : [self::INDONESIA, self::MALAYSIA];
    }

    public static function locale(Request $request): string
    {
        $locale = $request->session()->get('locale');

        return is_string($locale) && in_array($locale, self::allowedLocales($request), true)
            ? $locale
            : self::market($request);
    }

    public static function market(Request $request): string
    {
        $market = $request->session()->get('market');
        if (in_array($market, [self::INDONESIA, self::MALAYSIA], true)) {
            return $market;
        }

        $locale = $request->session()->get('locale', config('app.locale', self::INDONESIA));

        return $locale === self::MALAYSIA ? self::MALAYSIA : self::INDONESIA;
    }

    /** @return list<array{code:string,label:string}> */
    public static function options(Request $request): array
    {
        if (! self::isCustomerPortal($request)) {
            return [
                ['code' => self::INDONESIA, 'label' => 'Indonesia'],
                ['code' => self::MALAYSIA, 'label' => 'Melayu'],
            ];
        }

        return self::market($request) === self::MALAYSIA
            ? [
                ['code' => self::MALAYSIA, 'label' => 'Bahasa Melayu'],
                ['code' => self::ENGLISH, 'label' => 'English'],
            ]
            : [
                ['code' => self::INDONESIA, 'label' => 'Bahasa Indonesia'],
                ['code' => self::ENGLISH, 'label' => 'English'],
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
