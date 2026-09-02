<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Platform\DeleteUser;
use App\Actions\Platform\RecordAdminAudit;
use App\Enums\PlatformAdminRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\PlatformPermission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $admin = AuthenticatedPlatformAdmin::get($request);

        $users = User::query()
            ->withCount(['stores', 'ownedStores'])
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status->value,
                'platform_role' => $user->platform_role?->value,
                'stores_count' => $user->stores_count,
                'created_at' => $user->created_at?->toDateString(),
                'can_update_status' => $admin->can($user->isPlatformAdmin() ? PlatformPermission::ADMINS_MANAGE : PlatformPermission::USERS_STATUS_UPDATE),
                'can_impersonate' => $admin->can(PlatformPermission::USERS_IMPERSONATE) && $user->canBeImpersonated(),
                'can_delete' => $admin->can(PlatformPermission::USERS_DELETE)
                    && ! $user->isPlatformAdmin()
                    && $user->owned_stores_count === 0,
            ]);

        return Inertia::render('super-admin/users/index', [
            'users' => $users,
            'filters' => ['search' => $search],
        ]);
    }

    public function updateStatus(
        Request $request,
        User $user,
        RecordAdminAudit $recordAudit,
    ): RedirectResponse {
        $validated = $request->validate([
            'status' => ['required', Rule::enum(UserStatus::class)],
        ]);

        $admin = AuthenticatedPlatformAdmin::get($request);

        if ($user->isPlatformAdmin()) {
            abort_unless($admin->can(PlatformPermission::ADMINS_MANAGE), 403);
            if ($admin->is($user) && $validated['status'] !== UserStatus::Active->value) {
                throw ValidationException::withMessages([
                    'status' => 'Anda tidak dapat menonaktifkan akun sendiri.',
                ]);
            }
            if ($user->platform_role === PlatformAdminRole::SuperAdmin
                && $validated['status'] !== UserStatus::Active->value
                && User::query()->where('platform_role', PlatformAdminRole::SuperAdmin)->where('status', UserStatus::Active)->count() <= 1) {
                throw ValidationException::withMessages([
                    'status' => 'Minimal satu Super Admin harus tetap aktif.',
                ]);
            }
        }

        DB::transaction(function () use ($user, $validated, $admin, $request, $recordAudit): void {
            $before = $user->status->value;
            $user->update(['status' => $validated['status']]);
            $recordAudit->handle($admin, 'user.status_updated', $user, $request->ip(), [
                'before' => $before,
                'after' => $validated['status'],
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User status updated successfully.')]);

        return back();
    }

    public function destroy(Request $request, User $user, DeleteUser $action): RedirectResponse
    {
        $action->handle(AuthenticatedPlatformAdmin::get($request), $user, $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('User account deleted successfully.')]);

        return back();
    }
}
