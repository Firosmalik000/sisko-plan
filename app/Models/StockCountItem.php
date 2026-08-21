<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** @property int|null $product_variant_id */
#[Fillable([
    'store_id', 'stock_count_id', 'product_id', 'product_variant_id', 'system_quantity',
    'counted_quantity', 'difference_quantity', 'snapshot_unit_cost',
])]
class StockCountItem extends Model
{
    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsTo<StockCount, $this> */
    public function stockCount(): BelongsTo
    {
        return $this->belongsTo(StockCount::class);
    }

    protected function casts(): array
    {
        return [
            'system_quantity' => 'decimal:6',
            'counted_quantity' => 'decimal:6',
            'difference_quantity' => 'decimal:6',
            'snapshot_unit_cost' => 'decimal:4',
        ];
    }
}
