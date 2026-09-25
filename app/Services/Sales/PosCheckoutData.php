<?php

namespace App\Services\Sales;

use App\Enums\FinancialAccountType;
use App\Models\BusinessMembership;
use App\Models\FinancialAccount;
use App\Models\PaymentMethod;
use App\Models\ProductSerialNumber;
use App\Models\ProductUnit;
use App\Models\Register;
use App\Models\RegisterSession;
use App\Models\Store;
use App\Services\Commerce\CountryCommerceCatalog;
use App\Support\PaymentMethodCatalog;
use Illuminate\Support\Facades\DB;

class PosCheckoutData
{
    public function __construct(private CountryCommerceCatalog $commerce) {}

    /** @return array<string, mixed> */
    public function for(Store $store, BusinessMembership $actor): array
    {
        $store->loadMissing('country');
        $this->ensurePaymentMethods($store);
        $products = ProductUnit::query()->where('product_units.store_id', $store->id)
            ->where('product_units.is_active', true)->where('products.is_active', true)->where('units.is_active', true)
            ->join('products', 'products.id', '=', 'product_units.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'product_units.product_variant_id')
            ->join('units', 'units.id', '=', 'product_units.unit_id')
            ->where(fn ($query) => $query->whereNull('product_units.product_variant_id')->orWhere('product_variants.is_active', true))
            ->leftJoin('inventory_balances', function ($join) use ($store): void {
                $join->on('inventory_balances.product_id', '=', 'products.id')
                    ->where('inventory_balances.store_id', $store->id)
                    ->whereRaw("((products.variant_mode = 'separate' AND inventory_balances.product_variant_id = product_variants.id) OR (products.variant_mode <> 'separate' AND inventory_balances.product_variant_id IS NULL))");
            })
            ->orderBy('products.name')->orderBy('product_variants.name')->orderBy('units.name')->get([
                'products.public_id as catalog_product_id', 'products.name as catalog_product_name',
                'categories.public_id as category_public_id', 'categories.name as category_name',
                'products.photo_path as catalog_product_photo_path',
                DB::raw('COALESCE(product_variants.public_id, products.public_id) as product_id'),
                'products.name as product_name', 'product_variants.name as variant_name',
                'product_units.sku', 'product_units.barcode',
                'units.public_id as unit_id', 'units.name as unit_name', 'units.symbol as unit_symbol',
                'product_units.conversion_factor', 'product_units.selling_price',
                DB::raw("COALESCE(products.tracking_mode, 'standard') as tracking_mode"),
                DB::raw('CASE WHEN product_units.unit_id = products.base_unit_id THEN 1 ELSE 0 END as is_base_unit'),
                DB::raw('COALESCE(inventory_balances.quantity, 0) as stock_quantity'),
                DB::raw('COALESCE(inventory_balances.minimum_quantity, 0) as minimum_quantity'),
            ])->map(function ($product): array {
                $photoPublicId = $product->getAttribute('catalog_product_photo_path')
                    ? $product->getAttribute('catalog_product_id')
                    : null;

                return [
                    ...$product->toArray(),
                    'photo_url' => $photoPublicId ? route('master-data.products.photo', [
                        'product' => $photoPublicId,
                        'v' => substr(hash('sha256', (string) $product->getAttribute('catalog_product_photo_path')), 0, 12),
                    ]) : null,
                ];
            });
        $availableSerials = ProductSerialNumber::query()
            ->where('product_serial_numbers.store_id', $store->id)
            ->where('product_serial_numbers.status', 'available')
            ->join('products', 'products.id', '=', 'product_serial_numbers.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'product_serial_numbers.product_variant_id')
            ->where('products.is_active', true)
            ->get([
                'product_serial_numbers.public_id',
                DB::raw('COALESCE(product_variants.public_id, products.public_id) as product_id'),
                'product_serial_numbers.agent_number',
                'product_serial_numbers.agent_name',
                'product_serial_numbers.agent_position',
                'product_serial_numbers.serial_number',
                'product_serial_numbers.full_serial_number',
            ]);
        $activeAccounts = FinancialAccount::query()->where(['store_id' => $store->id, 'is_active' => true])->whereNull('marketplace_code');
        $cash = (clone $activeAccounts)->where('type', FinancialAccountType::Cash->value)->orderBy('name')->first(['id', 'public_id', 'name']);
        $qrPayment = PaymentMethodCatalog::qrForCountry($store->country?->code);
        $qrAccount = $qrPayment === null ? null : (clone $activeAccounts)
            ->where('payment_code', $qrPayment['code'])->first(['id', 'public_id', 'name', 'payment_code']);
        $primaryIds = array_filter([$cash?->id, $qrAccount?->id]);
        $countryWalletCodes = PaymentMethodCatalog::walletCodesForCountry($store->country?->code);
        $otherMethods = (clone $activeAccounts)->whereIn('type', [FinancialAccountType::Bank->value, FinancialAccountType::EWallet->value])
            ->where(fn ($query) => $query->whereNull('payment_code')->orWhereIn('payment_code', $countryWalletCodes))
            ->when($primaryIds !== [], fn ($query) => $query->whereNotIn('id', $primaryIds))
            ->orderBy('type')->orderBy('name')->get(['public_id', 'name', 'type', 'payment_code'])
            ->map(fn (FinancialAccount $account): array => [
                'method' => $account->type === FinancialAccountType::Bank ? 'bank_transfer' : 'e_wallet',
                'label' => $account->name, 'account_id' => $account->public_id, 'brand' => $account->payment_code,
            ]);

        return [
            'products' => $products,
            'availableSerials' => $availableSerials,
            'paymentMethods' => collect([
                $cash ? ['method' => 'cash', 'label' => __('Cash'), 'account_id' => $cash->public_id, 'brand' => 'cash'] : null,
                $qrAccount ? ['method' => $qrPayment['method'], 'label' => $qrPayment['label'], 'account_id' => $qrAccount->public_id, 'brand' => $qrPayment['code']] : null,
            ])->filter()->concat($otherMethods)->values(),
            'marketplaces' => $this->commerce->marketplaces($store)->map->only(['code', 'label'])->values(),
            'timezone' => $store->settings()->value('timezone') ?? 'Asia/Jakarta',
            'registers' => Register::query()->where(['store_id' => $store->id, 'status' => 'active'])->orderBy('name')->get(['public_id', 'name']),
            'activeRegisterSession' => RegisterSession::query()
                ->where(['store_id' => $store->id, 'opened_by_business_membership_id' => $actor->id, 'status' => 'open'])
                ->with('register:id,public_id,name')->first(),
        ];
    }

    private function ensurePaymentMethods(Store $store): void
    {
        $cash = FinancialAccount::query()->where('store_id', $store->id)->where('type', FinancialAccountType::Cash->value)
            ->orderByDesc('is_active')->orderBy('id')->first();
        if ($cash) {
            if (! $cash->is_active) {
                $cash->forceFill(['is_active' => true])->save();
            }
        } else {
            FinancialAccount::query()->create(['store_id' => $store->id, 'name' => 'Kas', 'type' => FinancialAccountType::Cash->value, 'is_active' => true]);
        }

        $qrPayment = PaymentMethodCatalog::qrForCountry($store->country?->code);
        if ($qrPayment !== null) {
            $qrAccount = FinancialAccount::query()->where('store_id', $store->id)->where('payment_code', $qrPayment['code'])->first();
            $qrAccount ??= FinancialAccount::query()->where('store_id', $store->id)
                ->whereIn('type', [FinancialAccountType::EWallet->value, FinancialAccountType::Bank->value])->whereNull('marketplace_code')
                ->where(fn ($query) => $query->whereNull('payment_code')->orWhereIn('payment_code', PaymentMethodCatalog::qrCodes()))
                ->orderByRaw('CASE WHEN LOWER(name) LIKE ? THEN 0 WHEN type = ? THEN 1 ELSE 2 END', ['%'.strtolower($qrPayment['label']).'%', FinancialAccountType::EWallet->value])
                ->orderByDesc('is_active')->orderBy('id')->first();
            if ($qrAccount) {
                $qrAccount->forceFill([
                    'name' => in_array($qrAccount->name, ['QRIS', 'DuitNow QR', 'PromptPay QR', 'VietQR'], true) ? $qrPayment['label'] : $qrAccount->name,
                    'payment_code' => $qrPayment['code'],
                    'payment_method_id' => PaymentMethod::query()->where('code', $qrPayment['code'])->value('id'),
                    'is_active' => true,
                ])->save();
            } else {
                FinancialAccount::query()->create([
                    'store_id' => $store->id, 'name' => $qrPayment['label'], 'type' => FinancialAccountType::EWallet->value,
                    'payment_code' => $qrPayment['code'], 'payment_method_id' => PaymentMethod::query()->where('code', $qrPayment['code'])->value('id'), 'is_active' => true,
                ]);
            }
        }
        foreach (PaymentMethodCatalog::walletsForCountry($store->country?->code) as $wallet) {
            $account = FinancialAccount::query()->firstOrCreate(
                ['store_id' => $store->id, 'payment_code' => $wallet['code']],
                ['name' => $wallet['label'], 'type' => FinancialAccountType::EWallet->value, 'payment_method_id' => PaymentMethod::query()->where('code', $wallet['code'])->value('id'), 'is_active' => true],
            );
            if (! $account->is_active) {
                $account->forceFill(['is_active' => true])->save();
            }
        }
    }
}
