<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $product_id
 * @property int|null $product_variant_id
 * @property string $quantity
 * @property string $conversion_factor
 * @property string $net_total
 * @property string $cogs_amount
 */
#[Fillable(['store_id', 'sale_id', 'product_id', 'product_variant_id', 'product_unit_id', 'product_name', 'sku', 'barcode', 'unit_name', 'unit_symbol', 'quantity', 'conversion_factor', 'base_quantity', 'unit_price', 'gross_subtotal', 'item_discount_amount', 'allocated_transaction_discount', 'net_total', 'unit_cost_snapshot', 'cogs_amount', 'gross_profit'])]
class SaleItem extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:6', 'conversion_factor' => 'decimal:6', 'base_quantity' => 'decimal:6',
            'unit_price' => 'decimal:4', 'gross_subtotal' => 'decimal:4', 'item_discount_amount' => 'decimal:4',
            'allocated_transaction_discount' => 'decimal:4', 'net_total' => 'decimal:4',
            'unit_cost_snapshot' => 'decimal:4', 'cogs_amount' => 'decimal:4', 'gross_profit' => 'decimal:4',
        ];
    }
}
