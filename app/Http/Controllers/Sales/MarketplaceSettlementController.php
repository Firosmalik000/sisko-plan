<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\PostMarketplaceSettlement;
use App\Actions\Sales\ReverseMarketplaceSettlement;
use App\Enums\FinancialAccountType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreMarketplaceSettlementRequest;
use App\Models\FinancialAccount;
use App\Models\MarketplaceSettlement;
use App\Models\Sale;
use App\Services\Commerce\CountryCommerceCatalog;
use App\Support\CurrentBusiness;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceSettlementController extends Controller
{
    public function index(CurrentStore $currentStore, CountryCommerceCatalog $commerce): Response
    {
        $store = $currentStore->get();
        Gate::authorize('manageOperations', $store);

        return Inertia::render('customer/marketplace-settlements/index', [
            'sales' => Sale::query()->where(['store_id' => $store->id, 'sales_channel' => 'marketplace'])
                ->whereDoesntHave('settlementAllocations')->latest('id')->get(['public_id', 'document_number', 'marketplace_code', 'marketplace_name', 'currency_code', 'total_amount', 'occurred_at']),
            'accounts' => FinancialAccount::query()->where('store_id', $store->id)->where('is_active', true)
                ->whereIn('type', [FinancialAccountType::Bank->value, FinancialAccountType::EWallet->value])->orderBy('name')->get(['public_id', 'name']),
            'settlements' => MarketplaceSettlement::query()->where('store_id', $store->id)->latest('id')->paginate(25),
            'marketplaces' => $commerce->marketplaces($store)->map->only(['code', 'label'])->values(),
            'timezone' => $store->settings()->value('timezone') ?? 'Asia/Jakarta',
        ]);
    }

    public function store(StoreMarketplaceSettlementRequest $request, CurrentStore $currentStore, CurrentBusiness $business, PostMarketplaceSettlement $action): RedirectResponse
    {
        $data = $request->validated();
        $store = $currentStore->get();
        $saleIds = array_values(Sale::query()->where('store_id', $store->id)->whereIn('public_id', $data['sale_ids'])
            ->pluck('id')->map(fn (mixed $id): int => (int) $id)->all());
        $destination = FinancialAccount::query()->where(['store_id' => $store->id, 'public_id' => $data['destination_account_id']])->firstOrFail();
        $action->handle($store, $business->membership(), $data['marketplace_code'], $destination->id, $saleIds, $data['fee_amount'], $data['other_deduction_amount'], $data['occurred_at'], $data['notes'] ?? null, $data['idempotency_key']);

        return back();
    }

    public function reverse(Request $request, MarketplaceSettlement $settlement, CurrentStore $currentStore, CurrentBusiness $business, ReverseMarketplaceSettlement $action): RedirectResponse
    {
        $data = $request->validate(['notes' => ['required', 'string', 'max:500'], 'idempotency_key' => ['required', 'uuid']]);
        abort_unless($settlement->store_id === $currentStore->id(), 404);
        Gate::authorize('manageOperations', $currentStore->get());
        $action->handle($settlement, $business->membership(), $data['notes'], $data['idempotency_key']);

        return back();
    }
}
