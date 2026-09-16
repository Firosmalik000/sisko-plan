<?php

namespace App\Http\Requests\Sales;

use App\Services\Commerce\CountryCommerceCatalog;
use App\Support\CurrentStore;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMarketplaceSettlementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manageOperations', app(CurrentStore::class)->get()) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $store = app(CurrentStore::class)->get();

        return [
            'marketplace_code' => ['required', Rule::in(app(CountryCommerceCatalog::class)->marketplaces($store)->pluck('code')->all())],
            'destination_account_id' => ['required', 'string', 'size:26'],
            'sale_ids' => ['required', 'array', 'min:1'],
            'sale_ids.*' => ['required', 'string', 'size:26', 'distinct'],
            'fee_amount' => ['required', 'decimal:0,4', 'min:0'],
            'other_deduction_amount' => ['required', 'decimal:0,4', 'min:0'],
            'occurred_at' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'idempotency_key' => ['required', 'uuid'],
        ];
    }
}
