<?php

namespace App\Http\Middleware;

use App\Models\PosDevice;
use App\Support\CurrentPosDevice;
use App\Support\CurrentStore;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticatePosDevice
{
    public function __construct(private CurrentPosDevice $currentDevice, private CurrentStore $currentStore) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->cookie((string) config('pos.device_cookie'));
        abort_unless(is_string($token) && strlen($token) === 64, 403);

        $device = PosDevice::query()->with(['store', 'business'])
            ->where('token_hash', hash('sha256', $token))->where('status', 'active')->first();
        abort_unless($device !== null && $device->store?->status?->value === 'active' && $device->business?->status?->value === 'active', 403);

        if ((int) $request->session()->get('pos_device_id') !== $device->id) {
            $request->session()->forget(['pos_actor_membership_id', 'pos_actor_last_activity_at']);
            $request->session()->put('pos_device_id', $device->id);
        }
        $device->update(['last_seen_at' => now()]);
        $this->currentDevice->set($device);
        $this->currentStore->set($device->store);

        return $next($request);
    }
}
