<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $quantity_change
 * @property string $unit_cost
 * @property string $value_change
 */
#[Fillable(['store_id', 'product_id', 'reason', 'quantity_change', 'unit_cost', 'value_change', 'quantity_after', 'average_cost_after', 'inventory_value_after', 'reference_type', 'reference_id', 'occurred_at', 'notes', 'created_by_user_id'])]
class StockMovement extends Model
{
    use HasPublicId, ImmutableLedgerRecord;

    public const UPDATED_AT = null;
}
