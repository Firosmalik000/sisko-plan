<?php

namespace App\Http\Requests\Operations;

use App\Rules\StockIdentity;
use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class StockAdjustmentRequest extends LedgerRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();

        return [
            ...$this->commonRules(),
            'type' => ['required', Rule::in(['opening', 'increase', 'decrease', 'damaged', 'lost'])],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'distinct', new StockIdentity($storeId)],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0'],
            'items.*.unit_cost' => ['nullable', 'decimal:0,4', 'gte:0', 'required_if:type,opening,increase'],
        ];
    }
}
