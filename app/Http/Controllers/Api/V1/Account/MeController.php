<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Responses\ApiResponse;
use App\Support\Authentication\TokenAbilities;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /me — identitas pengguna + capability ringkas (Req 4.1).
 */
class MeController
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        return ApiResponse::success([
            'user' => [
                'public_id' => $user->public_id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'capabilities' => TokenAbilities::forUser($user),
        ]);
    }
}
