<?php

namespace App\Http\Middleware;

use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Store;
use App\Support\CurrentStore;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SetActiveStore
{
    public function __construct(private CurrentStore $currentStore) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('web')->user();
        abort_unless($user !== null, 401);

        $query = Store::query()
            ->where('status', StoreStatus::Active->value)
            ->whereHas('users', fn ($membership) => $membership
                ->where('users.id', $user->id)
                ->where('store_user.status', MembershipStatus::Active->value));

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
