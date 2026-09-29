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
use App\Models\User;
use App\Services\Sales\PosCheckoutData;
use App\Support\CurrentBusiness;
use App\Support\CurrentPosDevice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
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
                        ->where('store_memberships.status', MembershipStatus::Active->value));
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

    public function exit(Request $request, CurrentPosDevice $currentDevice): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        /** @var User|null $user */
        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        $device = $currentDevice->get();

        $isOwnerOrAdmin = BusinessMembership::query()
            ->where('business_id', $device->business_id)
            ->where('user_id', $user->id)
            ->where('status', MembershipStatus::Active->value)
            ->whereIn('business_role', [BusinessRole::Owner->value, BusinessRole::Admin->value])
            ->exists();

        if (! $isOwnerOrAdmin) {
            throw ValidationException::withMessages([
                'email' => __('Only an active business owner or admin can exit terminal mode on this device.'),
            ]);
        }

        $request->session()->forget(['pos_actor_membership_id', 'pos_actor_last_activity_at']);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return to_route('dashboard');
    }
}
