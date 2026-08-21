<?php

namespace App\Http\Middleware;

use App\Support\Authentication\AuthenticatedUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsPlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(AuthenticatedUser::get($request)->isPlatformAdmin(), 403);

        return $next($request);
    }
}
