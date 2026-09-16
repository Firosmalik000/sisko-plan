<?php

namespace App\Http\Controllers\Customer;

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Models\BusinessMembership;
use App\Models\RegisterSession;
use App\Models\Sale;
use App\Models\Store;
use App\Support\CurrentBusiness;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TeamActivityController extends Controller
{
    public function __invoke(Request $request, CurrentBusiness $currentBusiness): Response
    {
        $member = $currentBusiness->membership();
        $stores = Store::query()->where('business_id', $currentBusiness->id())
            ->when($member->business_role === BusinessRole::Staff, fn ($query) => $query->whereHas('assignments', fn ($assignments) => $assignments
                ->where('business_membership_id', $member->id)
                ->where('status', MembershipStatus::Active->value)))
            ->orderBy('name')->get(['id', 'public_id', 'business_id', 'name']);
        abort_unless($stores->contains(fn (Store $store): bool => Gate::forUser($request->user())->allows('team.view', $store)), 403);
        $storeIds = $stores->pluck('id');
        $activity = BusinessMembership::query()->where('business_id', $currentBusiness->id())
            ->whereHas('stores', fn ($query) => $query->whereIn('stores.id', $storeIds))
            ->withCount(['stores as sale_count' => fn ($query) => $query->whereIn('stores.id', $storeIds)])
            ->get(['id', 'public_id', 'display_name', 'business_role'])
            ->map(function (BusinessMembership $staff) use ($storeIds): array {
                $sales = Sale::query()->whereIn('store_id', $storeIds)->where('created_by_business_membership_id', $staff->id);
                $sessions = RegisterSession::query()->whereIn('store_id', $storeIds)->where('opened_by_business_membership_id', $staff->id);

                return [
                    ...$staff->only(['public_id', 'display_name', 'business_role']),
                    'last_active_at' => $sessions->max('updated_at'),
                    'open_sessions' => (clone $sessions)->where('status', 'open')->count(),
                    'sale_count' => (clone $sales)->count(),
                    'sale_value' => (string) (clone $sales)->sum('total_amount'),
                    'discounts' => (string) (clone $sales)->selectRaw('COALESCE(SUM(item_discount_amount + transaction_discount_amount), 0) as total')->value('total'),
                    'variance' => (string) RegisterSession::query()->whereIn('store_id', $storeIds)->where('opened_by_business_membership_id', $staff->id)->sum('variance'),
                    'drawer_movements' => DB::table('register_drawer_movements')->whereIn('store_id', $storeIds)->where('actor_business_membership_id', $staff->id)->count(),
                ];
            });

        return Inertia::render('customer/team/activity', [
            'stores' => $stores->map->only(['public_id', 'name']),
            'activity' => $activity,
        ]);
    }
}
