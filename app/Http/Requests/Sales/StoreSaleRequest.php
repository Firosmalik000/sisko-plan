<?php

namespace App\Http\Requests\Sales;

use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Rules\CatalogProductSelection;
use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class StoreSaleRequest extends SaleRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'customer_name' => $this->trimmedOrNull('customer_name'),
            'customer_phone' => $this->trimmedOrNull('customer_phone'),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $money = ['decimal:0,4', 'gte:0', 'lte:999999999999999.9999'];
        $accountType = FinancialAccount::query()
            ->where('store_id', $storeId)
            ->where('public_id', $this->input('account_id'))
            ->value('type');

        return [
            ...$this->postingRules(),
            'account_id' => ['required', Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'transaction_discount_amount' => ['required', ...$money],
            'paid_amount' => ['required', ...$money],
            'customer_name' => ['nullable', 'required_with:customer_phone', 'string', 'max:160'],
            'customer_phone' => [
                'nullable',
                'required_with:customer_name',
                'string',
                'max:30',
                'regex:/^\+?[0-9][0-9().\-\s]{6,29}$/',
            ],
            'payment_proof' => [
                Rule::prohibitedIf($accountType === FinancialAccountType::Cash->value),
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

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'customer_name.required_with' => __('Nama pelanggan dan nomor telepon harus diisi bersama.'),
            'customer_phone.required_with' => __('Nama pelanggan dan nomor telepon harus diisi bersama.'),
            'customer_phone.regex' => __('Nomor telepon pelanggan tidak valid.'),
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
