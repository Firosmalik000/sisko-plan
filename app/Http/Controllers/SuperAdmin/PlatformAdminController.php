<?php

namespace App\Http\Controllers\SuperAdmin;

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
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PlatformAdminController extends Controller
{
    public function index(Request $request): Response
    {
        $actor = AuthenticatedPlatformAdmin::get($request);

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
                    'permissions' => $admin->getAllPermissions()->pluck('name')->values(),
                ]),
            'permission_groups' => PlatformPermission::groups(),
            'can_manage' => $actor->can(PlatformPermission::ADMINS_MANAGE),
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
            $admin->syncPermissions(PlatformPermission::defaultAdmin());
            $audit->handle($actor, 'platform_admin.created', $admin, $request->ip(), ['email' => $admin->email]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Platform admin added successfully.')]);

        return back();
    }

    public function updatePermissions(Request $request, User $platformAdmin, RecordAdminAudit $audit): RedirectResponse
    {
        abort_unless($platformAdmin->isPlatformAdmin(), 404);
        if ($platformAdmin->platform_role === PlatformAdminRole::SuperAdmin) {
            throw ValidationException::withMessages(['permissions' => __('Super Admin always has full access.')]);
        }

        $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', Rule::in(PlatformPermission::all())],
        ]);
        $actor = AuthenticatedPlatformAdmin::get($request);
        $before = $platformAdmin->getAllPermissions()->pluck('name')->sort()->values()->all();
        $permissions = $this->normalizedPermissions($request);

        DB::transaction(function () use ($platformAdmin, $permissions, $before, $actor, $audit, $request): void {
            $platformAdmin->syncPermissions($permissions);
            $audit->handle($actor, 'platform_admin.permissions_updated', $platformAdmin, $request->ip(), [
                'before' => $before,
                'after' => $permissions,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Admin access updated successfully.')]);

        return back();
    }

    /** @return list<string> */
    private function normalizedPermissions(Request $request): array
    {
        $rawPermissions = $request->input('permissions', []);
        if (! is_array($rawPermissions)) {
            return [];
        }

        $permissions = [];
        foreach ($rawPermissions as $permission) {
            if (is_string($permission) && in_array($permission, PlatformPermission::all(), true)) {
                $permissions[] = $permission;
            }
        }

        $permissions = array_values(array_unique($permissions));
        sort($permissions);

        return $permissions;
    }

    public function updateStatus(Request $request, User $platformAdmin, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate(['is_active' => ['required', 'boolean']]);
        $actor = AuthenticatedPlatformAdmin::get($request);
        $activate = (bool) $validated['is_active'];

        if (! $activate && $actor->is($platformAdmin)) {
            throw ValidationException::withMessages(['is_active' => __('You cannot deactivate your own account.')]);
        }
        abort_unless($platformAdmin->isPlatformAdmin(), 404);
        if (! $activate && $platformAdmin->platform_role === PlatformAdminRole::SuperAdmin
            && User::query()->where('platform_role', PlatformAdminRole::SuperAdmin)->where('status', UserStatus::Active)->count() <= 1) {
            throw ValidationException::withMessages(['is_active' => __('At least one Super Admin must remain active.')]);
        }

        DB::transaction(function () use ($platformAdmin, $activate, $actor, $audit, $request): void {
            $platformAdmin->update(['status' => $activate ? UserStatus::Active : UserStatus::Suspended]);
            $audit->handle($actor, 'platform_admin.status_updated', $platformAdmin, $request->ip(), ['is_active' => $activate]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => $activate ? __('Platform admin activated.') : __('Platform admin deactivated.')]);

        return back();
    }
}
