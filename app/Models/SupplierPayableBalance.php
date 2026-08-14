<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** @property string $balance */
#[Fillable(['store_id', 'supplier_id', 'balance'])]
class SupplierPayableBalance extends Model
{
    protected function casts(): array
    {
        return ['balance' => 'decimal:4'];
    }
}
