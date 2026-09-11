<?php

namespace App\Support\Authentication;

use Illuminate\Support\Carbon;

/**
 * Offline lease payload untuk Api_V1 (design §5.4, D-005, Req 6.2).
 *
 * Lease dikirim saat login (token) dan saat bootstrap. TTL berasal dari
 * `config/mobile.php` (configurable server-side, bukan konstanta tersebar di
 * klien). Satu tempat perakitan agar login & bootstrap konsisten (DRY).
 */
final class OfflineLease
{
    /**
     * Rakit payload lease relatif terhadap "now".
     *
     * @return array{granted_at:string,expires_at:string,ttl_seconds:int}
     */
    public static function issue(): array
    {
        $grantedAt = Carbon::now();
        $ttlSeconds = (int) config('mobile.offline_lease_seconds');
        $expiresAt = $grantedAt->copy()->addSeconds($ttlSeconds);

        return [
            'granted_at' => $grantedAt->toIso8601ZuluString(),
            'expires_at' => $expiresAt->toIso8601ZuluString(),
            'ttl_seconds' => $ttlSeconds,
        ];
    }
}
