<?php

namespace App\Http\Controllers\Platform;

use App\Actions\Platform\RecordAdminAudit;
use App\Enums\StoreStatus;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Support\Authentication\AuthenticatedPlatformAdmin;
use App\Support\PlatformPermission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search'));

        $stores = Store::query()
            ->with('owner:id,name,email')
            ->with(['country.currency', 'settings'])
            ->with('subscription.plan:id,name')
            ->withCount(['users as active_members_count' => fn ($query) => $query->where('store_memberships.status', 'active')])
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Store $store): array => [
                'public_id' => $store->public_id,
                'name' => $store->name,
                'status' => $store->status->value,
                'owner' => $store->owner->only(['name', 'email']),
                'active_members_count' => $store->active_members_count,
                'country' => $store->country === null ? null : [
                    'code' => $store->country->code,
                    'name' => $store->country->localizedName(),
                ],
                'currency' => $store->settings?->currency ?? $store->country?->currency_code ?? 'IDR',
                'subscription' => $store->subscription === null ? null : ['status' => $store->subscription->status->value, 'plan_name' => $store->subscription->plan->name],
                'created_at' => $store->created_at?->toDateString(),
            ]);

        return Inertia::render('platform/stores/index', [
            'stores' => $stores,
            'filters' => ['search' => $search],
            'can_update_status' => AuthenticatedPlatformAdmin::get($request)->can(PlatformPermission::STORES_STATUS_UPDATE),
        ]);
    }

    public function updateStatus(
        Request $request,
        Store $store,
        RecordAdminAudit $recordAudit,
    ): RedirectResponse {
        $validated = $request->validate([
            'status' => ['required', Rule::in([StoreStatus::Active->value, StoreStatus::Suspended->value])],
        ]);

        $admin = AuthenticatedPlatformAdmin::get($request);

        DB::transaction(function () use ($store, $validated, $admin, $request, $recordAudit): void {
            $lockedStore = Store::query()->lockForUpdate()->findOrFail($store->id);
            abort_if($lockedStore->status === StoreStatus::Archived, 409);
            $before = $lockedStore->status->value;
            $lockedStore->update(['status' => $validated['status']]);
            $recordAudit->handle($admin, 'store.status_updated', $lockedStore, $request->ip(), [
                'before' => $before,
                'after' => $validated['status'],
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Store status updated successfully.')]);

        return back();
    }
}
