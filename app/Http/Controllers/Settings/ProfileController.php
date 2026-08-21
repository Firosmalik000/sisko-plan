<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfilePhotoUpdateRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Http\Requests\Settings\StorePreferencesUpdateRequest;
use App\Models\Store;
use App\Services\Subscriptions\SubscriptionAccess;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\CurrentStore;
use Illuminate\Contracts\Auth\MustVerifyEmail;
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
            $store->loadMissing(['settings', 'subscription.plan']);
        }

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'store' => $store === null ? null : [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'can_manage' => Gate::forUser($user)->allows('update', $store),
                'settings' => $store->settings?->only([
                    'phone', 'email', 'address', 'receipt_header', 'receipt_footer',
                    'receipt_paper_size', 'receipt_show_address', 'receipt_show_cashier',
                    'printer_name', 'auto_print_receipt', 'receipt_copies', 'theme_color',
                ]),
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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Foto profil berhasil diperbarui.']);

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

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengaturan toko berhasil disimpan.']);

        return back();
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = AuthenticatedUser::get($request);

        if ($user->ownedStores()->exists()) {
            throw ValidationException::withMessages([
                'password' => 'Akun pemilik toko tidak dapat dihapus. Alihkan atau tutup kepemilikan toko terlebih dahulu.',
            ]);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    private function activeStore(Request $request): ?Store
    {
        $user = AuthenticatedUser::get($request);
        $stores = $user->activeStores()
            ->orderBy('stores.id')
            ->get(['stores.id', 'stores.public_id', 'stores.name', 'stores.owner_user_id', 'stores.status']);

        return $stores->firstWhere('id', (int) $request->session()->get('active_store_id'))
            ?? $stores->first();
    }
}
