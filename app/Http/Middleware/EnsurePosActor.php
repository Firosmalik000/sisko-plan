<?php

namespace App\Http\Middleware;

use App\Actions\Sales\UnlockPosDevice;
use App\Enums\MembershipStatus;
use App\Models\BusinessMembership;
use App\Support\CurrentPosDevice;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePosActor
{
    public function __construct(private CurrentPosDevice $currentDevice) {}

    public function handle(Request $request, Closure $next): Response
    {
        $lastActivity = (int) $request->session()->get('pos_actor_last_activity_at', 0);
        $expired = $lastActivity === 0 || now()->getTimestamp() - $lastActivity > (int) config('pos.actor_idle_timeout_seconds');
        $memberId = (int) $request->session()->get('pos_actor_membership_id', 0);
        $member = $expired || $memberId === 0 ? null : BusinessMembership::query()->find($memberId);
        $device = $this->currentDevice->get();
        if ($member === null || $member->status !== MembershipStatus::Active || ! app(UnlockPosDevice::class)->canUse($device, $member)) {
            $request->session()->forget(['pos_actor_membership_id', 'pos_actor_last_activity_at']);

            return to_route('terminal.lock');
        }

        $request->session()->put('pos_actor_last_activity_at', now()->timestamp);
        $request->attributes->set('pos_actor', $member);

        return $next($request);
    }
}
