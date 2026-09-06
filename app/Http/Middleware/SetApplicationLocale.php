<?php

namespace App\Http\Middleware;

use App\Support\LocaleContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetApplicationLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        App::setLocale(LocaleContext::locale($request));

        return $next($request);
    }
}
