<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Store;
use App\Models\User;
use App\Support\MarketplaceCatalog;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class NativeReceiptController extends Controller
{
    public function __invoke(Request $request, Sale $sale): JsonResponse
    {
        $locale = $request->string('locale')->toString();
        if (in_array($locale, ['id', 'en', 'ms', 'vi'], true)) {
            app()->setLocale($locale);
        }

        $store = Store::query()->with(['country', 'settings'])->findOrFail($sale->store_id);
        $cashierName = User::query()->whereKey($sale->created_by_user_id)->valueOrFail('name');
        $items = SaleItem::query()
            ->where(['store_id' => $store->id, 'sale_id' => $sale->id])
            ->orderBy('id')
            ->get(['product_name', 'unit_symbol', 'quantity', 'unit_price', 'net_total'])
            ->map->only(['product_name', 'unit_symbol', 'quantity', 'unit_price', 'net_total']);
        $payment = DB::table('sale_payments')
            ->where(['sale_payments.store_id' => $store->id, 'sale_payments.sale_id' => $sale->id])
            ->join('financial_accounts', 'financial_accounts.id', '=', 'sale_payments.financial_account_id')
            ->firstOrFail(['sale_payments.tendered_amount', 'sale_payments.change_amount', 'financial_accounts.name as account_name']);
        $settings = $store->settings;
        $timezone = $settings->timezone ?? 'Asia/Jakarta';
        $currencyCode = $settings->currency ?? $store->country()->value('currency_code') ?? 'IDR';
        $currency = Currency::query()->find($currencyCode);

        return response()->json([
            'version' => 1,
            'store_id' => $store->public_id,
            'sale_id' => $sale->public_id,
            'locale' => app()->getLocale(),
            'currency' => $currencyCode,
            'currency_format' => [
                'symbol' => $currency->symbol ?? $currencyCode,
                'decimal_places' => $currency->decimal_places ?? 0,
                'symbol_position' => $currency->symbol_position ?? 'before',
            ],
            'timezone' => $timezone,
            'receipt' => [
                'store_name' => $store->name,
                'address' => $settings->address,
                'header' => $settings->receipt_header ?? __('Bukti penjualan'),
                'footer' => $settings->receipt_footer ?? __('Terima kasih. Simpan struk ini untuk referensi retur.'),
                'paper_size' => $settings->receipt_paper_size ?? '58mm',
                'show_address' => $settings->receipt_show_address ?? true,
                'show_cashier' => $settings->receipt_show_cashier ?? true,
            ],
            'sale' => [
                ...$sale->only(['document_number', 'customer_name', 'customer_email', 'sales_channel', 'external_order_number', 'subtotal', 'item_discount_amount', 'transaction_discount_amount', 'total_amount']),
                'marketplace_label' => $sale->marketplace_code === null
                    ? null
                    : MarketplaceCatalog::label($store->country?->code, $sale->marketplace_code),
                'occurred_at' => CarbonImmutable::parse($sale->occurred_at)->timezone($timezone)->format('d/m/Y H:i'),
                'cashier_name' => $cashierName,
            ],
            'items' => $items,
            'payment' => [
                'account_name' => $payment->account_name,
                'tendered_amount' => $payment->tendered_amount,
                'change_amount' => $payment->change_amount,
            ],
            'labels' => [
                'cashier' => __('Cashier'),
                'customer' => __('Customer'),
                'order' => __('Order'),
                'subtotal' => __('Subtotal'),
                'item_discount' => __('Item discount'),
                'transaction_discount' => __('Transaction discount'),
                'total' => __('Total'),
                'paid' => __('Paid'),
                'change' => __('Change'),
            ],
        ])->header('Cache-Control', 'private, no-store');
    }
}
