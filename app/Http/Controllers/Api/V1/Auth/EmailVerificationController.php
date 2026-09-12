<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * POST /auth/email/verification-notification — kirim ulang tautan verifikasi
 * email (Req 6.3, 6.4). Authenticated: pengguna yang belum terverifikasi.
 */
class EmailVerificationController
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return ApiResponse::success([
                'already_verified' => true,
            ]);
        }

        $user->sendEmailVerificationNotification();

        return ApiResponse::success([
            'sent' => true,
        ]);
    }
}
