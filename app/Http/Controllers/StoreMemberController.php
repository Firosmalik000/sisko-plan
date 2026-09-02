<?php

namespace App\Http\Controllers;

use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Enums\UserStatus;
use App\Http\Requests\Stores\StoreMemberRequest;
use App\Http\Requests\Stores\UpdateStoreMemberRequest;
use App\Models\Store;
use App\Models\User;
use App\Services\Subscriptions\SubscriptionAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class StoreMemberController extends Controller
{
    public function store(StoreMemberRequest $request, Store $store, SubscriptionAccess $subscriptionAccess): RedirectResponse
    {
        $created = false;

        DB::transaction(function () use ($request, $store, $subscriptionAccess, &$created): void {
            $lockedStore = Store::query()->lockForUpdate()->findOrFail($store->id);
            abort_unless($lockedStore->status === StoreStatus::Active, 403);

            if ($request->validated('mode') === 'create') {
                $member = User::create([
                    'name' => $request->validated('name'),
                    'email' => $request->validated('email'),
                    'password' => $request->validated('password'),
                    'status' => UserStatus::Active->value,
                ]);
                $created = true;
            } else {
                $member = User::query()
                    ->where('email', $request->validated('email'))
                    ->where('status', UserStatus::Active->value)
                    ->first();

                if ($member === null) {
                    throw ValidationException::withMessages([
                        'email' => 'Akun aktif dengan email tersebut tidak ditemukan.',
                    ]);
                }
            }

            $membershipExists = DB::table('store_user')
                ->where('store_id', $store->id)
                ->where('user_id', $member->id)
                ->exists();

            if ($membershipExists) {
                throw ValidationException::withMessages([
                    'email' => 'Pengguna tersebut sudah menjadi anggota toko.',
                ]);
            }

            $subscriptionAccess->assertMemberCapacity($lockedStore, $member->id);

            $lockedStore->users()->attach($member->id, [
                'role' => $request->validated('role'),
                'status' => MembershipStatus::Active->value,
            ]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $created ? __('Staff account created successfully.') : __('Account connected to store successfully.'),
        ]);

        return back();
    }

    public function update(
        UpdateStoreMemberRequest $request,
        Store $store,
        User $member,
        SubscriptionAccess $subscriptionAccess,
    ): RedirectResponse {
        DB::transaction(function () use ($request, $store, $member, $subscriptionAccess): void {
            $lockedStore = Store::query()->lockForUpdate()->findOrFail($store->id);
            abort_unless($lockedStore->status === StoreStatus::Active, 403);

            $membership = DB::table('store_user')
                ->where('store_id', $store->id)
                ->where('user_id', $member->id)
                ->lockForUpdate()
                ->first();

            abort_unless($membership !== null, 404);

            if ($member->id === $lockedStore->owner_user_id) {
                throw ValidationException::withMessages([
                    'status' => __('The primary store owner cannot be deactivated or have their role changed.'),
                ]);
            }

            if ($membership->status !== MembershipStatus::Active->value && $request->validated('status') === MembershipStatus::Active->value) {
                $subscriptionAccess->assertMemberCapacity($lockedStore, $member->id);
            }

            DB::table('store_user')
                ->where('id', $membership->id)
                ->update([
                    'role' => $request->validated('role'),
                    'status' => $request->validated('status'),
                    'updated_at' => now(),
                ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Member access updated successfully.')]);

        return back();
    }
}
