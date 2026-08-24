<?php

namespace App\Actions\Platform;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DeleteUser
{
    public function __construct(private RecordAdminAudit $audit) {}

    public function handle(User $admin, User $user, ?string $ipAddress): void
    {
        if ($admin->is($user)) {
            throw ValidationException::withMessages(['user' => 'Anda tidak dapat menghapus akun sendiri.']);
        }

        if ($user->isPlatformAdmin()) {
            throw ValidationException::withMessages(['user' => 'Akun admin platform harus dikelola dari menu Admin Platform.']);
        }

        if ($user->ownedStores()->exists()) {
            throw ValidationException::withMessages(['user' => 'Akun pemilik toko tidak dapat dihapus. Alihkan kepemilikan toko terlebih dahulu.']);
        }

        $avatarPath = $user->avatar_path;

        try {
            DB::transaction(function () use ($admin, $user, $ipAddress): void {
                $target = User::query()->lockForUpdate()->findOrFail($user->id);
                $metadata = ['target_name' => $target->name, 'target_email' => $target->email];
                $target->delete();
                $this->audit->handle($admin, 'user.deleted', $target, $ipAddress, $metadata);
            });
        } catch (QueryException) {
            throw ValidationException::withMessages([
                'user' => 'Akun memiliki riwayat transaksi atau audit dan tidak dapat dihapus. Tangguhkan akun agar aksesnya berhenti.',
            ]);
        }

        if ($avatarPath !== null) {
            Storage::disk('local')->delete($avatarPath);
        }
    }
}
