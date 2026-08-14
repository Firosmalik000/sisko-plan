<?php

namespace App\Http\Requests\Purchasing;

use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class StorePurchasePaymentRequest extends PurchasingRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();

        return [
            ...$this->postingRules(),
            'account_id' => ['required', Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'amount' => ['required', 'decimal:0,4', 'gt:0', 'lte:999999999999999.9999'],
        ];
    }
}
