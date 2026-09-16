<?php

namespace Tests\Feature;

use App\Actions\Ledgers\PostStockAdjustment;
use App\Actions\Sales\PostMarketplaceSettlement;
use App\Actions\Sales\PostSale;
use App\Actions\Sales\ResolveMarketplaceAccount;
use App\Actions\Sales\ReverseMarketplaceSettlement;
use App\Enums\FinancialAccountType;
use App\Models\BusinessMembership;
use App\Models\FinancialAccount;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\User;
use App\Services\Sales\MarketplaceSettlementCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class MarketplaceSettlementTest extends TestCase
{
    use RefreshDatabase;

    public function test_calculator_is_decimal_safe_and_rejects_negative_net(): void
    {
        $calculator = app(MarketplaceSettlementCalculator::class);
        $this->assertSame(['gross' => '1000.1000', 'fees' => '100.0500', 'other_deductions' => '50.0000', 'net' => '850.0500'], $calculator->calculate('1000.10', '100.05', '50'));

        $this->expectException(ValidationException::class);
        $calculator->calculate('100', '101', '0');
    }

    public function test_settlement_moves_gross_from_clearing_to_bank_and_is_idempotent(): void
    {
        [$store, $actor, $sale, $clearing] = $this->marketplaceSale();
        $bank = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Bank]);
        $action = app(PostMarketplaceSettlement::class);
        $occurredAt = now()->toISOString();
        $first = $action->handle($store, $actor, 'shopee', $bank->id, [$sale->id], '100', '25', $occurredAt, null, 'settlement-1');
        $second = $action->handle($store, $actor, 'shopee', $bank->id, [$sale->id], '100', '25', $occurredAt, null, 'settlement-1');

        $this->assertTrue($first->is($second));
        $this->assertSame('875.0000', $first->net_amount);
        $this->assertDatabaseHas('financial_account_balances', ['financial_account_id' => $clearing->id, 'balance' => 0]);
        $this->assertDatabaseHas('financial_account_balances', ['financial_account_id' => $bank->id, 'balance' => 875]);
        $this->assertDatabaseHas('expenses', [
            'store_id' => $store->id,
            'financial_account_id' => $clearing->id,
            'amount' => 125,
        ]);
        $this->assertDatabaseCount('marketplace_settlements', 1);
    }

    public function test_reversal_is_explicit_and_prevents_replay(): void
    {
        [$store, $actor, $sale] = $this->marketplaceSale();
        $bank = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Bank]);
        $settlement = app(PostMarketplaceSettlement::class)->handle($store, $actor, 'shopee', $bank->id, [$sale->id], '100', '0', now()->toISOString(), null, 'settlement-reverse');
        $reversal = app(ReverseMarketplaceSettlement::class)->handle($settlement, $actor, 'Correction', 'settlement-reversal');

        $this->assertSame($settlement->id, $reversal->reversal_of_settlement_id);
        $this->expectException(ValidationException::class);
        app(ReverseMarketplaceSettlement::class)->handle($settlement, $actor, 'Replay', 'settlement-reversal-2');
    }

    /** @return array{Store,BusinessMembership,Sale,FinancialAccount} */
    private function marketplaceSale(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->ownedBy($owner)->create();
        $actor = BusinessMembership::query()->where(['business_id' => $store->business_id, 'user_id' => $owner->id])->sole();
        $product = Product::factory()->for($store)->create();
        $product->productUnits()->sole()->update(['selling_price' => '1000']);
        app(PostStockAdjustment::class)->handle($store, $actor, 'opening', [[
            'product_id' => $product->id, 'quantity' => '2', 'unit_cost' => '500',
        ]], now()->subMinute()->toISOString(), null, 'marketplace-opening');
        $clearing = app(ResolveMarketplaceAccount::class)->handle($store, 'shopee');
        $sale = app(PostSale::class)->handle($store, $actor, $clearing->id, [[
            'product_unit_id' => $product->productUnits()->sole()->id, 'quantity' => '1', 'item_discount' => '0',
        ]], '0', '1000', now()->toISOString(), null, 'marketplace-sale', salesChannel: 'marketplace', paymentMethod: 'marketplace', marketplaceCode: 'shopee');

        return [$store, $actor, $sale, $clearing];
    }
}
