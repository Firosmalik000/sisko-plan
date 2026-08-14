<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $quantity
 * @property string $average_cost
 * @property string $inventory_value
 */
#[Fillable(['store_id', 'product_id', 'quantity', 'average_cost', 'inventory_value', 'minimum_quantity'])]
class InventoryBalance extends Model
{
    protected function casts(): array
    {
        return ['quantity' => 'decimal:6', 'average_cost' => 'decimal:4', 'inventory_value' => 'decimal:4', 'minimum_quantity' => 'decimal:6'];
    }
}
