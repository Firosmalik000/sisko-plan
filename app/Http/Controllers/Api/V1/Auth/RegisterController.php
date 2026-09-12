<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Requests\Api\V1\Auth\RegisterRequest;
use App\Http\Responses\ApiResponse;
use App\Support\Authentication\IssuesDeviceTokens;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * POST /auth/register — pendaftaran akun dari aplikasi mobile (Req 3).
 *
 * Controller tipis: mendelegasi pembuatan user + validasi kekuatan password +
 * subscription default ke Action Fortify existing (CreatesNewUsers) tanpa
 * menduplikasi logika, lalu langsung menerbitkan Sanctum token per-perangkat
 * agar app bisa lanjut ke bootstrap sesi. Verifikasi email dikirim via event
 * Registered bila server mewajibkan (Req 3.3).
 */
class RegisterController
{
    use IssuesDeviceTokens;

    public function __invoke(RegisterRequest $request, CreatesNewUsers $creator): JsonResponse
    {
        $validated = $request->validated();

        $user = $creator->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'password_confirmation' => $validated['password_confirmation'] ?? $validated['password'],
        ]);

        event(new Registered($user));

        return ApiResponse::success(
            $this->issueDeviceTokenPayload(
                $user,
                $validated['device_id'],
                $validated['device_name'] ?? null,
            ),
            status: 201,
        );
    }
}
