<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Enums\MembershipStatus;
use App\Http\Requests\Api\V1\Stores\StoreMemberRequest;
use App\Http\Requests\Api\V1\Stores\UpdateMemberRoleRequest;
use App\Http\Resources\Api\V1\Stores\MemberResource;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Anggota toko Api/V1 (Req 22.1–22.5). Ability `store.settings` (owner/admin;
 * cashier ditolak FORBIDDEN). Role terbatas admin/cashier — pemilik (owner) tak
 * dapat ditambah/diubah/dinonaktifkan lewat endpoint ini → `OWNERSHIP_LOCKED`
 * (409). Nonaktif = status `Suspended` (menjaga histori, tidak menghapus baris).
 */
class MemberController
{
    public function index(Request $request, Store $store): JsonResponse
    {
        $this->assertSettings($request);

        $members = $store->users()->get();

        return ApiResponse::success([
            'members' => MemberResource::collection($members)->resolve($request),
        ]);
    }

    public function store(StoreMemberRequest $request, Store $store): JsonResponse
    {
        $this->assertSettings($request);
        $validated = $request->validated();

        $user = User::query()->where('email', $validated['email'])->first();
        if ($user === null) {
            throw new NotFoundHttpException('Pengguna dengan email tersebut tidak ditemukan.');
        }

        if ($user->id === $store->owner_user_id) {
            return $this->ownershipLocked();
        }

        $store->users()->syncWithoutDetaching([
            $user->id => [
                'role' => $validated['role'],
                'status' => MembershipStatus::Active->value,
            ],
        ]);

        return ApiResponse::success(
            (new MemberResource($this->memberOf($store, $user->id)))->resolve($request),
            status: 201,
        );
    }

    public function update(UpdateMemberRoleRequest $request, Store $store, string $member): JsonResponse
    {
        $this->assertSettings($request);

        $user = $this->resolveMember($store, $member);
        if ($user->id === $store->owner_user_id) {
            return $this->ownershipLocked();
        }

        $store->users()->updateExistingPivot($user->id, ['role' => $request->validated()['role']]);

        return ApiResponse::success((new MemberResource($this->memberOf($store, $user->id)))->resolve($request));
    }

    public function destroy(Request $request, Store $store, string $member): JsonResponse
    {
        $this->assertSettings($request);

        $user = $this->resolveMember($store, $member);
        if ($user->id === $store->owner_user_id) {
            return $this->ownershipLocked();
        }

        $store->users()->updateExistingPivot($user->id, ['status' => MembershipStatus::Suspended->value]);

        return ApiResponse::success((new MemberResource($this->memberOf($store, $user->id)))->resolve($request));
    }

    private function resolveMember(Store $store, string $publicId): User
    {
        $user = $store->users()->where('users.public_id', $publicId)->first();
        if ($user === null) {
            throw new NotFoundHttpException('Anggota tidak ditemukan pada toko ini.');
        }

        return $user;
    }

    private function memberOf(Store $store, int $userId): User
    {
        return $store->users()->where('users.id', $userId)->firstOrFail();
    }

    private function ownershipLocked(): JsonResponse
    {
        return ApiResponse::error(
            code: 'OWNERSHIP_LOCKED',
            message: 'Kepemilikan toko tidak dapat dipindahkan atau diubah.',
            status: 409,
        );
    }

    private function assertSettings(Request $request): void
    {
        if (! $request->user()->tokenCan('store.settings')) {
            throw new AccessDeniedHttpException('Ability store.settings diperlukan.');
        }
    }
}
