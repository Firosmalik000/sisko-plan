<?php

namespace App\Http\Requests\Sales;

use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class StoreSaleReturnRequest extends SaleRequest
{
    protected string $ability = 'manageSaleReturns';

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();

        return [
            ...$this->postingRules(),
            'account_id' => ['required', Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.sale_item_id' => ['required', 'distinct', Rule::exists('sale_items', 'public_id')->where('store_id', $storeId)],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
        ];
    }
}
