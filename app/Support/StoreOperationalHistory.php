<?php

namespace App\Support;

use App\Models\Store;
use Illuminate\Support\Facades\DB;

class StoreOperationalHistory
{
    /** @var list<string> */
    private const TABLES = [
        'stock_adjustments', 'stock_movements', 'account_transfers', 'capital_transactions',
        'cash_transactions', 'purchases', 'purchase_payments', 'sales', 'sale_returns', 'expenses',
    ];

    public function hasPostedRecords(Store $store): bool
    {
        foreach (self::TABLES as $table) {
            if (DB::table($table)->where('store_id', $store->id)->exists()) {
                return true;
            }
        }

        return false;
    }
}
