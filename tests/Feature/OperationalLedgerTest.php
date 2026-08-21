<?php

namespace Tests\Feature;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\PostAccountTransfer;
use App\Actions\Ledgers\PostCapitalTransaction;
use App\Actions\Ledgers\PostOpeningCash;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\CapitalTransaction;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountBalance;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockAdjustment;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class OperationalLedgerTest extends TestCase
{
    use RefreshDatabase;

    public function test_opening_stock_and_moving_average_reconcile_with_projection(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $action = app(PostStockAdjustment::class);
        $action->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '10', 'unit_cost' => '1000']], now()->toISOString(), null, 'opening-1');
        $action->handle($store, $owner, 'increase', [['product_id' => $product->id, 'quantity' => '10', 'unit_cost' => '2000']], now()->toISOString(), null, 'increase-1');

        $balance = InventoryBalance::query()->where('product_id', $product->id)->sole();
        $this->assertSame('20.000000', $balance->quantity);
        $this->assertSame('1500.0000', $balance->average_cost);
        $this->assertSame('30000.0000', $balance->inventory_value);
        $this->assertEquals(20, StockMovement::query()->sum('quantity_change'));
        $this->assertEquals(30000, StockMovement::query()->sum('value_change'));
    }

    public function test_stock_adjustment_rejects_negative_stock_without_partial_document(): void
    {
        [$owner, $store, $product] = $this->fixtures();

        try {
            app(PostStockAdjustment::class)->handle($store, $owner, 'lost', [['product_id' => $product->id, 'quantity' => '1']], now()->toISOString(), null, 'lost-1');
            $this->fail('Negative stock should have been rejected.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('stock_adjustments', 0);
            $this->assertDatabaseCount('stock_movements', 0);
            $this->assertDatabaseCount('inventory_balances', 0);
        }
    }

    public function test_opening_cash_and_cash_capital_contribution_are_separate_postings(): void
    {
        [$owner, $store, , $cash] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '50000', now()->toISOString(), null, 'cash-opening-1');
        app(PostCapitalTransaction::class)->handle($store, $owner, 'cash_contribution', $cash->id, '25000', [], now()->toISOString(), null, 'capital-cash-1');

        $this->assertSame('75000.0000', FinancialAccountBalance::query()->sole()->balance);
        $this->assertEquals(25000, CapitalTransaction::query()->sole()->total_value);
        $this->assertDatabaseHas('cash_transactions', ['reason' => 'opening_balance', 'amount' => 50000]);
        $this->assertDatabaseHas('cash_transactions', ['reason' => 'cash_contribution', 'amount' => 25000]);
    }

    public function test_capital_http_validation_ignores_fields_from_the_inactive_asset_type(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $session = ['active_store_id' => $store->id];
        $occurredAt = now()->toISOString();

        $this->actingAs($owner)->withSession($session)->post(route('operations.capital.store'), [
            'type' => 'cash_contribution',
            'account_id' => $cash->public_id,
            'amount' => '10000',
            'items' => [['product_id' => $product->public_id, 'quantity' => '', 'unit_cost' => '']],
            'occurred_at' => $occurredAt,
            'idempotency_key' => (string) Str::uuid(),
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->actingAs($owner)->withSession($session)->post(route('operations.capital.store'), [
            'type' => 'inventory_contribution',
            'account_id' => $cash->public_id,
            'amount' => '',
            'items' => [['product_id' => $product->public_id, 'quantity' => '2', 'unit_cost' => '1500']],
            'occurred_at' => $occurredAt,
            'idempotency_key' => (string) Str::uuid(),
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseCount('capital_transactions', 2);
        $this->assertSame('10000.0000', FinancialAccountBalance::query()->sole()->balance);
        $this->assertSame('2.000000', InventoryBalance::query()->sole()->quantity);
    }

    public function test_cash_withdrawal_rejects_insufficient_balance(): void
    {
        [$owner, $store, , $cash] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '1000', now()->toISOString(), null, 'cash-opening-2');

        $this->expectException(ValidationException::class);
        try {
            app(PostCapitalTransaction::class)->handle($store, $owner, 'cash_withdrawal', $cash->id, '2000', [], now()->toISOString(), null, 'withdraw-1');
        } finally {
            $this->assertDatabaseCount('capital_transactions', 0);
            $this->assertSame('1000.0000', FinancialAccountBalance::query()->sole()->balance);
        }
    }

    public function test_inventory_capital_contribution_and_withdrawal_use_inventory_cost(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $capital = app(PostCapitalTransaction::class);
        $capital->handle($store, $owner, 'inventory_contribution', null, null, [['product_id' => $product->id, 'quantity' => '5', 'unit_cost' => '4000']], now()->toISOString(), null, 'capital-stock-1');
        $capital->handle($store, $owner, 'inventory_withdrawal', null, null, [['product_id' => $product->id, 'quantity' => '2']], now()->toISOString(), null, 'capital-stock-2');

        $this->assertSame('3.000000', InventoryBalance::query()->sole()->quantity);
        $this->assertEquals([20000, 8000], CapitalTransaction::query()->orderBy('id')->pluck('total_value')->all());
    }

    public function test_transfer_keeps_total_cash_unchanged_and_retry_is_idempotent(): void
    {
        [$owner, $store, , $cash, $bank] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '10000', now()->toISOString(), null, 'cash-opening-3');
        $transfer = app(PostAccountTransfer::class);
        $occurredAt = now()->toISOString();
        $first = $transfer->handle($store, $owner, $cash->id, $bank->id, '4000', $occurredAt, null, 'transfer-1');
        $second = $transfer->handle($store, $owner, $cash->id, $bank->id, '4000', $occurredAt, null, 'transfer-1');

        $this->assertTrue($first->is($second));
        $this->assertDatabaseCount('account_transfers', 1);
        $this->assertDatabaseCount('cash_transactions', 3);
        $this->assertEquals(10000, FinancialAccountBalance::query()->sum('balance'));
        $this->assertSame(['6000.0000', '4000.0000'], FinancialAccountBalance::query()->orderBy('financial_account_id')->pluck('balance')->all());
    }

    public function test_audit_failure_rolls_back_capital_and_cash_ledgers(): void
    {
        [$owner, $store, , $cash] = $this->fixtures();
        $this->mock(RecordAudit::class)->shouldReceive('handle')->andThrow(new RuntimeException('Injected audit failure'));

        try {
            app(PostCapitalTransaction::class)->handle($store, $owner, 'cash_contribution', $cash->id, '5000', [], now()->toISOString(), null, 'rollback-1');
            $this->fail('Injected failure should be thrown.');
        } catch (RuntimeException) {
            $this->assertDatabaseCount('capital_transactions', 0);
            $this->assertDatabaseCount('cash_transactions', 0);
            $this->assertDatabaseCount('financial_account_balances', 0);
        }
    }

    public function test_cross_store_product_and_account_references_are_rejected(): void
    {
        [$owner, $store] = $this->fixtures();
        [, , $foreignProduct, $foreignCash] = $this->fixtures();

        try {
            app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $foreignProduct->id, 'quantity' => '1', 'unit_cost' => '1']], now()->toISOString(), null, 'cross-stock');
            $this->fail('Cross-store product should be rejected.');
        } catch (ModelNotFoundException) {
            $this->assertDatabaseCount('stock_adjustments', 0);
        }

        $this->expectException(ModelNotFoundException::class);
        app(PostOpeningCash::class)->handle($store, $owner, $foreignCash->id, '1', now()->toISOString(), null, 'cross-cash');
    }

    public function test_owner_can_use_operational_pages_and_post_through_http(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('operations.inventory'))->assertOk();
        $this->actingAs($owner)->withSession($session)->get(route('operations.cash'))->assertOk();
        $this->actingAs($owner)->withSession($session)->get(route('operations.capital'))->assertOk();
        $this->actingAs($owner)->withSession($session)->post(route('operations.inventory.adjustments.store'), [
            'type' => 'opening',
            'occurred_at' => now()->toISOString(),
            'idempotency_key' => (string) Str::uuid(),
            'items' => [['product_id' => $product->public_id, 'quantity' => '3', 'unit_cost' => '1200']],
        ])->assertRedirect();
        $this->actingAs($owner)->withSession($session)->post(route('operations.inventory.minimum-stock.store'), [
            'product_id' => $product->public_id,
            'minimum_quantity' => '2',
        ])->assertRedirect();

        $this->assertSame('3.000000', InventoryBalance::query()->sole()->quantity);
        $this->assertSame('2.000000', InventoryBalance::query()->sole()->minimum_quantity);
    }

    public function test_cashier_can_view_but_cannot_post_operational_ledgers(): void
    {
        [, $store, $product] = $this->fixtures();
        $cashier = User::factory()->create();
        $store->users()->attach($cashier, ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value]);
        $session = ['active_store_id' => $store->id];

        $this->actingAs($cashier)->withSession($session)->get(route('operations.inventory'))->assertOk();
        $this->actingAs($cashier)->withSession($session)->post(route('operations.inventory.adjustments.store'), [
            'type' => 'opening', 'occurred_at' => now()->toISOString(), 'idempotency_key' => (string) Str::uuid(),
            'items' => [['product_id' => $product->public_id, 'quantity' => '1', 'unit_cost' => '1']],
        ])->assertForbidden();
        $this->assertDatabaseCount('stock_adjustments', 0);
    }

    public function test_http_validation_rejects_cross_store_ledger_reference(): void
    {
        [$owner, $store] = $this->fixtures();
        [, , $foreignProduct] = $this->fixtures();

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('operations.inventory.adjustments.store'), [
                'type' => 'opening', 'occurred_at' => now()->toISOString(), 'idempotency_key' => (string) Str::uuid(),
                'items' => [['product_id' => $foreignProduct->public_id, 'quantity' => '1', 'unit_cost' => '1']],
            ])->assertSessionHasErrors('items.0.product_id');
        $this->assertDatabaseCount('stock_adjustments', 0);
    }

    public function test_posted_ledger_records_cannot_be_updated_or_deleted(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '100']], now()->toISOString(), null, 'immutable-1');
        $movement = StockMovement::query()->sole();

        try {
            $movement->update(['reason' => 'lost']);
            $this->fail('Posted movement should be immutable.');
        } catch (LogicException) {
            $this->assertSame('opening_stock', $movement->fresh()?->reason);
        }

        $this->expectException(LogicException::class);
        StockAdjustment::query()->sole()->delete();
    }

    public function test_full_depletion_reconciles_fractional_average_cost_to_zero(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $stock = app(PostStockAdjustment::class);
        $occurredAt = '2026-08-06T10:00:00Z';
        $stock->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '100']], $occurredAt, null, 'fractional-1');
        $stock->handle($store, $owner, 'increase', [['product_id' => $product->id, 'quantity' => '2', 'unit_cost' => '0']], $occurredAt, null, 'fractional-2');
        $stock->handle($store, $owner, 'decrease', [['product_id' => $product->id, 'quantity' => '3']], $occurredAt, null, 'fractional-3');

        $balance = InventoryBalance::query()->sole();
        $this->assertSame('0.000000', $balance->quantity);
        $this->assertSame('0.0000', $balance->inventory_value);
        $this->assertEquals(0, StockMovement::query()->sum('value_change'));
        $this->assertEquals(-100, StockMovement::query()->latest('id')->firstOrFail()->value_change);
    }

    public function test_backdated_stock_and_cash_postings_are_rejected_without_partial_state(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '2', 'unit_cost' => '10']], '2026-08-06T10:00:00Z', null, 'dated-stock-1');
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '100', '2026-08-06T10:00:00Z', null, 'dated-cash-1');

        try {
            app(PostStockAdjustment::class)->handle($store, $owner, 'increase', [['product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '10']], '2026-08-06T09:00:00Z', null, 'dated-stock-2');
            $this->fail('Backdated stock should be rejected.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('stock_movements', 1);
        }

        $this->expectException(ValidationException::class);
        try {
            app(PostCapitalTransaction::class)->handle($store, $owner, 'cash_contribution', $cash->id, '10', [], '2026-08-06T09:00:00Z', null, 'dated-cash-2');
        } finally {
            $this->assertDatabaseCount('cash_transactions', 1);
            $this->assertDatabaseCount('capital_transactions', 0);
        }
    }

    public function test_opening_balance_is_rejected_after_first_posting_even_with_another_key(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $date = '2026-08-06T10:00:00Z';
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '100', $date, null, 'opening-lock-1');
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '10']], $date, null, 'opening-lock-2');

        try {
            app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '100', $date, null, 'opening-lock-3');
            $this->fail('Second cash opening should be rejected.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('cash_transactions', 1);
        }

        $this->expectException(ValidationException::class);
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '10']], $date, null, 'opening-lock-4');
    }

    public function test_idempotency_key_rejects_a_different_payload(): void
    {
        [$owner, $store, , $cash, $bank] = $this->fixtures();
        $date = '2026-08-06T10:00:00Z';
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '1000', $date, null, 'payload-opening');
        app(PostAccountTransfer::class)->handle($store, $owner, $cash->id, $bank->id, '100', $date, null, 'payload-transfer');

        $this->expectException(ValidationException::class);
        try {
            app(PostAccountTransfer::class)->handle($store, $owner, $cash->id, $bank->id, '200', $date, null, 'payload-transfer');
        } finally {
            $this->assertDatabaseCount('account_transfers', 1);
            $this->assertDatabaseCount('cash_transactions', 3);
        }
    }

    public function test_local_store_time_is_normalized_to_utc(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $transaction = app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '100', '2026-08-06T15:00', null, 'timezone-1');
        $adjustment = app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '1']], '2026-09-01T00:30', null, 'timezone-2');

        $this->assertSame('2026-08-06 08:00:00', $transaction->occurred_at->format('Y-m-d H:i:s'));
        $this->assertStringStartsWith('ADJ-202609-', $adjustment->document_number);
    }

    public function test_inventory_history_is_paginated_beyond_first_twenty_five_rows(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $stock = app(PostStockAdjustment::class);
        $date = '2026-08-06T10:00:00Z';
        $stock->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '1']], $date, null, 'page-0');
        foreach (range(1, 25) as $index) {
            $stock->handle($store, $owner, 'increase', [['product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '1']], $date, null, "page-{$index}");
        }

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('operations.inventory'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('operations/inventory')
                ->has('movements.data', 25)
                ->where('movements.total', 26)
                ->has('movements.links'));
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('operations.inventory', ['page' => 2]))
            ->assertInertia(fn (Assert $page) => $page->has('movements.data', 1));
    }

    public function test_inventory_history_exposes_stock_before_after_and_unit(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $stock = app(PostStockAdjustment::class);
        $date = '2026-08-06T10:00:00Z';
        $stock->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '10', 'unit_cost' => '1000']], $date, null, 'history-stock-1');
        $stock->handle($store, $owner, 'decrease', [['product_id' => $product->id, 'quantity' => '3']], $date, null, 'history-stock-2');

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('operations.inventory'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('movements.data.0.quantity_before', 10)
                ->where('movements.data.0.quantity_change', -3)
                ->where('movements.data.0.quantity_after', 7)
                ->where('movements.data.0.unit', $product->baseUnit->symbol));
    }

    public function test_separate_stock_variants_include_their_parent_for_inventory_grouping(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $product->update(['variant_mode' => 'separate']);
        $variant = ProductVariant::query()->create([
            'store_id' => $store->id,
            'product_id' => $product->id,
            'name' => 'Besar',
            'is_active' => true,
        ]);
        InventoryBalance::query()->create([
            'store_id' => $store->id,
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'stock_key' => "variant:{$variant->id}",
            'quantity' => '7',
            'average_cost' => '2500',
            'inventory_value' => '17500',
            'minimum_quantity' => '2',
        ]);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('operations.inventory'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('products', 1)
                ->where('products.0.public_id', $variant->public_id)
                ->where('products.0.parent_public_id', $product->public_id)
                ->where('products.0.parent_name', $product->name)
                ->where('products.0.variant_name', 'Besar'));
    }

    /** @return array{User, Store, Product, FinancialAccount, FinancialAccount} */
    private function fixtures(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $cash = FinancialAccount::factory()->for($store)->create(['name' => 'Kas']);
        $bank = FinancialAccount::factory()->for($store)->create(['name' => 'Bank']);

        return [$owner, $store, $product, $cash, $bank];
    }
}
