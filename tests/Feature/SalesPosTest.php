<?php

namespace Tests\Feature;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\PostAccountTransfer;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Actions\Sales\PostSale;
use App\Actions\Sales\PostSaleReturn;
use App\Enums\FinancialAccountType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountBalance;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\Store;
use App\Models\Unit;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class SalesPosTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_sale_reconciles_stock_cash_cogs_profit_discount_and_change(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures('1000');
        $this->openStock($store, $owner, $product, '10', '600');
        $sale = $this->postSale($store, $owner, $product, $cash, quantity: '2', itemDiscount: '100', transactionDiscount: '100', paid: '2000');

        $this->assertSame('1800.0000', $sale->total_amount);
        $this->assertSame('200.0000', $sale->change_amount);
        $item = SaleItem::query()->sole();
        $this->assertSame('1200.0000', $item->cogs_amount);
        $this->assertSame('600.0000', $item->gross_profit);
        $this->assertSame('8.000000', InventoryBalance::query()->sole()->quantity);
        $this->assertSame('4800.0000', InventoryBalance::query()->sole()->inventory_value);
        $this->assertSame('1800.0000', FinancialAccountBalance::query()->sole()->balance);
        $this->assertDatabaseHas('sale_payments', ['payment_method' => 'cash', 'amount' => 1800, 'tendered_amount' => 2000, 'change_amount' => 200]);
        $this->assertDatabaseHas('cash_transactions', ['direction' => 'in', 'reason' => 'sale_payment', 'amount' => 1800]);
    }

    public function test_multi_item_and_unit_conversion_sale_uses_base_stock_cost(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures('12000');
        $other = Product::factory()->for($store)->create();
        $other->productUnits()->sole()->update(['selling_price' => '2000']);
        $pack = Unit::factory()->for($store)->create(['symbol' => 'ctn']);
        $packUnit = ProductUnit::create([
            'store_id' => $store->id, 'product_id' => $product->id, 'unit_id' => $pack->id,
            'conversion_factor' => 12, 'purchase_price' => 0, 'selling_price' => 15000, 'is_active' => true,
        ]);
        $this->openStock($store, $owner, $product, '24', '500');
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $other->id, 'quantity' => '5', 'unit_cost' => '700']], '2026-08-07T08:00:00Z', null, 'sale-other-opening');

        $sale = app(PostSale::class)->handle($store, $owner, $cash->id, [
            ['product_unit_id' => $packUnit->id, 'quantity' => '1', 'item_discount' => '0'],
            ['product_unit_id' => $other->productUnits()->sole()->id, 'quantity' => '2', 'item_discount' => '0'],
        ], '0', '19000', '2026-08-07T09:00:00Z', null, 'multi-sale');

        $this->assertSame('19000.0000', $sale->total_amount);
        $this->assertSame(['12.000000', '3.000000'], InventoryBalance::query()->orderBy('product_id')->pluck('quantity')->all());
        $this->assertEquals(7400, SaleItem::query()->sum('cogs_amount'));
    }

    public function test_insufficient_stock_rolls_back_sale_payment_cash_and_all_movements(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '1', '500');

        try {
            $this->postSale($store, $owner, $product, $cash, quantity: '2');
            $this->fail('Insufficient stock should reject the sale.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('sales', 0);
            $this->assertDatabaseCount('sale_items', 0);
            $this->assertDatabaseCount('sale_payments', 0);
            $this->assertDatabaseCount('cash_transactions', 0);
            $this->assertDatabaseCount('stock_movements', 1);
            $this->assertSame('1.000000', InventoryBalance::query()->sole()->quantity);
        }
    }

    public function test_sale_retry_is_idempotent_and_key_is_bound_to_payload(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $first = $this->postSale($store, $owner, $product, $cash, key: 'same-sale');
        $second = $this->postSale($store, $owner, $product, $cash, key: 'same-sale');

        $this->assertTrue($first->is($second));
        $this->assertDatabaseCount('sales', 1);
        $this->assertDatabaseCount('stock_movements', 2);
        $this->assertDatabaseCount('cash_transactions', 1);

        $this->expectException(ValidationException::class);
        $this->postSale($store, $owner, $product, $cash, quantity: '2', key: 'same-sale');
    }

    public function test_partial_and_full_return_restore_original_revenue_cogs_stock_and_cash(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '10', '500');
        $sale = $this->postSale($store, $owner, $product, $cash, quantity: '4');
        $saleItem = SaleItem::query()->sole();
        $returns = app(PostSaleReturn::class);
        $first = $returns->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => $saleItem->id, 'quantity' => '1']], '2026-08-07T10:00:00Z', 'Parsial', 'return-partial');

        $this->assertSame('1000.0000', $first->refund_amount);
        $this->assertSame('500.0000', $first->cogs_reversed);
        $this->assertSame('7.000000', InventoryBalance::query()->sole()->quantity);
        $this->assertSame('3000.0000', FinancialAccountBalance::query()->sole()->balance);

        $second = $returns->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => $saleItem->id, 'quantity' => '3']], '2026-08-07T11:00:00Z', 'Retur penuh', 'return-full');
        $this->assertSame('3000.0000', $second->refund_amount);
        $this->assertSame('10.000000', InventoryBalance::query()->sole()->quantity);
        $this->assertSame('5000.0000', InventoryBalance::query()->sole()->inventory_value);
        $this->assertSame('0.0000', FinancialAccountBalance::query()->sole()->balance);
        $this->assertEquals(4000, SaleReturn::query()->sum('refund_amount'));
        $this->assertEquals(2000, SaleReturn::query()->sum('cogs_reversed'));
    }

    public function test_final_fractional_return_restores_exact_original_base_quantity(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures('1000');
        $fractionalUnit = Unit::factory()->for($store)->create(['symbol' => 'frac']);
        $productUnit = ProductUnit::create([
            'store_id' => $store->id, 'product_id' => $product->id, 'unit_id' => $fractionalUnit->id,
            'conversion_factor' => '0.333333', 'purchase_price' => '0', 'selling_price' => '1000', 'is_active' => true,
        ]);
        $this->openStock($store, $owner, $product, '1', '600');
        $sale = app(PostSale::class)->handle($store, $owner, $cash->id, [[
            'product_unit_id' => $productUnit->id, 'quantity' => '1.000001', 'item_discount' => '0',
        ]], '0', '1000.0010', '2026-08-07T09:00:00Z', null, 'fractional-sale');
        $saleItem = SaleItem::query()->sole();
        $returns = app(PostSaleReturn::class);

        $returns->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => $saleItem->id, 'quantity' => '0.500000']], '2026-08-07T10:00:00Z', null, 'fractional-return-1');
        $returns->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => $saleItem->id, 'quantity' => '0.500001']], '2026-08-07T11:00:00Z', null, 'fractional-return-2');

        $this->assertSame('1.000000', InventoryBalance::query()->sole()->quantity);
        $this->assertSame('600.0000', InventoryBalance::query()->sole()->inventory_value);
        $this->assertSame('0.333333', (string) DB::table('sale_return_items')->sum('base_quantity'));
    }

    public function test_excess_return_is_rejected_without_partial_state(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $sale = $this->postSale($store, $owner, $product, $cash, quantity: '2');
        $item = SaleItem::query()->sole();

        $this->expectException(ValidationException::class);
        try {
            app(PostSaleReturn::class)->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => $item->id, 'quantity' => '3']], '2026-08-07T10:00:00Z', null, 'excess-return');
        } finally {
            $this->assertDatabaseCount('sale_returns', 0);
            $this->assertSame('3.000000', InventoryBalance::query()->sole()->quantity);
            $this->assertSame('2000.0000', FinancialAccountBalance::query()->sole()->balance);
        }
    }

    public function test_insufficient_refund_cash_rolls_back_return_and_stock_restore(): void
    {
        [$owner, $store, $product, $cash, $bank] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $sale = $this->postSale($store, $owner, $product, $cash);
        app(PostAccountTransfer::class)->handle($store, $owner, $cash->id, $bank->id, '1000', '2026-08-07T10:00:00Z', null, 'drain-sale-cash');

        try {
            app(PostSaleReturn::class)->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => SaleItem::query()->sole()->id, 'quantity' => '1']], '2026-08-07T11:00:00Z', null, 'refund-no-cash');
            $this->fail('Refund with insufficient cash should fail.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('sale_returns', 0);
            $this->assertSame('4.000000', InventoryBalance::query()->sole()->quantity);
            $this->assertDatabaseCount('stock_movements', 2);
            $this->assertDatabaseCount('cash_transactions', 3);
        }
    }

    public function test_sale_audit_failure_rolls_back_every_ledger(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $this->mock(RecordAudit::class)->shouldReceive('handle')->andThrow(new RuntimeException('Injected audit failure'));

        try {
            $this->postSale($store, $owner, $product, $cash);
            $this->fail('Audit failure should reject sale.');
        } catch (RuntimeException) {
            $this->assertDatabaseCount('sales', 0);
            $this->assertDatabaseCount('cash_transactions', 0);
            $this->assertSame('5.000000', InventoryBalance::query()->sole()->quantity);
        }
    }

    public function test_return_retry_is_idempotent_and_key_is_bound_to_payload(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $sale = $this->postSale($store, $owner, $product, $cash, quantity: '2');
        $item = SaleItem::query()->sole();
        $action = app(PostSaleReturn::class);
        $first = $action->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => $item->id, 'quantity' => '1']], '2026-08-07T10:00:00Z', null, 'same-return');
        $second = $action->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => $item->id, 'quantity' => '1']], '2026-08-07T10:00:00Z', null, 'same-return');

        $this->assertTrue($first->is($second));
        $this->assertDatabaseCount('sale_returns', 1);
        $this->assertDatabaseCount('sale_return_items', 1);
        $this->assertDatabaseCount('cash_transactions', 2);

        $this->expectException(ValidationException::class);
        $action->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => $item->id, 'quantity' => '0.5']], '2026-08-07T10:00:00Z', null, 'same-return');
    }

    public function test_return_audit_failure_rolls_back_refund_and_stock_restore(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $sale = $this->postSale($store, $owner, $product, $cash);
        $this->mock(RecordAudit::class)->shouldReceive('handle')->andThrow(new RuntimeException('Injected return audit failure'));

        try {
            app(PostSaleReturn::class)->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => SaleItem::query()->sole()->id, 'quantity' => '1']], '2026-08-07T10:00:00Z', null, 'return-audit-failure');
            $this->fail('Return audit failure should roll back.');
        } catch (RuntimeException) {
            $this->assertDatabaseCount('sale_returns', 0);
            $this->assertSame('4.000000', InventoryBalance::query()->sole()->quantity);
            $this->assertSame('1000.0000', FinancialAccountBalance::query()->sole()->balance);
            $this->assertDatabaseCount('stock_movements', 2);
            $this->assertDatabaseCount('cash_transactions', 1);
        }
    }

    public function test_backdated_sale_and_return_are_rejected(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $sale = $this->postSale($store, $owner, $product, $cash, occurredAt: '2026-08-07T10:00:00Z');

        try {
            $this->postSale($store, $owner, $product, $cash, key: 'backdated-sale', occurredAt: '2026-08-07T09:00:00Z');
            $this->fail('Backdated sale should fail.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('sales', 1);
        }

        $this->expectException(ValidationException::class);
        app(PostSaleReturn::class)->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => SaleItem::query()->sole()->id, 'quantity' => '1']], '2026-08-07T09:00:00Z', null, 'backdated-return');
    }

    public function test_cross_store_references_are_rejected_by_domain_and_http(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        [, , $foreignProduct] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');

        try {
            $this->postSale($store, $owner, $foreignProduct, $cash);
            $this->fail('Cross-store product should fail.');
        } catch (ModelNotFoundException) {
            $this->assertDatabaseCount('sales', 0);
        }

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->post(route('pos.sales.store'), [
            'account_id' => $cash->public_id, 'transaction_discount_amount' => '0', 'paid_amount' => '1000',
            'occurred_at' => '2026-08-07T10:00', 'idempotency_key' => (string) Str::uuid(),
            'items' => [['product_id' => $foreignProduct->public_id, 'unit_id' => $foreignProduct->baseUnit->public_id, 'quantity' => '1', 'discount_amount' => '0']],
        ])->assertSessionHasErrors('items.0.product_id');
    }

    public function test_cashier_can_sell_and_view_receipt_but_cannot_refund(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $cashier = User::factory()->create();
        $store->users()->attach($cashier, ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value]);
        $session = ['active_store_id' => $store->id];
        $payload = [
            'account_id' => $cash->public_id, 'transaction_discount_amount' => '0', 'paid_amount' => '1000',
            'occurred_at' => '2026-08-07T16:00', 'idempotency_key' => (string) Str::uuid(),
            'items' => [['product_id' => $product->public_id, 'unit_id' => $product->baseUnit->public_id, 'quantity' => '1', 'discount_amount' => '0']],
        ];
        $this->actingAs($cashier)->withSession($session)->get(route('pos.index'))->assertOk();
        $this->actingAs($cashier)->withSession($session)->post(route('pos.sales.store'), $payload)->assertRedirect();
        $sale = Sale::query()->sole();
        app(PostSaleReturn::class)->handle($store, $owner, $sale->id, $cash->id, [['sale_item_id' => SaleItem::query()->sole()->id, 'quantity' => '0.5']], '2026-08-07T16:30:00Z', null, 'owner-return-before-cashier-view');
        $this->actingAs($cashier)->withSession($session)->get(route('sales.show', $sale))
            ->assertInertia(fn (Assert $page) => $page->component('sales/show')
                ->where('canReturn', false)
                ->where('canViewProfit', false)
                ->missing('items.0.cogs_amount')
                ->missing('items.0.gross_profit')
                ->missing('returns.0.cogs_reversed')
                ->missing('returns.0.gross_profit_reversed'));
        $this->actingAs($cashier)->withSession($session)->post(route('sales.returns.store', $sale), [
            'account_id' => $cash->public_id, 'occurred_at' => '2026-08-07T17:00', 'idempotency_key' => (string) Str::uuid(),
            'items' => [['sale_item_id' => SaleItem::query()->sole()->public_id, 'quantity' => '1']],
        ])->assertForbidden();
    }

    public function test_pos_projects_one_catalog_identity_and_simple_cash_or_qris_methods(): void
    {
        [$owner, $store, $product, $cash, $bank] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('pos/index')
                ->has('products', 1)
                ->where('products.0.catalog_product_id', $product->public_id)
                ->where('products.0.catalog_product_name', $product->name)
                ->where('products.0.variant_name', null)
                ->has('paymentMethods', 2)
                ->where('paymentMethods.0.method', 'cash')
                ->where('paymentMethods.0.label', 'Cash')
                ->where('paymentMethods.0.account_id', $cash->public_id)
                ->where('paymentMethods.1.method', 'qris')
                ->where('paymentMethods.1.label', 'QRIS')
                ->where('paymentMethods.1.account_id', $bank->public_id));
    }

    public function test_pos_bootstraps_cash_and_qris_accounts_when_store_has_none(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $product->productUnits()->sole()->update(['selling_price' => '1000']);
        $this->openStock($store, $owner, $product, '5', '500');

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('pos/index')
                ->has('paymentMethods', 2)
                ->where('paymentMethods.0.method', 'cash')
                ->where('paymentMethods.0.label', 'Cash')
                ->where('paymentMethods.1.method', 'qris')
                ->where('paymentMethods.1.label', 'QRIS'));

        $this->assertDatabaseCount('financial_accounts', 2);
        $this->assertDatabaseHas('financial_accounts', ['store_id' => $store->id, 'name' => 'Kas', 'type' => FinancialAccountType::Cash->value, 'is_active' => true]);
        $this->assertDatabaseHas('financial_accounts', ['store_id' => $store->id, 'name' => 'QRIS', 'type' => FinancialAccountType::EWallet->value, 'is_active' => true]);
    }

    public function test_pos_variant_rows_share_their_parent_catalog_identity(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $product->productUnits()->update(['is_active' => false]);
        $product->update(['variant_mode' => 'separate']);

        foreach (['Setengah dus', 'Seperempat dus'] as $variantName) {
            $variant = ProductVariant::query()->create([
                'store_id' => $store->id,
                'product_id' => $product->id,
                'name' => $variantName,
                'is_active' => true,
            ]);
            $variant->productUnits()->create([
                'store_id' => $store->id, 'product_id' => $product->id, 'unit_id' => $product->base_unit_id,
                'conversion_factor' => 1, 'purchase_price' => '5000', 'selling_price' => '10000', 'is_active' => true,
            ]);
            $this->openStock($store, $owner, $variant, '5', '5000');
        }

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('pos/index')
                ->has('products', 2)
                ->where('products.0.catalog_product_id', $product->public_id)
                ->where('products.1.catalog_product_id', $product->public_id)
                ->where('products.0.catalog_product_name', $product->name)
                ->where('products.1.catalog_product_name', $product->name)
                ->where('products.0.variant_name', 'Seperempat dus')
                ->where('products.1.variant_name', 'Setengah dus'));
    }

    public function test_non_cash_sale_is_stored_as_qris_payment_method(): void
    {
        [$owner, $store, $product, , $bank] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');

        $sale = $this->postSale($store, $owner, $product, $bank, key: 'qris-sale');

        $this->assertDatabaseHas('sale_payments', [
            'sale_id' => $sale->id,
            'financial_account_id' => $bank->id,
            'payment_method' => 'qris',
        ]);
    }

    public function test_owner_http_sale_redirects_to_printable_receipt_and_can_return(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $session = ['active_store_id' => $store->id];
        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), [
            'account_id' => $cash->public_id, 'transaction_discount_amount' => '0', 'paid_amount' => '1000',
            'occurred_at' => '2026-08-07T16:00', 'idempotency_key' => (string) Str::uuid(),
            'items' => [['product_id' => $product->public_id, 'unit_id' => $product->baseUnit->public_id, 'quantity' => '1', 'discount_amount' => '0']],
        ])->assertRedirect(route('sales.show', Sale::query()->sole()));
        $sale = Sale::query()->sole();
        $store->settings()->update([
            'address' => 'Jl. Melati No. 10',
            'receipt_header' => 'Struk Toko Senja',
            'receipt_footer' => 'Terima kasih sudah datang.',
            'receipt_paper_size' => '80mm',
            'receipt_show_address' => true,
            'receipt_show_cashier' => false,
            'auto_print_receipt' => true,
        ]);
        $this->actingAs($owner)->withSession($session)->get(route('sales.show', $sale))
            ->assertInertia(fn (Assert $page) => $page->component('sales/show')
                ->where('canReturn', true)
                ->where('canViewProfit', true)
                ->where('receipt.address', 'Jl. Melati No. 10')
                ->where('receipt.header', 'Struk Toko Senja')
                ->where('receipt.footer', 'Terima kasih sudah datang.')
                ->where('receipt.paper_size', '80mm')
                ->where('receipt.show_cashier', false)
                ->where('receipt.auto_print', true)
                ->has('items', 1));
        $this->actingAs($owner)->withSession($session)->post(route('sales.returns.store', $sale), [
            'account_id' => $cash->public_id, 'occurred_at' => '2026-08-07T17:00', 'idempotency_key' => (string) Str::uuid(),
            'items' => [['sale_item_id' => SaleItem::query()->sole()->public_id, 'quantity' => '1']],
        ])->assertRedirect();
        $this->assertDatabaseCount('sale_returns', 1);
    }

    public function test_sale_documents_are_immutable_and_non_cash_overpayment_is_rejected(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $bank = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Bank]);

        try {
            $this->postSale($store, $owner, $product, $bank, paid: '1100');
            $this->fail('Non-cash overpayment should fail.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('sales', 0);
        }

        $sale = $this->postSale($store, $owner, $product, $cash);
        try {
            $sale->delete();
            $this->fail('Sale should be immutable.');
        } catch (LogicException) {
            $this->assertDatabaseCount('sales', 1);
        }
        $this->expectException(LogicException::class);
        SaleItem::query()->sole()->update(['net_total' => '1']);
    }

    public function test_sales_history_is_paginated_after_twenty_five_documents(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '30', '500');
        foreach (range(1, 26) as $index) {
            $this->postSale($store, $owner, $product, $cash, key: "page-sale-{$index}");
        }
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('sales.index'))
            ->assertInertia(fn (Assert $page) => $page->component('sales/index')->has('sales.data', 25)->where('sales.total', 26));
        $this->actingAs($owner)->withSession($session)->get(route('sales.index', ['page' => 2]))
            ->assertInertia(fn (Assert $page) => $page->has('sales.data', 1));
    }

    /** @return array{User, Store, Product, FinancialAccount, FinancialAccount} */
    private function fixtures(string $sellingPrice = '1000'): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $product->productUnits()->sole()->update(['selling_price' => $sellingPrice]);
        $cash = FinancialAccount::factory()->for($store)->create(['name' => 'Kas', 'type' => FinancialAccountType::Cash]);
        $bank = FinancialAccount::factory()->for($store)->create(['name' => 'Bank', 'type' => FinancialAccountType::Bank]);

        return [$owner, $store, $product, $cash, $bank];
    }

    private function openStock(Store $store, User $owner, Product|ProductVariant $product, string $quantity, string $cost): void
    {
        $parent = $product instanceof ProductVariant ? $product->product : $product;
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [[
            'product_id' => $parent->id,
            'product_variant_id' => $product instanceof ProductVariant ? $product->id : null,
            'quantity' => $quantity,
            'unit_cost' => $cost,
        ]], '2026-08-07T08:00:00Z', null, 'sale-stock-'.class_basename($product).'-'.$product->id);
    }

    private function postSale(Store $store, User $owner, Product $product, FinancialAccount $account, string $quantity = '1', string $itemDiscount = '0', string $transactionDiscount = '0', ?string $paid = null, string $key = 'sale-key', string $occurredAt = '2026-08-07T09:00:00Z'): Sale
    {
        $gross = Decimal::multiply($quantity, (string) $product->productUnits()->sole()->selling_price);
        $paid ??= Decimal::subtract(Decimal::subtract($gross, $itemDiscount, Decimal::MONEY_SCALE), $transactionDiscount, Decimal::MONEY_SCALE);

        return app(PostSale::class)->handle($store, $owner, $account->id, [[
            'product_unit_id' => $product->productUnits()->sole()->id, 'quantity' => $quantity, 'item_discount' => $itemDiscount,
        ]], $transactionDiscount, $paid, $occurredAt, null, $key);
    }
}
