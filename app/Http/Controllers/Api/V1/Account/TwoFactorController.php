<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Actions\ConfirmTwoFactorAuthentication;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use Laravel\Fortify\Features;

/**
 * Kelola autentikasi dua faktor (Req 26.2, 26.3) untuk Api/V1. REUSE Fortify
 * actions Enable/Confirm/Disable + trait `TwoFactorAuthenticatable` (secret/QR/
 * recovery). `enable` menghasilkan secret + QR + recovery code (belum aktif hingga
 * dikonfirmasi); `confirm` memvalidasi kode TOTP; `disable` menonaktifkan. Secret &
 * recovery code TIDAK di-log (redaksi global) dan hanya dikembalikan sekali saat
 * enable. Disable butuh konfirmasi kata sandi (middleware/route Fortify) — di sini
 * kata sandi divalidasi eksplisit.
 */
class TwoFactorController
{
    public function enable(Request $request, EnableTwoFactorAuthentication $enable): JsonResponse
    {
        $user = $request->user();
        $enable($user, true);
        $user->refresh();

        return ApiResponse::success([
            'secret' => decrypt($user->two_factor_secret),
            'qr_svg' => $user->twoFactorQrCodeSvg(),
            'recovery_codes' => $user->recoveryCodes(),
            'confirmed' => $user->two_factor_confirmed_at !== null,
        ], status: 201);
    }

    public function confirm(Request $request, ConfirmTwoFactorAuthentication $confirm): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
        ]);

        $confirm($request->user(), $validated['code']);

        return ApiResponse::success([
            'confirmed' => $request->user()->fresh()->two_factor_confirmed_at !== null,
        ]);
    }

    public function disable(Request $request, DisableTwoFactorAuthentication $disable): JsonResponse
    {
        // Menonaktifkan 2FA memerlukan konfirmasi kata sandi (Req 26.3).
        $request->validate([
            'password' => ['required', 'string', 'current_password'],
        ]);

        if (! Features::canManageTwoFactorAuthentication()) {
            throw ValidationException::withMessages(['two_factor' => 'Fitur 2FA tidak tersedia.']);
        }

        $disable($request->user());

        return ApiResponse::success(['enabled' => false]);
    }
}
