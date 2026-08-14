<?php

namespace App\Http\Requests\Operations;

use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class MinimumStockRequest extends LedgerRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'product_id' => ['required', Rule::exists('products', 'public_id')->where('store_id', app(CurrentStore::class)->id())],
            'minimum_quantity' => ['required', 'decimal:0,6', 'gte:0'],
        ];
    }
}
