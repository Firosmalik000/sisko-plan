<?php

namespace App\Models;

use Database\Factories\MarketplaceSettlementSaleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['marketplace_settlement_id', 'sale_id', 'gross_amount'])]
class MarketplaceSettlementSale extends Model
{
    /** @use HasFactory<MarketplaceSettlementSaleFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return ['gross_amount' => 'decimal:4'];
    }
}
