<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\PlatformAdminRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
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

        $users = User::query()
            ->withCount('stores')
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
                'can_impersonate' => $user->canBeImpersonated(),
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
            abort_unless($admin->platform_role === PlatformAdminRole::SuperAdmin, 403);
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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Status pengguna berhasil diperbarui.']);

        return back();
    }
}
