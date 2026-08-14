<?php

namespace App\Models;

use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'stock_adjustment_id', 'product_id', 'quantity_change', 'unit_cost', 'value_change'])]
class StockAdjustmentItem extends Model
{
    use ImmutableLedgerRecord;

    public $timestamps = false;
}
