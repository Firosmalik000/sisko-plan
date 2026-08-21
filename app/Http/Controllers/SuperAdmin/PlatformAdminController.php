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
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PlatformAdminController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('super-admin/platform-admins/index', [
            'admins' => User::query()
                ->whereNotNull('platform_role')
                ->orderByRaw("platform_role = 'super_admin' desc")
                ->orderBy('name')
                ->get()
                ->map(fn (User $admin): array => [
                    ...$admin->only(['id', 'name', 'email']),
                    'is_active' => $admin->status === UserStatus::Active,
                    'role' => $admin->platform_role?->value,
                    'two_factor_enabled' => $admin->hasEnabledTwoFactorAuthentication(),
                    'last_login_at' => $admin->last_login_at?->toIso8601String(),
                ]),
        ]);
    }

    public function store(Request $request, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::min(12)->mixedCase()->numbers()->symbols()],
        ]);
        $actor = AuthenticatedPlatformAdmin::get($request);

        DB::transaction(function () use ($validated, $actor, $audit, $request): void {
            $admin = User::create([
                ...$validated,
                'platform_role' => PlatformAdminRole::Admin,
                'status' => UserStatus::Active,
            ]);
            $audit->handle($actor, 'platform_admin.created', $admin, $request->ip(), ['email' => $admin->email]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Admin platform berhasil ditambahkan.']);

        return back();
    }

    public function updateStatus(Request $request, User $platformAdmin, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);
        $actor = AuthenticatedPlatformAdmin::get($request);
        $activate = (bool) $validated['is_active'];

        if (! $activate && $actor->is($platformAdmin)) {
            throw ValidationException::withMessages(['is_active' => 'Anda tidak dapat menonaktifkan akun sendiri.']);
        }
        abort_unless($platformAdmin->isPlatformAdmin(), 404);
        if (! $activate && $platformAdmin->platform_role === PlatformAdminRole::SuperAdmin
            && User::query()->where('platform_role', PlatformAdminRole::SuperAdmin)->where('status', UserStatus::Active)->count() <= 1) {
            throw ValidationException::withMessages(['is_active' => 'Minimal satu Super Admin harus tetap aktif.']);
        }

        DB::transaction(function () use ($platformAdmin, $activate, $actor, $audit, $request): void {
            $platformAdmin->update(['status' => $activate ? UserStatus::Active : UserStatus::Suspended]);
            $audit->handle($actor, 'platform_admin.status_updated', $platformAdmin, $request->ip(), ['is_active' => $activate]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => $activate ? 'Admin platform diaktifkan.' : 'Admin platform dinonaktifkan.']);

        return back();
    }
}
