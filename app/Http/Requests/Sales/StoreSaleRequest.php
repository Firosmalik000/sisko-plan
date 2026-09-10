<?php

namespace App\Http\Requests\Sales;

use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Rules\CatalogProductSelection;
use App\Support\CurrentStore;
use App\Support\MarketplaceCatalog;
use App\Support\PaymentMethodCatalog;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSaleRequest extends SaleRequest
{
    protected function prepareForValidation(): void
    {
        $storeId = app(CurrentStore::class)->id();
        $account = FinancialAccount::query()
            ->where('store_id', $storeId)
            ->where('public_id', $this->input('account_id'))
            ->first();
        $salesChannel = $this->input('sales_channel', 'in_store');
        $paymentMethod = $this->input('payment_method');

        $this->merge([
            'customer_name' => $this->trimmedOrNull('customer_name'),
            'customer_phone' => $this->trimmedOrNull('customer_phone'),
            'customer_email' => $this->trimmedOrNull('customer_email'),
            'marketplace_code' => $salesChannel === 'marketplace'
                ? $this->trimmedOrNull('marketplace_code')
                : null,
            'external_order_number' => $salesChannel === 'marketplace'
                ? $this->trimmedOrNull('external_order_number')
                : null,
            'sales_channel' => $salesChannel,
            'payment_method' => is_string($paymentMethod) && $paymentMethod !== ''
                ? $paymentMethod
                : ($account?->type === FinancialAccountType::Cash ? 'cash' : 'qris'),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $money = ['decimal:0,4', 'gte:0', 'lte:999999999999999.9999'];
        $salesChannel = $this->input('sales_channel');
        $paymentMethod = $this->input('payment_method');
        $store = app(CurrentStore::class)->get();
        $store->loadMissing('country');

        return [
            ...$this->postingRules(),
            'sales_channel' => ['required', Rule::in(['in_store', 'marketplace'])],
            'payment_method' => ['required', Rule::in(['cash', 'qris', 'qr_payment', 'bank_transfer', 'e_wallet', 'marketplace'])],
            'account_id' => [
                Rule::requiredIf($salesChannel !== 'marketplace'),
                Rule::prohibitedIf($salesChannel === 'marketplace'),
                'nullable',
                Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true)->whereNull('marketplace_code')),
            ],
            'transaction_discount_amount' => ['required', ...$money],
            'paid_amount' => ['required', ...$money],
            'customer_name' => ['nullable', 'required_with:customer_phone,customer_email', 'string', 'max:160'],
            'customer_phone' => [
                'nullable',
                'required_with:customer_name,customer_email',
                'string',
                'max:30',
                'regex:/^\+?[0-9][0-9().\-\s]{6,29}$/',
            ],
            'customer_email' => ['nullable', 'email:rfc', 'max:254'],
            'marketplace_code' => [
                Rule::requiredIf($salesChannel === 'marketplace'),
                Rule::prohibitedIf($salesChannel !== 'marketplace'),
                'nullable',
                Rule::in(MarketplaceCatalog::codesForCountry($store->country?->code)),
            ],
            'external_order_number' => [Rule::prohibitedIf($salesChannel !== 'marketplace'), 'nullable', 'string', 'max:100'],
            'payment_proof' => [
                Rule::prohibitedIf($paymentMethod === 'cash' || $paymentMethod === 'marketplace'),
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:5120',
            ],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', new CatalogProductSelection($storeId)],
            'items.*.unit_id' => ['required', Rule::exists('units', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
            'items.*.discount_amount' => ['required', ...$money],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->input('sales_channel') === 'marketplace') {
                if ($this->input('payment_method') !== 'marketplace') {
                    $validator->errors()->add('payment_method', __('Transaksi marketplace harus masuk ke saldo marketplace.'));
                }

                return;
            }

            $account = FinancialAccount::query()
                ->where('store_id', app(CurrentStore::class)->id())
                ->where('public_id', $this->input('account_id'))
                ->where('is_active', true)
                ->whereNull('marketplace_code')
                ->first();
            if ($account === null) {
                return;
            }

            $store = app(CurrentStore::class)->get();
            $store->loadMissing('country');
            $valid = PaymentMethodCatalog::acceptsInStoreAccount(
                $account,
                (string) $this->input('payment_method'),
                $store->country?->code,
            );

            if (! $valid) {
                $validator->errors()->add('payment_method', __('Metode bayar tidak sesuai dengan akun penerimaan.'));
            }
        }];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'customer_name.required_with' => __('Nama pelanggan dan nomor telepon harus diisi bersama.'),
            'customer_phone.required_with' => __('Nama pelanggan dan nomor telepon harus diisi bersama.'),
            'customer_phone.regex' => __('Nomor telepon pelanggan tidak valid.'),
            'customer_email.email' => __('Email pelanggan tidak valid.'),
        ];
    }

    private function trimmedOrNull(string $key): ?string
    {
        $value = $this->input($key);

        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
