<?php

namespace App\Http\Requests\Operations;

use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class CapitalTransactionRequest extends LedgerRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();

        return [
            ...$this->commonRules(),
            'type' => ['required', Rule::in(['cash_contribution', 'cash_withdrawal', 'inventory_contribution', 'inventory_withdrawal'])],
            'account_id' => ['nullable', 'required_if:type,cash_contribution,cash_withdrawal', Rule::exists('financial_accounts', 'public_id')->where('store_id', $storeId)],
            'amount' => ['nullable', 'required_if:type,cash_contribution,cash_withdrawal', 'decimal:0,4', 'gt:0'],
            'items' => ['nullable', 'required_if:type,inventory_contribution,inventory_withdrawal', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'distinct', Rule::exists('products', 'public_id')->where('store_id', $storeId)],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0'],
            'items.*.unit_cost' => ['nullable', 'required_if:type,inventory_contribution', 'decimal:0,4', 'gte:0'],
        ];
    }
}
