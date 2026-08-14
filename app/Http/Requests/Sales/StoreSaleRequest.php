<?php

namespace App\Http\Requests\Sales;

use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class StoreSaleRequest extends SaleRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $money = ['decimal:0,4', 'gte:0', 'lte:999999999999999.9999'];

        return [
            ...$this->postingRules(),
            'account_id' => ['required', Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'transaction_discount_amount' => ['required', ...$money],
            'paid_amount' => ['required', ...$money],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', Rule::exists('products', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'items.*.unit_id' => ['required', Rule::exists('units', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
            'items.*.discount_amount' => ['required', ...$money],
        ];
    }
}
