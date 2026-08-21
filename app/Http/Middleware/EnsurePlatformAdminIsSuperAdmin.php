<?php

namespace App\Http\Middleware;

use App\Enums\PlatformAdminRole;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdminIsSuperAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(AuthenticatedPlatformAdmin::get($request)->platform_role === PlatformAdminRole::SuperAdmin, 403);

        return $next($request);
    }
}
