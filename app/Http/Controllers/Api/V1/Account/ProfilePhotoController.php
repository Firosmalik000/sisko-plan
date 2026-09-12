<?php

namespace App\Http\Controllers\Api\V1\Account;

use App\Http\Requests\Api\V1\Account\UpdatePhotoRequest;
use App\Http\Responses\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

/**
 * POST /me/photo — unggah foto profil (Req 25.3). Menyimpan berkas pada disk
 * `local` dengan jalur konsisten dengan web (`users/{id}/profile`) agar route
 * `profile.photo` (dipakai accessor `avatar`) tetap melayani gambar terbaru.
 * Berkas lama dihapus. Mengembalikan URL avatar terbaru.
 */
class ProfilePhotoController
{
    public function __invoke(UpdatePhotoRequest $request): JsonResponse
    {
        $user = $request->user();
        $oldPath = $user->avatar_path;

        $path = $request->file('photo')->store("users/{$user->id}/profile", 'local');
        $user->update(['avatar_path' => $path]);

        if ($oldPath !== null && $oldPath !== $path) {
            Storage::disk('local')->delete($oldPath);
        }

        return ApiResponse::success([
            'avatar' => $user->fresh()->avatar,
        ]);
    }
}
