<?php

namespace App\Http\Controllers\Sales;

use App\Actions\Sales\PostSale;
use App\Actions\Sales\ResolveMarketplaceAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sales\StoreSaleRequest;
use App\Models\BusinessMembership;
use App\Models\FinancialAccount;
use App\Models\ProductUnit;
use App\Models\RegisterSession;
use App\Models\Store;
use App\Services\Sales\PosCheckoutData;
use App\Support\CurrentBusiness;
use App\Support\CurrentPosDevice;
use App\Support\CurrentStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function index(CurrentStore $currentStore, CurrentBusiness $currentBusiness, PosCheckoutData $checkout): Response
    {
        $store = $currentStore->get();
        Gate::authorize('manageSales', $store);

        return Inertia::render('customer/pos/index', $checkout->for($store, $currentBusiness->membership()));
    }

    public function store(StoreSaleRequest $request, CurrentStore $currentStore, PostSale $action, ResolveMarketplaceAccount $marketplaceAccounts): RedirectResponse
    {
        $data = $request->validated();
        $storeId = $currentStore->id();
        $store = $currentStore->get();
        $accountId = $data['sales_channel'] === 'marketplace'
            ? $marketplaceAccounts->handle($store, $data['marketplace_code'])->id
            : FinancialAccount::query()->where(['store_id' => $storeId, 'public_id' => $data['account_id']])->valueOrFail('id');
        $items = [];
        foreach ($data['items'] as $item) {
            $productUnitId = ProductUnit::query()->where('product_units.store_id', $storeId)
                ->join('products', 'products.id', '=', 'product_units.product_id')
                ->leftJoin('product_variants', 'product_variants.id', '=', 'product_units.product_variant_id')
                ->join('units', 'units.id', '=', 'product_units.unit_id')
                ->where('products.is_active', true)
                ->where(fn ($query) => $query->where('products.public_id', $item['product_id'])->whereNull('product_units.product_variant_id')->orWhere('product_variants.public_id', $item['product_id']))
                ->where([
                    'units.public_id' => $item['unit_id'], 'units.is_active' => true,
                    'product_units.is_active' => true,
                ])->valueOrFail('product_units.id');
            $items[] = [
                'product_unit_id' => $productUnitId,
                'quantity' => $item['quantity'],
                'item_discount' => $item['discount_amount'],
                'serial_number_ids' => $item['serial_number_ids'] ?? [],
            ];
        }
        $actor = $this->actor($request, $store);
        $terminalDevice = $request->attributes->get('pos_actor') instanceof BusinessMembership
            ? app(CurrentPosDevice::class)->get()
            : null;
        $registerSession = $data['sales_channel'] === 'in_store' && filled($data['register_session_id'] ?? null)
            ? RegisterSession::query()->where(['store_id' => $store->id, 'public_id' => $data['register_session_id']])->firstOrFail()
            : null;
        $sale = $action->handle(
            $store, $actor, $accountId, $items,
            $data['transaction_discount_amount'], $data['paid_amount'], $data['occurred_at'],
            $data['notes'] ?? null, $data['idempotency_key'], $request->ip(), $request->file('payment_proof'),
            $data['customer_name'] ?? null, $data['customer_phone'] ?? null,
            $data['customer_email'] ?? null, $data['sales_channel'], $data['payment_method'],
            $data['marketplace_code'] ?? null, $data['external_order_number'] ?? null,
            true,
            $registerSession,
            $terminalDevice,
            $terminalDevice !== null || $registerSession !== null,
        );
        Inertia::flash('toast', ['type' => 'success', 'message' => __('Sale posted successfully.')]);

        return $terminalDevice !== null
            ? to_route('terminal.home')
            : to_route('sales.show', ['sale' => $sale, 'print' => 1]);
    }

    private function actor(Request $request, Store $store): BusinessMembership
    {
        $terminalActor = $request->attributes->get('pos_actor');
        if ($terminalActor instanceof BusinessMembership) {
            return BusinessMembership::operational($store, $terminalActor);
        }
        $user = $request->user();
        abort_unless($user !== null, 401);

        return BusinessMembership::operational($store, $user);
    }
}
