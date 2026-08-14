<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Platform\RecordAdminAudit;
use App\Http\Controllers\Controller;
use App\Models\PlatformAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('super-admin/auth/login');
    }

    public function store(Request $request, RecordAdminAudit $recordAudit): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $remember = $request->boolean('remember');

        $admin = PlatformAdmin::query()
            ->where('email', Str::lower($credentials['email']))
            ->where('is_active', true)
            ->first();

        if ($admin === null || ! Hash::check($credentials['password'], $admin->password)) {
            throw ValidationException::withMessages([
                'email' => 'Email atau kata sandi tidak valid.',
            ]);
        }

        $request->session()->regenerate();

        if ($admin->hasEnabledTwoFactorAuthentication()) {
            $request->session()->put([
                'platform_admin_login.id' => $admin->id,
                'platform_admin_login.remember' => $remember,
            ]);

            return to_route('super-admin.two-factor.login');
        }

        Auth::guard('platform_admin')->login($admin, $remember);
        $this->recordSuccessfulLogin($admin, $recordAudit, $request, false);

        return to_route('super-admin.dashboard');
    }

    public function destroy(Request $request, RecordAdminAudit $recordAudit): RedirectResponse
    {
        $admin = Auth::guard('platform_admin')->user();

        if ($admin instanceof PlatformAdmin) {
            $recordAudit->handle($admin, 'admin.logout', null, $request->ip());
        }

        Auth::guard('platform_admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('super-admin.login');
    }

    private function recordSuccessfulLogin(PlatformAdmin $admin, RecordAdminAudit $recordAudit, Request $request, bool $usedTwoFactor): void
    {
        $admin->forceFill(['last_login_at' => now()])->save();
        $recordAudit->handle($admin, 'admin.login', null, $request->ip(), ['two_factor' => $usedTwoFactor]);
    }
}
