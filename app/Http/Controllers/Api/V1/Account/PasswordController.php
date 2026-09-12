<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Requests\Api\V1\Account\UpdatePasswordRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;

/**
 * POST /me/password — ganti kata sandi terautentikasi (Req 26.1). `current_password`
 * divalidasi di FormRequest (rule `current_password`); kata sandi baru di-hash
 * otomatis via cast model `password => hashed`. Nilai tidak pernah di-log.
 */
class PasswordController
{
    public function __invoke(UpdatePasswordRequest $request): JsonResponse
    {
        $request->user()->update([
            'password' => $request->validated()['password'],
        ]);

        return ApiResponse::success(['updated' => true]);
    }
}
