<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Requests\Api\V1\Account\UpdateProfileRequest;
use App\Http\Responses\ApiResponse;
use App\Support\Authentication\TokenAbilities;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /me — identitas pengguna + capability ringkas (Req 4.1).
 * PATCH /me/profile — ubah nama/email profil (Req 21.1, 21.3).
 */
class MeController
{
    public function __invoke(Request $request): JsonResponse
    {
        return ApiResponse::success($this->profilePayload($request));
    }

    /**
     * Update parsial profil pengguna aktif (nama/email). Reuse update sederhana
     * tanpa Action baru — tidak ada business logic ledger yang perlu di-reuse.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return ApiResponse::success($this->profilePayload($request));
    }

    /**
     * @return array<string, mixed>
     */
    private function profilePayload(Request $request): array
    {
        $user = $request->user();

        return [
            'user' => [
                'public_id' => $user->public_id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'capabilities' => TokenAbilities::forUser($user),
        ];
    }
}
