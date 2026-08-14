<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdminIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $admin = Auth::guard('platform_admin')->user();

        if ($admin !== null && ! $admin->is_active) {
            Auth::guard('platform_admin')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return to_route('super-admin.login')->withErrors([
                'email' => 'Akun Super Admin dinonaktifkan.',
            ]);
        }

        return $next($request);
    }
}
