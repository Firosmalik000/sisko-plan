<?php

namespace App\Http\Middleware;

use App\Enums\BusinessStatus;
use App\Enums\MembershipStatus;
use App\Models\BusinessMembership;
use App\Support\CurrentBusiness;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetActiveBusiness
{
    public function __construct(private CurrentBusiness $currentBusiness) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $memberships = BusinessMembership::query()
            ->where('user_id', $user->id)
            ->where('status', MembershipStatus::Active->value)
            ->with('business')
            ->orderBy('id')
            ->get();
        $activeId = (int) $request->session()->get('active_business_id', 0);
        $membership = $memberships->first(fn (BusinessMembership $item): bool => $item->business_id === $activeId)
            ?? $memberships->first(fn (BusinessMembership $item): bool => $item->business->status === BusinessStatus::Active)
            ?? $memberships->first();

        if ($membership === null) {
            $request->session()->forget(['active_business_id', 'active_store_id']);

            return to_route('stores.create');
        }

        $request->session()->put('active_business_id', $membership->business_id);
        $this->currentBusiness->set($membership->business, $membership);

        if ($membership->business->status !== BusinessStatus::Active) {
            $request->session()->forget(['active_store_id', 'pos_actor_membership_id', 'register_session_id']);

            if ($request->routeIs('stores.index')) {
                return $next($request);
            }

            return to_route('stores.index');
        }

        return $next($request);
    }
}
