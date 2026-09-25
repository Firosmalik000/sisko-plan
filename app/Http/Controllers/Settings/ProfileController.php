<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfilePhotoUpdateRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Http\Requests\Settings\StoreLogoUpdateRequest;
use App\Http\Requests\Settings\StorePreferencesUpdateRequest;
use App\Models\Store;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request, SubscriptionAccess $subscriptionAccess): Response
    {
        $user = AuthenticatedUser::get($request);
        $store = $this->activeStore($request);

        if ($store !== null) {
            $store->loadMissing(['settings', 'business.subscription.plan']);
        }

        return Inertia::render('customer/settings/profile', [
            'mustVerifyEmail' => true,
            'status' => $request->session()->get('status'),
            'store' => $store === null ? null : [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'can_manage' => Gate::forUser($user)->allows('update', $store),
                'settings' => $store->settings === null ? null : [
                    ...$store->settings->only([
                        'phone', 'email', 'address', 'receipt_header', 'receipt_footer',
                        'receipt_paper_size', 'receipt_show_address', 'receipt_show_cashier',
                        'receipt_show_logo', 'theme_color',
                    ]),
                    'logo_url' => $store->settings->logo_path ? route('stores.logo', $store) : null,
                ],
            ],
            'subscription' => $store === null ? null : $subscriptionAccess->summary($store),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = AuthenticatedUser::get($request);
        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    public function updatePhoto(ProfilePhotoUpdateRequest $request): RedirectResponse
    {
        $user = AuthenticatedUser::get($request);
        $oldPath = $user->avatar_path;
        $path = $request->file('photo')->store("users/{$user->id}/profile", 'local');
        $user->update(['avatar_path' => $path]);

        if ($oldPath !== null) {
            Storage::disk('local')->delete($oldPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile photo updated successfully.')]);

        return back();
    }

    public function photo(Request $request): StreamedResponse
    {
        $user = AuthenticatedUser::get($request);
        abort_unless($user->avatar_path && Storage::disk('local')->exists($user->avatar_path), 404);

        return Storage::disk('local')->response($user->avatar_path, null, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function updateStore(
        StorePreferencesUpdateRequest $request,
        CurrentStore $currentStore,
        SubscriptionAccess $subscriptionAccess,
    ): RedirectResponse {
        DB::transaction(function () use ($request, $currentStore, $subscriptionAccess): void {
            $store = Store::query()->lockForUpdate()->findOrFail($currentStore->id());
            $subscriptionAccess->assertCanWrite($store);
            $validated = $request->validated();

            $store->update(['name' => $validated['store_name']]);
            unset($validated['store_name']);
            $store->settings()->updateOrCreate(['store_id' => $store->id], $validated);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store settings saved successfully.')]);

        return back();
    }

    public function updateStoreLogo(
        StoreLogoUpdateRequest $request,
        CurrentStore $currentStore,
        SubscriptionAccess $subscriptionAccess,
    ): RedirectResponse {
        $store = Store::query()->lockForUpdate()->findOrFail($currentStore->id());
        $subscriptionAccess->assertCanWrite($store);

        $settings = $store->settings()->firstOrCreate(['store_id' => $store->id]);
        $oldPath = $settings->logo_path;
        $path = $request->file('logo')->store("stores/{$store->id}/logo", 'local');
        $settings->update(['logo_path' => $path]);

        if ($oldPath !== null) {
            Storage::disk('local')->delete($oldPath);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store logo updated successfully.')]);

        return back();
    }

    public function deleteStoreLogo(
        CurrentStore $currentStore,
        SubscriptionAccess $subscriptionAccess,
    ): RedirectResponse {
        $store = Store::query()->lockForUpdate()->findOrFail($currentStore->id());
        Gate::authorize('update', $store);
        $subscriptionAccess->assertCanWrite($store);

        $settings = $store->settings;

        if ($settings !== null && $settings->logo_path !== null) {
            Storage::disk('local')->delete($settings->logo_path);
            $settings->update(['logo_path' => null]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store logo deleted successfully.')]);

        return back();
    }

    public function storeLogo(Store $store): StreamedResponse
    {
        $path = $store->settings?->logo_path;
        abort_unless(is_string($path) && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path, null, [
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = AuthenticatedUser::get($request);

        if ($user->businessMemberships()->where('business_role', 'owner')->exists()) {
            throw ValidationException::withMessages([
                'password' => __('A business owner account cannot be deleted. Transfer or close the business ownership first.'),
            ]);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('login');
    }

    private function activeStore(Request $request): ?Store
    {
        $user = AuthenticatedUser::get($request);
        $stores = Store::query()
            ->where('stores.status', 'active')
            ->whereHas('business.memberships', fn ($memberships) => $memberships
                ->where('user_id', $user->id)
                ->where('status', 'active'))
            ->where(function ($stores) use ($user): void {
                $stores->whereHas('business.memberships', fn ($memberships) => $memberships
                    ->where('user_id', $user->id)
                    ->whereIn('business_role', ['owner', 'admin']))
                    ->orWhereHas('assignments.businessMembership', fn ($memberships) => $memberships
                        ->where('user_id', $user->id)
                        ->where('status', 'active'));
            })
            ->orderBy('stores.id')
            ->get(['stores.id', 'stores.public_id', 'stores.business_id', 'stores.name', 'stores.status']);

        return $stores->firstWhere('id', (int) $request->session()->get('active_store_id'))
            ?? $stores->first();
    }
}
