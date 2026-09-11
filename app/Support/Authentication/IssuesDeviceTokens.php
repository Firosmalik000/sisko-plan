<?php

namespace App\Support\Authentication;

use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Penerbitan Sanctum token per-perangkat dengan envelope respons konsisten
 * (design §3.3). Dipakai bersama oleh login email/password dan login sosial
 * agar tidak menduplikasi logika token + offline lease (DRY, Req 22).
 */
trait IssuesDeviceTokens
{
    /**
     * Terbitkan token untuk user pada perangkat tertentu dan rakit payload
     * respons standar (token, device_id, abilities, user, offline_lease).
     *
     * @return array<string, mixed>
     */
    protected function issueDeviceTokenPayload(User $user, string $deviceId, ?string $deviceName): array
    {
        $abilities = TokenAbilities::forUser($user);

        $newToken = $user->createToken(
            name: $deviceName ?? $deviceId,
            abilities: $abilities === [] ? ['*'] : $abilities,
        );

        $newToken->accessToken->forceFill([
            'device_id' => $deviceId,
        ])->save();

        $grantedAt = Carbon::now();
        $ttlSeconds = (int) config('mobile.offline_lease_seconds');
        $expiresAt = $grantedAt->copy()->addSeconds($ttlSeconds);

        return [
            'token' => $newToken->plainTextToken,
            'device_id' => $deviceId,
            'abilities' => $abilities,
            'user' => [
                'public_id' => $user->public_id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'offline_lease' => [
                'granted_at' => $grantedAt->toIso8601ZuluString(),
                'expires_at' => $expiresAt->toIso8601ZuluString(),
                'ttl_seconds' => $ttlSeconds,
            ],
        ];
    }
}
