<?php

namespace App\Http\Requests\Operations;

use App\Rules\StockIdentity;
use App\Support\CurrentStore;

class MinimumStockRequest extends LedgerRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'product_id' => ['required', new StockIdentity(app(CurrentStore::class)->id())],
            'minimum_quantity' => ['required', 'decimal:0,6', 'gte:0'],
        ];
    }
}
