<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AddRequestId
{
    public function handle(Request $request, Closure $next): Response
    {
        $provided = $request->header('X-Request-ID');
        $requestId = is_string($provided) && preg_match('/\A[A-Za-z0-9._-]{8,100}\z/', $provided) === 1
            ? $provided
            : (string) Str::ulid();

        $request->attributes->set('request_id', $requestId);
        Log::withContext(['request_id' => $requestId]);

        return $next($request);
    }
}
