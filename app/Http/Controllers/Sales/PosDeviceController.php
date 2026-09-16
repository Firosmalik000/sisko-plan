<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\ActivatePosDevice;
use App\Actions\Sales\RevokePosDevice;
use App\Actions\Sales\UnlockPosDevice;
use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\ActivatePosDeviceRequest;
use App\Http\Requests\Sales\UnlockPosDeviceRequest;
use App\Models\BusinessMembership;
use App\Models\PosDevice;
use App\Models\Store;
use App\Services\Sales\PosCheckoutData;
use App\Support\CurrentBusiness;
use App\Support\CurrentPosDevice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PosDeviceController extends Controller
{
    public function store(ActivatePosDeviceRequest $request, Store $store, CurrentBusiness $business, ActivatePosDevice $action): RedirectResponse
    {
        abort_unless($store->business_id === $business->id(), 404);
        Gate::authorize('devices.manage', $store);
        [, $token] = $action->handle($store, $business->membership(), $request->validated('name'), $request->ip());

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $cookieName = config('pos.device_cookie');
        if (! is_string($cookieName) || $cookieName === '') {
            throw new \LogicException('The POS device cookie name must be configured.');
        }

        return to_route('terminal.lock')->withCookie(cookie(
            name: $cookieName,
            value: $token,
            minutes: 60 * 24 * 365,
            secure: true,
            httpOnly: true,
            sameSite: 'lax',
        ));
    }

    public function destroy(Request $request, Store $store, PosDevice $device, CurrentBusiness $business, RevokePosDevice $action): RedirectResponse
    {
        abort_unless($store->business_id === $business->id(), 404);
        Gate::authorize('devices.manage', $store);
        $action->handle($store, $device, $business->membership(), $request->ip());

        return back();
    }

    public function lock(CurrentPosDevice $currentDevice): Response
    {
        $device = $currentDevice->get();
        $members = BusinessMembership::query()
            ->where(['business_id' => $device->business_id, 'status' => MembershipStatus::Active->value])
            ->whereNotNull('pos_pin_hash')
            ->where(function ($query) use ($device): void {
                $query->whereIn('business_role', [BusinessRole::Owner->value, BusinessRole::Admin->value])
                    ->orWhereHas('stores', fn ($stores) => $stores->whereKey($device->store_id)
                        ->wherePivot('status', MembershipStatus::Active->value));
            })
            ->orderBy('display_name')->get(['public_id', 'display_name']);

        return Inertia::render('terminal/lock', [
            'device' => $device->only(['public_id', 'name']),
            'store' => $device->store->only(['public_id', 'name']),
            'members' => $members,
        ]);
    }

    public function unlock(UnlockPosDeviceRequest $request, CurrentPosDevice $currentDevice, UnlockPosDevice $action): RedirectResponse
    {
        $member = $action->handle($currentDevice->get(), $request->validated('member_id'), $request->validated('pin'), $request->ip());
        $request->session()->put([
            'pos_actor_membership_id' => $member->id,
            'pos_actor_last_activity_at' => now()->timestamp,
        ]);

        return to_route('terminal.home');
    }

    public function home(Request $request, CurrentPosDevice $currentDevice, PosCheckoutData $checkout): Response
    {
        /** @var BusinessMembership $actor */
        $actor = $request->attributes->get('pos_actor');

        $device = $currentDevice->get();
        $props = $checkout->for($device->store, $actor);
        $props['products'] = $props['products']->map(fn (array $product): array => [...$product, 'photo_url' => null]);

        return Inertia::render('terminal/home', [
            ...$props,
            'device' => $device->only(['public_id', 'name']),
            'store' => $device->store->only(['public_id', 'name']),
            'activeStore' => [
                ...$device->store->only(['public_id', 'name']),
                'country_code' => $device->store->country->code ?? 'ID',
                'currency_code' => $device->store->currencyCode(),
            ],
            'actor' => $actor->only(['public_id', 'display_name']),
        ]);
    }

    public function relock(Request $request): RedirectResponse
    {
        $request->session()->forget(['pos_actor_membership_id', 'pos_actor_last_activity_at']);

        return to_route('terminal.lock');
    }
}
