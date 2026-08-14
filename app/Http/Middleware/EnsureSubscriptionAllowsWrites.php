<?php

namespace App\Http\Middleware;

use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\CurrentStore;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscriptionAllowsWrites
{
    public function __construct(private CurrentStore $currentStore, private SubscriptionAccess $access) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethodSafe()) {
            $this->access->assertCanWrite($this->currentStore->get());
        }

        return $next($request);
    }
}
