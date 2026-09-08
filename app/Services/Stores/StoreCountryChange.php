<?php

namespace App\Services\Stores;

use App\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StoreCountryChange
{
    /** @var list<string> */
    private const CURRENCY_BEARING_TABLES = [
        'stock_adjustments',
        'capital_transactions',
        'cash_transactions',
        'purchases',
        'sales',
        'expenses',
    ];

    public function allowed(Store $store): bool
    {
        foreach (self::CURRENCY_BEARING_TABLES as $table) {
            if (DB::table($table)->where('store_id', $store->id)->exists()) {
                return false;
            }
        }

        return true;
    }

    public function assertAllowed(Store $store): void
    {
        if (! $this->allowed($store)) {
            throw ValidationException::withMessages([
                'country' => __('Store country cannot be changed after transactions exist.'),
            ]);
        }
    }
}
