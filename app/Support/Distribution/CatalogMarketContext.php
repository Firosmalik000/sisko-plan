<?php

namespace App\Support\Distribution;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * Resolusi market context untuk katalog distribusi (design §3.2, §11, Req 20.1).
 *
 * Prioritas: query `?market=` → header `X-Market` → negara toko aktif user
 * (membership aktif pertama) → default `ID`. Market dinormalisasi ke kode
 * ISO-3166 alpha-2 uppercase. Endpoint distribusi TIDAK store-scoped sehingga
 * market bersumber dari request/profil, bukan route store.
 */
final class CatalogMarketContext
{
    public const DEFAULT_MARKET = 'ID';

    public static function resolve(Request $request): string
    {
        $candidate = $request->query('market')
            ?? $request->header('X-Market')
            ?? self::marketFromUser($request->user());

        $market = strtoupper(trim((string) ($candidate ?? '')));

        return preg_match('/^[A-Z]{2}$/', $market) === 1
            ? $market
            : self::DEFAULT_MARKET;
    }

    private static function marketFromUser(?User $user): ?string
    {
        if ($user === null) {
            return null;
        }

        $store = $user->activeStores()->with('country')->first();

        return $store?->country?->code;
    }
}
