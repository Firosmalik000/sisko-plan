<?php

namespace Database\Factories;

use App\Enums\FinancialAccountType;
use App\Models\BusinessMembership;
use App\Models\FinancialAccount;
use App\Models\Marketplace;
use App\Models\MarketplaceSettlement;
use App\Models\Store;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<MarketplaceSettlement> */
class MarketplaceSettlementFactory extends Factory
{
    protected $model = MarketplaceSettlement::class;

    public function definition(): array
    {
        return [
            'store_id' => Store::factory(),
            'marketplace_id' => Marketplace::query()->value('id'),
            'clearing_account_id' => FinancialAccount::factory()->state(['type' => FinancialAccountType::MarketplaceClearing]),
            'destination_account_id' => FinancialAccount::factory()->state(['type' => FinancialAccountType::Bank]),
            'currency_code' => 'IDR',
            'gross_amount' => '1000.0000',
            'fee_amount' => '100.0000',
            'other_deduction_amount' => '0.0000',
            'net_amount' => '900.0000',
            'idempotency_key' => (string) Str::uuid(),
            'request_hash' => hash('sha256', (string) Str::uuid()),
            'created_by_business_membership_id' => BusinessMembership::factory(),
            'occurred_at' => now(),
        ];
    }
}
