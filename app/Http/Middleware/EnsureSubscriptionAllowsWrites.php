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
        $store = $this->currentStore->get();
        $reason = $this->access->blockedReasonFor($store);

        if ($reason === null) {
            return $next($request);
        }

        if (! $request->isMethodSafe()) {
            $this->access->assertCanWrite($store);
        }

        $isOwner = $request->user()?->id === $store->owner_user_id;
        $hasSubscription = $reason !== 'Akun belum memiliki subscription.';
        if ($request->routeIs('subscription.index') && $isOwner && $hasSubscription) {
            return $next($request);
        }

        return $isOwner && $hasSubscription
            ? to_route('subscription.index')
            : to_route('pricing');
    }
}
