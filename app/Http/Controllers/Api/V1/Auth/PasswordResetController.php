<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Requests\Api\V1\Auth\ForgotPasswordRequest;
use App\Http\Requests\Api\V1\Auth\ResetPasswordRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Lupa & reset kata sandi untuk Api_V1 (Req 5).
 *
 * Controller tipis mendelegasi ke password broker Laravel existing tanpa
 * menduplikasi logika token/hashing. Respons `forgot` selalu netral (tidak
 * membocorkan apakah email terdaftar, Req 5.2).
 */
class PasswordResetController
{
    /**
     * POST /auth/forgot-password — kirim tautan/kode reset (Req 5.1).
     *
     * Respons konfirmasi generik terlepas dari keberadaan email (Req 5.2).
     */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        Password::sendResetLink($request->validated());

        return ApiResponse::success([
            'message' => __('passwords.sent'),
        ]);
    }

    /**
     * POST /auth/reset-password — set kata sandi baru dengan token reset (Req 5.3).
     */
    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->validated(),
            function ($user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PasswordReset) {
            // Token tidak valid/kedaluwarsa (Req 5.4).
            return ApiResponse::error(
                code: 'INVALID_RESET_TOKEN',
                message: __($status),
                fields: ['token' => [__($status)]],
                status: 422,
            );
        }

        return ApiResponse::success([
            'message' => __($status),
        ]);
    }
}
