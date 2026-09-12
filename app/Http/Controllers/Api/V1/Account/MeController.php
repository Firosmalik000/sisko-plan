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
        $stores = $user->activeStores()->get();

        return [
            'user' => [
                'public_id' => $user->public_id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'email_verified' => $user->email_verified_at !== null,
            ],
            // Workspace-aware (Req 1.2): tipe workspace merchant + struktur siap
            // menampung tipe workspace lain di masa depan tanpa dibangun sekarang.
            'workspace' => [
                'type' => 'merchant',
            ],
            // Capability union antar toko (kemudahan tampilan; server tetap
            // otoritatif). Klien mengabaikan capability tak dikenal (Req 1.5).
            'capabilities' => TokenAbilities::forUser($user),
            // Daftar toko + role + capability per-store agar shell dapat
            // memfilter menu berdasarkan capability, bukan nama route (Req 1.3).
            'stores' => $stores->map(fn ($store): array => [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'status' => $store->status->value,
                'membership' => [
                    'role' => $store->pivot->role,
                    'status' => $store->pivot->status,
                ],
                'capabilities' => is_string($store->pivot->role)
                    ? TokenAbilities::forRole($store->pivot->role)
                    : [],
            ])->all(),
        ];
    }
}
