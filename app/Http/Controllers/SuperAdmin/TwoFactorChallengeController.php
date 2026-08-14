<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Actions\Platform\RecordAdminAudit;
use App\Http\Controllers\Controller;
use App\Models\PlatformAdmin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;

class TwoFactorChallengeController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('platform_admin_login.id')) {
            return to_route('super-admin.login');
        }

        return Inertia::render('super-admin/auth/two-factor-challenge');
    }

    public function store(Request $request, TwoFactorAuthenticationProvider $provider, RecordAdminAudit $audit): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['nullable', 'string', 'max:20'],
            'recovery_code' => ['nullable', 'string', 'max:50'],
        ]);
        $admin = PlatformAdmin::query()
            ->whereKey($request->session()->get('platform_admin_login.id'))
            ->where('is_active', true)
            ->first();

        if ($admin === null || ! $admin->hasEnabledTwoFactorAuthentication()) {
            $request->session()->forget(['platform_admin_login.id', 'platform_admin_login.remember']);

            return to_route('super-admin.login')->withErrors(['email' => 'Sesi login tidak lagi valid.']);
        }

        $usedRecoveryCode = false;
        $valid = false;
        if (filled($validated['code'] ?? null)) {
            $valid = $provider->verify(
                Fortify::currentEncrypter()->decrypt($admin->two_factor_secret),
                preg_replace('/\s+/', '', (string) $validated['code']),
            );
        } elseif (filled($validated['recovery_code'] ?? null)) {
            $recoveryCode = trim((string) $validated['recovery_code']);
            $valid = in_array($recoveryCode, $admin->recoveryCodes(), true);
            $usedRecoveryCode = $valid;
            if ($valid) {
                $admin->replaceRecoveryCode($recoveryCode);
            }
        }

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => 'Kode autentikasi atau recovery code tidak valid.',
            ]);
        }

        $remember = (bool) $request->session()->pull('platform_admin_login.remember', false);
        $request->session()->forget('platform_admin_login.id');
        $request->session()->regenerate();
        Auth::guard('platform_admin')->login($admin, $remember);
        $admin->forceFill(['last_login_at' => now()])->save();
        $audit->handle($admin, 'admin.login', null, $request->ip(), [
            'two_factor' => true,
            'recovery_code' => $usedRecoveryCode,
        ]);

        return to_route('super-admin.dashboard');
    }
}
