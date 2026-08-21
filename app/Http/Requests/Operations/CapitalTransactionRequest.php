<?php

namespace App\Http\Requests\Operations;

use App\Rules\StockIdentity;
use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class CapitalTransactionRequest extends LedgerRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $isCash = in_array($this->input('type'), ['cash_contribution', 'cash_withdrawal'], true);

        return [
            ...$this->commonRules(),
            'type' => ['required', Rule::in(['cash_contribution', 'cash_withdrawal', 'inventory_contribution', 'inventory_withdrawal'])],
            'account_id' => [Rule::excludeIf(! $isCash), 'required', Rule::exists('financial_accounts', 'public_id')->where('store_id', $storeId)],
            'amount' => [Rule::excludeIf(! $isCash), 'required', 'decimal:0,4', 'gt:0'],
            'items' => [Rule::excludeIf($isCash), 'required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => [Rule::excludeIf($isCash), 'required', 'distinct', ...($isCash ? [] : [new StockIdentity($storeId)])],
            'items.*.quantity' => [Rule::excludeIf($isCash), 'required', 'decimal:0,6', 'gt:0'],
            'items.*.unit_cost' => [Rule::excludeIf($isCash), 'nullable', 'required_if:type,inventory_contribution', 'decimal:0,4', 'gte:0'],
        ];
    }
}
