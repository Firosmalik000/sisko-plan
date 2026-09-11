<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\UserStatus;
use App\Http\Requests\Api\V1\Auth\IssueTokenRequest;
use App\Http\Responses\ApiResponse;
use App\Models\User;
use App\Support\Authentication\IssuesDeviceTokens;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Penerbitan & pencabutan Sanctum token per-perangkat untuk Api_V1 (Req 2, design §3.3).
 *
 * Controller tipis: validasi + verifikasi kredensial + serialisasi. Penerbitan
 * token + offline lease dibagikan via IssuesDeviceTokens (DRY).
 */
class TokenController
{
    use IssuesDeviceTokens;

    /**
     * POST /auth/tokens — login email/password, terbitkan token per-device.
     */
    public function store(IssueTokenRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var User|null $user */
        $user = User::query()
            ->where('email', $validated['email'])
            ->first();

        // Pesan generik + Hash::check terhadap hash dummy bila user tidak ada
        // agar tidak membocorkan keberadaan email (enumeration guard).
        $passwordMatches = $user !== null
            ? Hash::check($validated['password'], $user->password)
            : Hash::check($validated['password'], '$2y$12$'.str_repeat('.', 53));

        if ($user === null || ! $passwordMatches) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        // Akun harus aktif; platform admin tidak login via app merchant (Req 5.5).
        if ($user->status !== UserStatus::Active || $user->isPlatformAdmin()) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        return ApiResponse::success($this->issueDeviceTokenPayload(
            $user,
            $validated['device_id'],
            $validated['device_name'] ?? null,
        ));
    }

    /**
     * DELETE /auth/tokens/current — logout: cabut token perangkat saat ini (Req 2.4).
     *
     * TODO(task 9.1): saat tabel `devices` tersedia, cabut juga registrasi push
     * (FCM/APNs) milik perangkat ini. Untuk sekarang hanya menghapus token aktif.
     */
    public function destroyCurrent(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return ApiResponse::success([
            'revoked' => true,
        ]);
    }
}
