<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * POST /auth/confirm-password — konfirmasi kata sandi sebelum aksi sensitif
 * (Req 6.5). Authenticated. Mengembalikan penanda konfirmasi + waktu agar klien
 * dapat menganggap konfirmasi berlaku dalam jendela waktu tertentu.
 */
class ConfirmPasswordController
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['password'], $request->user()->password)) {
            return ApiResponse::error(
                code: 'INVALID_PASSWORD',
                message: __('The provided password is incorrect.'),
                fields: ['password' => [__('The provided password is incorrect.')]],
                status: 422,
            );
        }

        return ApiResponse::success([
            'confirmed' => true,
            'confirmed_at' => now()->toIso8601String(),
        ]);
    }
}
