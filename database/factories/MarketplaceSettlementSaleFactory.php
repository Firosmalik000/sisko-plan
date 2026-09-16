<?php

namespace Database\Factories;

use App\Models\MarketplaceSettlement;
use App\Models\MarketplaceSettlementSale;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<MarketplaceSettlementSale> */
class MarketplaceSettlementSaleFactory extends Factory
{
    protected $model = MarketplaceSettlementSale::class;

    public function definition(): array
    {
        return [
            'marketplace_settlement_id' => MarketplaceSettlement::factory(),
            'sale_id' => Sale::query()->value('id'),
            'gross_amount' => '1000.0000',
        ];
    }
}
