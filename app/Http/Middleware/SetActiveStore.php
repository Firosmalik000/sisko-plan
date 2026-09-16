<?php

namespace App\Http\Middleware;

use App\Enums\BusinessRole;
use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Store;
use App\Support\CurrentBusiness;
use App\Support\CurrentStore;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetActiveStore
{
    public function __construct(
        private CurrentBusiness $currentBusiness,
        private CurrentStore $currentStore,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $query = Store::query()
            ->where('business_id', $this->currentBusiness->id())
            ->where('status', StoreStatus::Active->value)
            ->when(
                $this->currentBusiness->membership()->business_role === BusinessRole::Staff,
                fn ($stores) => $stores->whereHas('assignments', fn ($assignments) => $assignments
                    ->where('business_membership_id', $this->currentBusiness->membership()->id)
                    ->where('status', MembershipStatus::Active->value)),
            );

        $activeStoreId = (int) $request->session()->get('active_store_id', 0);
        $store = (clone $query)->whereKey($activeStoreId)->first()
            ?? $query->oldest('stores.id')->first();

        if ($store === null) {
            $request->session()->forget('active_store_id');

            return to_route('stores.create');
        }

        $request->session()->put('active_store_id', $store->id);
        $this->currentStore->set($store);

        return $next($request);
    }
}
