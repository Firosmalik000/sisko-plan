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
            throw ValidationException::withMessages(['user' => __('You cannot delete your own account.')]);
        }

        if ($user->isPlatformAdmin()) {
            throw ValidationException::withMessages(['user' => __('Platform admin accounts must be managed from the Platform Admin menu.')]);
        }

        if ($user->ownedStores()->exists()) {
            throw ValidationException::withMessages(['user' => __("A store owner's account cannot be deleted. Transfer store ownership first.")]);
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
                'user' => __('The account has transaction or audit history and cannot be deleted. Suspend the account to revoke access.'),
            ]);
        }

        if ($avatarPath !== null) {
            Storage::disk('local')->delete($avatarPath);
        }
    }
}
