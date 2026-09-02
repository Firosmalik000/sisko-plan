<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Platform\RecordAdminAudit;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Actions\ConfirmTwoFactorAuthentication;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use Laravel\Fortify\Actions\GenerateNewRecoveryCodes;

class SecurityController extends Controller
{
    public function index(Request $request): Response
    {
        $admin = AuthenticatedPlatformAdmin::get($request);
        $enabled = $admin->hasEnabledTwoFactorAuthentication();

        return Inertia::render('super-admin/security/index', [
            'twoFactorEnabled' => $enabled,
            'twoFactorRequired' => (bool) config('security.platform_admin_2fa_required'),
            'setupPending' => $admin->two_factor_secret !== null && ! $enabled,
            'qrCodeSvg' => $admin->two_factor_secret !== null && ! $enabled ? $admin->twoFactorQrCodeSvg() : null,
            'recoveryCodes' => $request->session()->get('platform_admin_recovery_codes', []),
        ]);
    }

    public function updateProfile(
        ProfileUpdateRequest $request,
        RecordAdminAudit $audit,
    ): RedirectResponse {
        $admin = AuthenticatedPlatformAdmin::get($request);

        DB::transaction(function () use ($admin, $request, $audit): void {
            $admin->fill($request->validated());
            $changedFields = array_keys($admin->getDirty());

            if ($admin->isDirty('email')) {
                $admin->email_verified_at = null;
            }

            $admin->save();
            $audit->handle(
                $admin,
                'admin.profile_updated',
                $admin,
                $request->ip(),
                ['changed_fields' => $changedFields],
            );
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Account profile updated successfully.')]);

        return back();
    }

    public function updatePassword(
        PasswordUpdateRequest $request,
        RecordAdminAudit $audit,
    ): RedirectResponse {
        $admin = AuthenticatedPlatformAdmin::get($request);

        DB::transaction(function () use ($admin, $request, $audit): void {
            $admin->update(['password' => $request->validated('password')]);
            $audit->handle($admin, 'admin.password_updated', $admin, $request->ip());
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Password updated.')]);

        return back();
    }

    public function enable(Request $request, EnableTwoFactorAuthentication $enable, RecordAdminAudit $audit): RedirectResponse
    {
        $admin = $this->adminAfterPasswordValidation($request);
        DB::transaction(function () use ($admin, $enable, $audit, $request): void {
            $enable($admin, true);
            $audit->handle($admin, 'admin.2fa_setup_started', $admin, $request->ip());
        });

        return back();
    }

    public function confirm(Request $request, ConfirmTwoFactorAuthentication $confirm, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate(['code' => ['required', 'string', 'max:20']]);
        $admin = AuthenticatedPlatformAdmin::get($request);
        DB::transaction(function () use ($admin, $confirm, $validated, $audit, $request): void {
            $confirm($admin, preg_replace('/\s+/', '', $validated['code']));
            $audit->handle($admin, 'admin.2fa_enabled', $admin, $request->ip());
        });
        $request->session()->flash('platform_admin_recovery_codes', $admin->recoveryCodes());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Two-factor authentication enabled successfully.')]);

        return back();
    }

    public function regenerate(Request $request, GenerateNewRecoveryCodes $generate, RecordAdminAudit $audit): RedirectResponse
    {
        $admin = $this->adminAfterPasswordValidation($request);
        abort_unless($admin->hasEnabledTwoFactorAuthentication(), 409);
        DB::transaction(function () use ($admin, $generate, $audit, $request): void {
            $generate($admin);
            $audit->handle($admin, 'admin.2fa_recovery_regenerated', $admin, $request->ip());
        });
        $request->session()->flash('platform_admin_recovery_codes', $admin->recoveryCodes());

        return back();
    }

    public function disable(Request $request, DisableTwoFactorAuthentication $disable, RecordAdminAudit $audit): RedirectResponse
    {
        if (config('security.platform_admin_2fa_required')) {
            throw ValidationException::withMessages(['two_factor' => '2FA wajib pada environment ini dan tidak dapat dinonaktifkan.']);
        }

        $admin = $this->adminAfterPasswordValidation($request);
        DB::transaction(function () use ($admin, $disable, $audit, $request): void {
            $disable($admin);
            $audit->handle($admin, 'admin.2fa_disabled', $admin, $request->ip());
        });

        return back();
    }

    private function adminAfterPasswordValidation(Request $request): User
    {
        $validated = $request->validate(['current_password' => ['required', 'string']]);
        $admin = AuthenticatedPlatformAdmin::get($request);
        if (! Hash::check($validated['current_password'], $admin->password)) {
            throw ValidationException::withMessages(['current_password' => 'Kata sandi saat ini tidak valid.']);
        }

        return $admin;
    }
}
