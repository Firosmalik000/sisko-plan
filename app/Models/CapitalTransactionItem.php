<?php

namespace App\Models;

use App\Models\Concerns\ImmutableLedgerRecord;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_id', 'capital_transaction_id', 'product_id', 'quantity', 'unit_cost', 'total_value'])]
class CapitalTransactionItem extends Model
{
    use ImmutableLedgerRecord;

    public $timestamps = false;
}
