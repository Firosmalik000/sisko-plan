<?php

namespace App\Http\Middleware;

use App\Support\Authentication\AuthenticatedPlatformAdmin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdminHasTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = AuthenticatedPlatformAdmin::get($request);

        if (config('security.platform_admin_2fa_required') && ! $admin->hasEnabledTwoFactorAuthentication()) {
            return to_route('super-admin.security.index')->withErrors([
                'two_factor' => 'Aktifkan dan konfirmasi autentikasi dua langkah sebelum mengakses panel produksi.',
            ]);
        }

        return $next($request);
    }
}
