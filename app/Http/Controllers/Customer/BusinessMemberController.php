<?php

namespace App\Http\Controllers\Customer;

use App\Actions\Businesses\ClaimBusinessMembership;
use App\Actions\Businesses\CreateBusinessMember;
use App\Actions\Businesses\UpdateBusinessMember;
use App\Http\Controllers\Controller;
use App\Http\Requests\Businesses\StoreBusinessMemberRequest;
use App\Http\Requests\Businesses\UpdateBusinessMemberRequest;
use App\Models\AuditLog;
use App\Models\Business;
use App\Models\BusinessMembership;
use App\Models\PosDevice;
use App\Models\RegisterSession;
use App\Models\Sale;
use App\Models\Store;
use App\Support\Authentication\AuthenticatedUser;
use App\Support\BusinessCapability;
use App\Support\CurrentBusiness;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BusinessMemberController extends Controller
{
    public function index(CurrentBusiness $currentBusiness, BusinessCapability $capabilities): Response
    {
        $actor = $currentBusiness->membership();
        abort_unless($capabilities->allows($actor, 'team.view'), 403);
        $business = $currentBusiness->get();

        return Inertia::render('customer/team/index', [
            'business' => $business->only(['public_id', 'name']),
            'canManage' => $capabilities->allows($actor, 'members.manage'),
            'stores' => Store::query()->where('business_id', $business->id)->orderBy('name')->get(['public_id', 'name']),
            'members' => $business->memberships()->with(['user:id,email', 'stores:id,public_id,name'])
                ->orderByRaw("CASE business_role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END")
                ->orderBy('display_name')->get()->map(fn (BusinessMembership $member): array => [
                    ...$member->only(['public_id', 'display_name', 'business_role', 'status', 'joined_at', 'invited_at']),
                    'email' => $member->user?->email,
                    'has_pin' => filled($member->pos_pin_hash),
                    'stores' => $member->stores->map->only(['public_id', 'name'])->values(),
                ]),
            'devices' => PosDevice::query()->where('business_id', $business->id)->with('store:id,public_id,name')
                ->latest('id')->get()->map(fn (PosDevice $device): array => [
                    ...$device->only(['public_id', 'name', 'status', 'last_seen_at', 'revoked_at']),
                    'store' => $device->store?->only(['public_id', 'name']),
                ]),
        ]);
    }

    public function show(BusinessMembership $member, CurrentBusiness $currentBusiness, BusinessCapability $capabilities): Response
    {
        $actor = $currentBusiness->membership();
        abort_unless($member->business_id === $currentBusiness->id() && $capabilities->allows($actor, 'team.view'), 404);
        $storeIds = $member->stores()->pluck('stores.id');

        return Inertia::render('customer/team/show', [
            'member' => [
                ...$member->only(['public_id', 'display_name', 'business_role', 'status', 'joined_at', 'invited_at']),
                'email' => $member->user?->email,
                'has_pin' => filled($member->pos_pin_hash),
                'stores' => $member->stores()->orderBy('name')->get(['stores.public_id', 'stores.name'])->map->only(['public_id', 'name']),
            ],
            'summary' => [
                'sales' => Sale::query()->whereIn('store_id', $storeIds)->where('created_by_business_membership_id', $member->id)->count(),
                'shifts' => RegisterSession::query()->whereIn('store_id', $storeIds)->where('opened_by_business_membership_id', $member->id)->count(),
            ],
            'activity' => AuditLog::query()->where('actor_business_membership_id', $member->id)->latest('id')->limit(50)
                ->get(['action', 'created_at'])->map->only(['action', 'created_at']),
        ]);
    }

    public function store(StoreBusinessMemberRequest $request, Business $business, CreateBusinessMember $create): RedirectResponse
    {
        $create->handle($business, $this->actor($request, $business), $request->memberData(), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff member created successfully.')]);

        return back();
    }

    public function update(UpdateBusinessMemberRequest $request, Business $business, BusinessMembership $member, UpdateBusinessMember $update): RedirectResponse
    {
        abort_unless($member->business_id === $business->id, 404);
        $update->handle($business, $this->actor($request, $business), $member, $request->memberData(), $request->ip());
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff access updated successfully.')]);

        return back();
    }

    public function claim(Request $request, BusinessMembership $member, ClaimBusinessMembership $claim): RedirectResponse
    {
        $claim->handle($member, AuthenticatedUser::get($request), $request->ip());

        return to_route('dashboard');
    }

    private function actor(Request $request, Business $business): BusinessMembership
    {
        return $business->memberships()->where('user_id', AuthenticatedUser::get($request)->id)->firstOrFail();
    }
}
