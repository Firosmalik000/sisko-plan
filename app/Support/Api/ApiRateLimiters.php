<?php

namespace App\Support\Api;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Named rate limiter untuk API mobile `/api/v1` (Req 23.4, design §16).
 *
 * Satu tempat mendefinisikan limiter berbasis (user, device, store, endpoint,
 * tingkat risiko) — DRY, tidak tersebar di route. Kunci limiter menggabungkan
 * identitas user + device + store agar isolasi antar-perangkat & antar-toko:
 * satu perangkat yang menyalahi tidak menghukum perangkat lain milik user sama.
 *
 * Tingkat risiko:
 * - `api-auth`  : penerbitan token (brute force) → paling ketat, di-key per IP+device.
 * - `api-sync`  : pull/push sinkronisasi → sedang.
 * - `api-sales` : posting penjualan → sedang.
 * - `api-read`  : bootstrap/produk/notifikasi/scanner read → paling longgar.
 *
 * Limiter melampaui ambang → 429 yang dipetakan `ApiExceptionMapper` menjadi
 * envelope `RATE_LIMITED` dengan `retryable=true`.
 */
class ApiRateLimiters
{
    /**
     * Daftarkan seluruh named limiter API mobile.
     */
    public static function register(): void
    {
        // Ambang dibaca lazy di dalam closure (bukan di-capture) agar override
        // config runtime/test langsung berlaku.
        RateLimiter::for('api-auth', static fn (Request $request): Limit => Limit::perMinute(
            self::perMinute('auth_per_minute', 10),
        )->by(self::unauthenticatedKey($request, 'auth')));

        RateLimiter::for('api-sync', static fn (Request $request): Limit => Limit::perMinute(
            self::perMinute('sync_per_minute', 60),
        )->by(self::authenticatedKey($request, 'sync')));

        RateLimiter::for('api-sales', static fn (Request $request): Limit => Limit::perMinute(
            self::perMinute('sales_per_minute', 60),
        )->by(self::authenticatedKey($request, 'sales')));

        RateLimiter::for('api-read', static fn (Request $request): Limit => Limit::perMinute(
            self::perMinute('read_per_minute', 120),
        )->by(self::authenticatedKey($request, 'read')));
    }

    private static function perMinute(string $key, int $default): int
    {
        return (int) config("security.api_rate_limits.{$key}", $default);
    }

    /**
     * Kunci untuk endpoint terautentikasi: user + device + store + endpoint.
     * Store diambil dari route param `{store}` (public_id) bila ada.
     */
    private static function authenticatedKey(Request $request, string $bucket): string
    {
        $user = $request->user();
        $userKey = $user !== null ? 'u:'.$user->getAuthIdentifier() : 'ip:'.$request->ip();

        $token = $user?->currentAccessToken();
        $deviceId = is_object($token) && isset($token->device_id) && is_string($token->device_id) && $token->device_id !== ''
            ? $token->device_id
            : 'no-device';

        $storeParam = $request->route('store');
        $storeKey = is_object($storeParam) && isset($storeParam->public_id)
            ? (string) $storeParam->public_id
            : (is_string($storeParam) ? $storeParam : 'no-store');

        return implode('|', [$bucket, $userKey, 'd:'.$deviceId, 's:'.$storeKey]);
    }

    /**
     * Kunci untuk endpoint tak terautentikasi (penerbitan token): IP + device +
     * email bila ada — mencegah brute force lintas kredensial pada satu perangkat.
     */
    private static function unauthenticatedKey(Request $request, string $bucket): string
    {
        $deviceId = $request->input('device_id');
        $deviceKey = is_string($deviceId) && $deviceId !== '' ? $deviceId : 'no-device';

        $email = $request->input('email');
        $emailKey = is_string($email) && $email !== '' ? mb_strtolower($email) : 'no-email';

        return implode('|', [$bucket, 'ip:'.$request->ip(), 'd:'.$deviceKey, 'e:'.$emailKey]);
    }
}
