<?php

namespace App\Support\Authentication;

use App\Models\User;

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

        return [
            'token' => $newToken->plainTextToken,
            'device_id' => $deviceId,
            'abilities' => $abilities,
            'user' => [
                'public_id' => $user->public_id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'offline_lease' => OfflineLease::issue(),
        ];
    }
}
