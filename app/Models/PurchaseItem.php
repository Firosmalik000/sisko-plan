<?php

namespace App\Models;

use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'purchase_id', 'product_id', 'product_unit_id', 'product_name', 'sku', 'unit_name', 'unit_symbol', 'quantity', 'conversion_factor', 'base_quantity', 'unit_price', 'line_subtotal', 'allocated_discount', 'allocated_additional_cost', 'landed_total', 'base_unit_cost'])]
class PurchaseItem extends Model
{
    use ImmutableLedgerRecord;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6',
            'conversion_factor' => 'decimal:6',
            'base_quantity' => 'decimal:6',
            'unit_price' => 'decimal:4',
            'line_subtotal' => 'decimal:4',
            'allocated_discount' => 'decimal:4',
            'allocated_additional_cost' => 'decimal:4',
            'landed_total' => 'decimal:4',
            'base_unit_cost' => 'decimal:4',
        ];
    }
}
