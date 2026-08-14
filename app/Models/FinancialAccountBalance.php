<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/** @property string $balance */
#[Fillable(['store_id', 'financial_account_id', 'balance'])]
class FinancialAccountBalance extends Model
{
    protected function casts(): array
    {
        return ['balance' => 'decimal:4'];
    }
}
