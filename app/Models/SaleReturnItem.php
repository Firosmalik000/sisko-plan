<?php

namespace App\Models;

use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'sale_return_id', 'sale_item_id', 'product_id', 'product_variant_id', 'quantity', 'base_quantity', 'refund_amount', 'unit_cost_snapshot', 'cogs_reversed', 'gross_profit_reversed'])]
class SaleReturnItem extends Model
{
    use ImmutableLedgerRecord;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6', 'base_quantity' => 'decimal:6', 'refund_amount' => 'decimal:4',
            'unit_cost_snapshot' => 'decimal:4', 'cogs_reversed' => 'decimal:4', 'gross_profit_reversed' => 'decimal:4',
        ];
    }
}
