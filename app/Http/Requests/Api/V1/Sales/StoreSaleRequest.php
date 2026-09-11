<?php

namespace App\Http\Requests\Api\V1\Sales;

use App\Models\FinancialAccount;
use App\Models\Store;
use App\Support\MarketplaceCatalog;
use App\Support\PaymentMethodCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validasi `POST /stores/{store}/sales` (online sale) untuk API mobile
 * (design §3.6, Req 12.6, 12.9, 26, 27).
 *
 * FormRequest API sendiri — TIDAK memakai `App\Http\Requests\Sales\StoreSaleRequest`
 * (web) yang bergantung pada `CurrentStore`/Gate/session Inertia. Aturan bisnis
 * setara: kombinasi channel/metode/akun divalidasi ulang otoritatif di
 * `PostSale`; FormRequest ini fast-gate bentuk payload.
 *
 * Identifier eksternal:
 * - `account_public_id` (ULID) → diresolve controller ke id internal
 * - `items[].product_unit_id` (integer sebagai string; ProductUnit tanpa public_id)
 *
 * Idempotency: `client_operation_id` (UUID/ULID string) wajib, sejalan dengan
 * `sale.create` command offline. Membership + tenant sudah divalidasi middleware
 * `store.membership`; ability `sale.create` dicek controller sebelum FormRequest.
 */
class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $salesChannel = $this->input('sales_channel', 'in_store');
        $headerIdempotency = $this->header('Idempotency-Key');
        $clientOperationId = $this->input('client_operation_id');
        if ((! is_string($clientOperationId) || trim($clientOperationId) === '') && is_string($headerIdempotency) && trim($headerIdempotency) !== '') {
            $clientOperationId = trim($headerIdempotency);
        }

        // Field marketplace di-trim apa adanya (tidak di-null berdasarkan channel)
        // sehingga aturan `prohibitedIf` menolak in_store yang mengirim field
        // marketplace secara eksplisit (Req 27.4), bukan diam-diam mengabaikan.
        $this->merge([
            'sales_channel' => $salesChannel,
            'client_operation_id' => is_string($clientOperationId) && trim($clientOperationId) !== '' ? trim($clientOperationId) : null,
            'customer_name' => $this->trimmedOrNull('customer_name'),
            'customer_phone' => $this->trimmedOrNull('customer_phone'),
            'customer_email' => $this->trimmedOrNull('customer_email'),
            'marketplace_code' => $this->trimmedOrNull('marketplace_code'),
            'external_order_number' => $this->trimmedOrNull('external_order_number'),
        ]);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $store = $this->route('store');
        $storeId = $store instanceof Store ? $store->id : 0;
        $money = ['decimal:0,4', 'gte:0', 'lte:999999999999999.9999'];
        $salesChannel = $this->input('sales_channel');
        $countryCode = $store instanceof Store ? $store->country()->value('code') : null;

        return [
            'client_operation_id' => ['required', 'string', 'max:64'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'sales_channel' => ['required', Rule::in(['in_store', 'marketplace'])],
            'payment_method' => ['required', Rule::in(['cash', 'qris', 'qr_payment', 'bank_transfer', 'e_wallet', 'marketplace'])],
            'account_public_id' => [
                Rule::requiredIf($salesChannel !== 'marketplace'),
                Rule::prohibitedIf($salesChannel === 'marketplace'),
                'nullable',
                'string',
                Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query
                    ->where('store_id', $storeId)
                    ->where('is_active', true)
                    ->whereNull('marketplace_code')),
            ],
            'transaction_discount' => ['required', ...$money],
            'paid_amount' => ['required', ...$money],
            'customer_name' => ['nullable', 'required_with:customer_phone', 'string', 'max:160'],
            'customer_phone' => [
                'nullable',
                'required_with:customer_name',
                'string',
                'max:30',
                'regex:/^\+?[0-9][0-9().\-\s]{6,29}$/',
            ],
            'customer_email' => ['nullable', 'email:rfc', 'max:254'],
            'marketplace_code' => [
                Rule::requiredIf($salesChannel === 'marketplace'),
                Rule::prohibitedIf($salesChannel !== 'marketplace'),
                'nullable',
                'string',
                Rule::in(MarketplaceCatalog::codesForCountry($countryCode)),
            ],
            'external_order_number' => [
                Rule::prohibitedIf($salesChannel !== 'marketplace'),
                'nullable',
                'string',
                'max:100',
            ],
            'payment_proof' => [
                Rule::prohibitedIf($this->input('payment_method') === 'cash' || $salesChannel === 'marketplace'),
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp,pdf',
                'max:5120',
            ],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_unit_id' => ['required', 'string', 'regex:/^[0-9]+$/'],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
            'items.*.item_discount' => ['required', ...$money],
        ];
    }

    /**
     * Validasi kombinasi channel/metode/akun setara `PostSale` sebagai fast-gate
     * (server tetap otoritatif di dalam Action). Marketplace harus memakai metode
     * marketplace; in_store menolak akun/metode marketplace.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $store = $this->route('store');
            if (! $store instanceof Store) {
                return;
            }

            if ($this->input('sales_channel') === 'marketplace') {
                if ($this->input('payment_method') !== 'marketplace') {
                    $validator->errors()->add('payment_method', __('Transaksi marketplace harus masuk ke saldo marketplace.'));
                }

                return;
            }

            if ($this->input('payment_method') === 'marketplace') {
                $validator->errors()->add('payment_method', __('Metode marketplace hanya untuk channel marketplace.'));

                return;
            }

            $account = FinancialAccount::query()
                ->where('store_id', $store->id)
                ->where('public_id', $this->input('account_public_id'))
                ->where('is_active', true)
                ->whereNull('marketplace_code')
                ->first();
            if ($account === null) {
                return;
            }

            $valid = PaymentMethodCatalog::acceptsInStoreAccount(
                $account,
                (string) $this->input('payment_method'),
                $store->country()->value('code'),
            );

            if (! $valid) {
                $validator->errors()->add('payment_method', __('Metode bayar tidak sesuai dengan akun penerimaan.'));
            }
        }];
    }

    /**
     * @return array<string, string>
     */
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
