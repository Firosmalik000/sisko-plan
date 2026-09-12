<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\UserStatus;
use App\Http\Requests\Api\V1\Auth\TwoFactorChallengeRequest;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Support\Authentication\IssuesDeviceTokens;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;

/**
 * POST /auth/two-factor/challenge — selesaikan tantangan 2FA saat login (Req 6.1, 6.2).
 *
 * Controller tipis: verifikasi kredensial lagi (konteks challenge dibawa klien
 * sebagai email+password) lalu validasi kode authenticator ATAU recovery code
 * via provider Fortify existing. Sukses → terbitkan Sanctum token per-perangkat.
 * Kode salah tidak memaksa login ulang; klien mempertahankan konteks (Req 6.2).
 */
class TwoFactorChallengeController
{
    use IssuesDeviceTokens;

    public function __invoke(
        TwoFactorChallengeRequest $request,
        TwoFactorAuthenticationProvider $provider,
    ): JsonResponse {
        $validated = $request->validated();

        /** @var User|null $user */
        $user = User::query()->where('email', $validated['email'])->first();

        $passwordMatches = $user !== null
            ? Hash::check($validated['password'], $user->password)
            : Hash::check($validated['password'], '$2y$12$'.str_repeat('.', 53));

        if ($user === null || ! $passwordMatches
            || $user->status !== UserStatus::Active || $user->isPlatformAdmin()) {
            return ApiResponse::error(
                code: 'INVALID_CREDENTIALS',
                message: __('auth.failed'),
                fields: ['email' => [__('auth.failed')]],
                status: 422,
            );
        }

        if ($user->two_factor_secret === null) {
            return ApiResponse::error(
                code: 'TWO_FACTOR_NOT_ENABLED',
                message: __('Two-factor authentication is not enabled.'),
                status: 422,
            );
        }

        if (! $this->passesChallenge($user, $provider, $validated)) {
            return ApiResponse::error(
                code: 'INVALID_TWO_FACTOR_CODE',
                message: __('The provided two-factor authentication code was invalid.'),
                fields: ['code' => [__('The provided code was invalid.')]],
                status: 422,
            );
        }

        return ApiResponse::success($this->issueDeviceTokenPayload(
            $user,
            $validated['device_id'],
            $validated['device_name'] ?? null,
        ));
    }

    /**
     * Validasi kode authenticator (6 digit) atau salah satu recovery code.
     * Recovery code yang terpakai dikonsumsi (di-replace) agar sekali pakai.
     *
     * @param  array<string, mixed>  $validated
     */
    private function passesChallenge(
        User $user,
        TwoFactorAuthenticationProvider $provider,
        array $validated,
    ): bool {
        $code = isset($validated['code']) && is_string($validated['code']) ? $validated['code'] : null;
        $recovery = isset($validated['recovery_code']) && is_string($validated['recovery_code'])
            ? $validated['recovery_code']
            : null;

        if ($code !== null && $provider->verify(decrypt($user->two_factor_secret), $code)) {
            return true;
        }

        if ($recovery !== null && $user->two_factor_recovery_codes !== null) {
            /** @var list<string> $codes */
            $codes = json_decode(decrypt($user->two_factor_recovery_codes), true) ?: [];

            if (in_array($recovery, $codes, true)) {
                $user->replaceRecoveryCode($recovery);

                return true;
            }
        }

        return false;
    }
}
