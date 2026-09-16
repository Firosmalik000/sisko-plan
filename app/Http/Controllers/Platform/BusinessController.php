<?php

namespace App\Http\Controllers\Platform;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\BusinessRole;
use App\Enums\BusinessStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\RecoverBusinessOwnershipRequest;
use App\Http\Requests\Platform\UpdateBusinessStatusRequest;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\PosDevice;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\PlatformPermission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BusinessController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));
        $businesses = Business::query()
            ->with(['subscription.plan:id,name'])
            ->withCount(['stores', 'memberships'])
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->latest('id')->paginate(15)->withQueryString()
            ->through(fn (Business $business): array => [
                ...$business->only(['public_id', 'name', 'status', 'created_at']),
                'stores_count' => $business->stores_count,
                'members_count' => $business->memberships_count,
                'subscription' => $business->subscription === null ? null : [
                    'status' => $business->subscription->status->value,
                    'plan_name' => $business->subscription->plan->name,
                ],
            ]);

        return Inertia::render('platform/businesses/index', ['businesses' => $businesses, 'filters' => ['search' => $search]]);
    }

    public function show(Business $business): Response
    {
        $business->load(['subscription.plan:id,name']);

        return Inertia::render('platform/businesses/show', [
            'business' => [
                ...$business->only(['public_id', 'name', 'status', 'created_at']),
                'subscription' => $business->subscription === null ? null : [
                    'public_id' => $business->subscription->public_id,
                    'status' => $business->subscription->status->value,
                    'plan_name' => $business->subscription->plan->name,
                ],
            ],
            'members' => $business->memberships()->with('user:id,name,email')->orderBy('display_name')->get()
                ->map(fn (BusinessMembership $member): array => [
                    ...$member->only(['public_id', 'display_name', 'business_role', 'status', 'joined_at']),
                    'email' => $member->user?->email,
                ]),
            'stores' => $business->stores()->with('country:id,code,name')->orderBy('name')->get()
                ->map(fn ($store): array => [...$store->only(['public_id', 'name', 'status']), 'country' => $store->country?->only(['code', 'name'])]),
            'devices' => PosDevice::query()->where('business_id', $business->id)->with('store:id,public_id,name')->latest('id')->get()
                ->map(fn (PosDevice $device): array => [
                    ...$device->only(['public_id', 'name', 'status', 'last_seen_at', 'revoked_at']),
                    'store' => $device->store?->only(['public_id', 'name']),
                ]),
            'permissions' => [
                'status' => request()->user()?->can(PlatformPermission::BUSINESSES_STATUS_UPDATE) ?? false,
                'devices' => request()->user()?->can(PlatformPermission::BUSINESSES_DEVICE_REVOKE) ?? false,
                'ownership' => request()->user()?->can(PlatformPermission::BUSINESSES_OWNERSHIP_RECOVER) ?? false,
            ],
        ]);
    }

    public function updateStatus(UpdateBusinessStatusRequest $request, Business $business, RecordAdminAudit $audit): RedirectResponse
    {
        $admin = AuthenticatedPlatformAdmin::get($request);
        DB::transaction(function () use ($request, $business, $admin, $audit): void {
            $locked = Business::query()->lockForUpdate()->findOrFail($business->id);
            abort_if($locked->status === BusinessStatus::Archived, 409);
            $before = $locked->status->value;
            $locked->update(['status' => $request->validated('status')]);
            $audit->handle($admin, 'business.status_updated', $locked, $request->ip(), ['before' => $before, 'after' => $request->validated('status')]);
        });

        return back();
    }

    public function revokeDevice(Request $request, Business $business, PosDevice $device, RecordAdminAudit $audit): RedirectResponse
    {
        abort_unless($device->business_id === $business->id, 404);
        $admin = AuthenticatedPlatformAdmin::get($request);
        DB::transaction(function () use ($request, $device, $admin, $audit): void {
            $locked = PosDevice::query()->lockForUpdate()->findOrFail($device->id);
            if ($locked->status !== 'revoked') {
                $locked->update(['status' => 'revoked', 'revoked_at' => now()]);
                $audit->handle($admin, 'business.device_revoked', $locked, $request->ip());
            }
        });

        return back();
    }

    public function recoverOwnership(RecoverBusinessOwnershipRequest $request, Business $business, RecordAdminAudit $audit): RedirectResponse
    {
        $admin = AuthenticatedPlatformAdmin::get($request);
        DB::transaction(function () use ($request, $business, $admin, $audit): void {
            $target = BusinessMembership::query()->where('business_id', $business->id)
                ->where('public_id', $request->validated('member_id'))->lockForUpdate()->firstOrFail();
            $before = $target->business_role->value;
            $target->update(['business_role' => BusinessRole::Owner]);
            $audit->handle($admin, 'business.ownership_recovered', $business, $request->ip(), [
                'membership_public_id' => $target->public_id,
                'before' => $before,
                'after' => BusinessRole::Owner->value,
            ]);
        });

        return back();
    }
}
