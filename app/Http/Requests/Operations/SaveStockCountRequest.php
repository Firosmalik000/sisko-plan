<?php

namespace App\Http\Requests\Operations;

use App\Rules\StockIdentity;
use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SaveStockCountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('countStock', app(CurrentStore::class)->get());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();

        return [
            'items' => ['required', 'array', 'min:1', 'max:1000'],
            'items.*.product_id' => ['required', 'string', 'distinct', new StockIdentity($storeId)],
            'items.*.counted_quantity' => ['present', 'nullable', 'decimal:0,6', 'gte:0'],
        ];
    }
}
