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
use App\Models\Country;
use App\Models\Customer;
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
use App\Support\PaymentMethodCatalog;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class SalesPosTest extends TestCase
{
    use RefreshDatabase;

    public function test_fixed_quantity_product_rejects_fractional_sales_without_posting(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $product->update(['quantity_mode' => 'fixed']);
        $this->openStock($store, $owner, $product, '10', '500');
        try {
            $this->postSale($store, $owner, $product, $cash, quantity: '0.5');
            $this->fail('A fixed quantity product must reject fractional sales.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('items', $exception->errors());
            $this->assertDatabaseCount('sales', 0);
            $this->assertSame('10.000000', InventoryBalance::query()->sole()->quantity);
        }
        $sale = $this->postSale($store, $owner, $product, $cash, quantity: '1.000000');
        $this->assertSame('1000.0000', $sale->total_amount);
    }

    public function test_variable_quantity_product_preserves_fractional_sales(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '10', '500');
        $sale = $this->postSale($store, $owner, $product, $cash, quantity: '0.5');
        $this->assertSame('500.0000', $sale->total_amount);
    }

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
            ->assertInertia(fn (Assert $page) => $page->component('customer/sales/show')
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
                ->component('customer/pos/index')
                ->has('products', 1)
                ->where('products.0.catalog_product_id', $product->public_id)
                ->where('products.0.catalog_product_name', $product->name)
                ->where('products.0.variant_name', null)
                ->has('paymentMethods', 2)
                ->where('paymentMethods.0.method', 'cash')
                ->where('paymentMethods.0.label', __('Cash'))
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
                ->component('customer/pos/index')
                ->has('paymentMethods', 2)
                ->where('paymentMethods.0.method', 'cash')
                ->where('paymentMethods.0.label', __('Cash'))
                ->where('paymentMethods.1.method', 'qris')
                ->where('paymentMethods.1.label', 'QRIS'));

        $this->assertDatabaseCount('financial_accounts', 2);
        $this->assertDatabaseHas('financial_accounts', ['store_id' => $store->id, 'name' => 'Kas', 'type' => FinancialAccountType::Cash->value, 'is_active' => true]);
        $this->assertDatabaseHas('financial_accounts', ['store_id' => $store->id, 'name' => 'QRIS', 'type' => FinancialAccountType::EWallet->value, 'is_active' => true]);
    }

    public function test_malaysia_pos_uses_duitnow_qr_and_touch_n_go_instead_of_qris(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $store->update(['country_id' => Country::query()->where('code', 'MY')->valueOrFail('id')]);
        $store->unsetRelation('country');
        $this->openStock($store, $owner, $product, '5', '500');
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('paymentMethods', 3)
                ->where('paymentMethods.0.method', 'cash')
                ->where('paymentMethods.1.method', 'qr_payment')
                ->where('paymentMethods.1.label', 'DuitNow QR')
                ->where('paymentMethods.1.brand', 'duitnow_qr')
                ->where('paymentMethods.2.method', 'e_wallet')
                ->where('paymentMethods.2.label', "Touch 'n Go eWallet")
                ->where('paymentMethods.2.brand', 'touch_n_go'));

        $touchNGo = FinancialAccount::query()->where([
            'store_id' => $store->id,
            'payment_code' => 'touch_n_go',
        ])->sole();
        $duitNow = FinancialAccount::query()->where([
            'store_id' => $store->id,
            'payment_code' => 'duitnow_qr',
        ])->sole();
        $duitNowPayload = [
            'sales_channel' => 'in_store',
            'payment_method' => 'qr_payment',
            'account_id' => $duitNow->public_id,
            'transaction_discount_amount' => '0',
            'paid_amount' => '1000',
            'occurred_at' => '2026-08-07T15:55',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '1',
                'discount_amount' => '0',
            ]],
        ];
        $this->actingAs($owner)->withSession($session)
            ->post(route('pos.sales.store'), $duitNowPayload)
            ->assertRedirect();

        $this->assertDatabaseHas('sale_payments', [
            'financial_account_id' => $duitNow->id,
            'payment_method' => 'qr_payment',
            'amount' => '1000.0000',
        ]);

        $invalidQrPayload = [
            'sales_channel' => 'in_store',
            'payment_method' => 'qr_payment',
            'account_id' => $touchNGo->public_id,
            'transaction_discount_amount' => '0',
            'paid_amount' => '1000',
            'occurred_at' => '2026-08-07T16:00',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '1',
                'discount_amount' => '0',
            ]],
        ];
        $this->actingAs($owner)->withSession($session)
            ->from(route('pos.index'))
            ->post(route('pos.sales.store'), $invalidQrPayload)
            ->assertRedirect(route('pos.index'))
            ->assertSessionHasErrors('payment_method');

        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), [
            'sales_channel' => 'in_store',
            'payment_method' => 'e_wallet',
            'account_id' => $touchNGo->public_id,
            'transaction_discount_amount' => '0',
            'paid_amount' => '1000',
            'occurred_at' => '2026-08-07T16:00',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '1',
                'discount_amount' => '0',
            ]],
        ])->assertRedirect();

        $this->assertDatabaseHas('sale_payments', [
            'financial_account_id' => $touchNGo->id,
            'payment_method' => 'e_wallet',
            'amount' => '1000.0000',
        ]);
        $this->assertSame($cash->store_id, $touchNGo->store_id);
    }

    public function test_vietnam_pos_checkout_aligns_a_stale_page_timestamp_with_the_latest_ledger(): void
    {
        [$owner, $store, $product, , $qr] = $this->fixtures('15');
        $store->update(['country_id' => Country::query()->where('code', 'VN')->valueOrFail('id')]);
        $store->settings()->update(['timezone' => 'Asia/Ho_Chi_Minh', 'currency' => 'VND', 'locale' => 'vi']);
        $qr->update(['name' => 'VietQR', 'payment_code' => 'vietqr']);
        $this->openStock($store, $owner, $product, '99', '10');
        app(PostStockAdjustment::class)->handle($store, $owner, 'increase', [[
            'product_id' => $product->id,
            'quantity' => '1',
            'unit_cost' => '10',
        ]], '2026-08-07T09:00:45Z', null, 'vietnam-stock-after-pos-opened');

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->post(route('pos.sales.store'), [
            'sales_channel' => 'in_store',
            'payment_method' => 'qr_payment',
            'account_id' => $qr->public_id,
            'transaction_discount_amount' => '0',
            'paid_amount' => '30',
            'occurred_at' => '2026-08-07T16:00:00',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '2',
                'discount_amount' => '0',
            ]],
        ])->assertRedirect()->assertSessionDoesntHaveErrors();

        $sale = Sale::query()->sole();
        $this->assertSame('2026-08-07 09:00:45', $sale->occurred_at->utc()->format('Y-m-d H:i:s'));
        $this->assertSame('98.000000', InventoryBalance::query()->sole()->quantity);
        $this->assertDatabaseHas('sale_payments', [
            'sale_id' => $sale->id,
            'financial_account_id' => $qr->id,
            'payment_method' => 'qr_payment',
            'amount' => '30.0000',
        ]);
    }

    public function test_each_country_qr_method_posts_without_leaking_marketplace_payload(): void
    {
        $countries = [
            'ID' => ['code' => 'qris', 'method' => 'qris', 'label' => 'QRIS', 'count' => 2],
            'MY' => ['code' => 'duitnow_qr', 'method' => 'qr_payment', 'label' => 'DuitNow QR', 'count' => 3],
            'TH' => ['code' => 'promptpay_qr', 'method' => 'qr_payment', 'label' => 'PromptPay QR', 'count' => 2],
            'VN' => ['code' => 'vietqr', 'method' => 'qr_payment', 'label' => 'VietQR', 'count' => 2],
        ];

        foreach ($countries as $countryCode => $expected) {
            [$owner, $store, $product] = $this->fixtures();
            $store->update(['country_id' => Country::query()->where('code', $countryCode)->valueOrFail('id')]);
            $store->unsetRelation('country');
            $this->openStock($store, $owner, $product, '5', '500');
            $session = ['active_store_id' => $store->id];

            $this->actingAs($owner)->withSession($session)->get(route('pos.index'))
                ->assertInertia(fn (Assert $page) => $page
                    ->has('paymentMethods', $expected['count'])
                    ->where('paymentMethods.1.method', $expected['method'])
                    ->where('paymentMethods.1.label', $expected['label'])
                    ->where('paymentMethods.1.brand', $expected['code']));

            $qrAccount = FinancialAccount::query()->where([
                'store_id' => $store->id,
                'payment_code' => $expected['code'],
            ])->sole();

            $payload = [
                'sales_channel' => 'in_store',
                'payment_method' => $expected['method'],
                'account_id' => $qrAccount->public_id,
                'marketplace_code' => 'shopee',
                'transaction_discount_amount' => '0',
                'paid_amount' => '1000',
                'occurred_at' => '2026-09-09T16:00',
                'idempotency_key' => (string) Str::uuid(),
                'items' => [[
                    'product_id' => $product->public_id,
                    'unit_id' => $product->baseUnit->public_id,
                    'quantity' => '1',
                    'discount_amount' => '0',
                ]],
            ];
            $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)
                ->assertSessionHasNoErrors();

            $sale = Sale::query()->where('store_id', $store->id)->sole();
            $this->assertSame('in_store', $sale->sales_channel);
            $this->assertNull($sale->marketplace_code);
            $this->assertDatabaseHas('sale_payments', [
                'sale_id' => $sale->id,
                'financial_account_id' => $qrAccount->id,
                'payment_method' => $expected['method'],
                'amount' => '1000.0000',
            ]);

            $payload['payment_method'] = $expected['method'] === 'qris' ? 'qr_payment' : 'qris';
            $payload['idempotency_key'] = (string) Str::uuid();
            $this->actingAs($owner)->withSession($session)
                ->from(route('pos.index'))
                ->post(route('pos.sales.store'), $payload)
                ->assertRedirect(route('pos.index'))
                ->assertSessionHasErrors('payment_method');
            $this->assertSame(1, Sale::query()->where('store_id', $store->id)->count());
        }
    }

    public function test_country_payment_compatibility_rejects_every_foreign_catalog_combination(): void
    {
        $countries = [
            'ID' => ['code' => 'qris', 'method' => 'qris'],
            'MY' => ['code' => 'duitnow_qr', 'method' => 'qr_payment'],
            'TH' => ['code' => 'promptpay_qr', 'method' => 'qr_payment'],
            'VN' => ['code' => 'vietqr', 'method' => 'qr_payment'],
        ];
        $methods = ['cash', 'qris', 'qr_payment', 'bank_transfer', 'e_wallet'];

        foreach ($countries as $activeCountry => $activePayment) {
            $this->assertSame($activePayment, array_intersect_key(
                PaymentMethodCatalog::qrForCountry($activeCountry),
                ['code' => true, 'method' => true],
            ));

            foreach ($countries as $accountCountry => $accountPayment) {
                $account = new FinancialAccount;
                $account->forceFill([
                    'type' => FinancialAccountType::EWallet,
                    'marketplace_code' => null,
                    'payment_code' => $accountPayment['code'],
                ]);

                foreach ($methods as $method) {
                    $expected = $accountCountry === $activeCountry && $method === $activePayment['method'];
                    $this->assertSame(
                        $expected,
                        PaymentMethodCatalog::acceptsInStoreAccount($account, $method, $activeCountry),
                        "{$accountPayment['code']} / {$method} must match only {$activeCountry}",
                    );
                }
            }

            $touchNGo = new FinancialAccount;
            $touchNGo->forceFill([
                'type' => FinancialAccountType::EWallet,
                'marketplace_code' => null,
                'payment_code' => 'touch_n_go',
            ]);
            foreach ($methods as $method) {
                $this->assertSame(
                    $activeCountry === 'MY' && $method === 'e_wallet',
                    PaymentMethodCatalog::acceptsInStoreAccount($touchNGo, $method, $activeCountry),
                    "Touch 'n Go / {$method} must match only Malaysia e-wallet",
                );
            }

            $cash = new FinancialAccount;
            $cash->forceFill([
                'type' => FinancialAccountType::Cash,
                'marketplace_code' => null,
                'payment_code' => null,
            ]);
            foreach ($methods as $method) {
                $this->assertSame(
                    $method === 'cash',
                    PaymentMethodCatalog::acceptsInStoreAccount($cash, $method, $activeCountry),
                    "Cash / {$method} compatibility is invalid for {$activeCountry}",
                );
            }

            $marketplace = new FinancialAccount;
            $marketplace->forceFill([
                'type' => FinancialAccountType::EWallet,
                'marketplace_code' => 'shopee',
                'payment_code' => null,
            ]);
            foreach ($methods as $method) {
                $this->assertFalse(
                    PaymentMethodCatalog::acceptsInStoreAccount($marketplace, $method, $activeCountry),
                    "Marketplace account must never be accepted as {$method} in {$activeCountry}",
                );
            }
        }
    }

    public function test_marketplace_providers_are_restricted_to_the_active_store_country(): void
    {
        $countries = [
            'ID' => ['allowed' => 'tokopedia', 'foreign' => 'tiktok_shop'],
            'MY' => ['allowed' => 'tiktok_shop', 'foreign' => 'tokopedia'],
            'TH' => ['allowed' => 'tiktok_shop', 'foreign' => 'tokopedia'],
            'VN' => ['allowed' => 'tiktok_shop', 'foreign' => 'tokopedia'],
        ];

        foreach ($countries as $countryCode => $providers) {
            [$owner, $store, $product] = $this->fixtures();
            $store->update(['country_id' => Country::query()->where('code', $countryCode)->valueOrFail('id')]);
            $store->unsetRelation('country');
            $this->openStock($store, $owner, $product, '5', '500');
            $session = ['active_store_id' => $store->id];
            $payload = [
                'sales_channel' => 'marketplace',
                'payment_method' => 'marketplace',
                'marketplace_code' => $providers['foreign'],
                'external_order_number' => "{$countryCode}-ORDER-1",
                'transaction_discount_amount' => '0',
                'paid_amount' => '1000',
                'occurred_at' => '2026-09-09T16:00',
                'idempotency_key' => (string) Str::uuid(),
                'items' => [[
                    'product_id' => $product->public_id,
                    'unit_id' => $product->baseUnit->public_id,
                    'quantity' => '1',
                    'discount_amount' => '0',
                ]],
            ];

            $this->actingAs($owner)->withSession($session)
                ->from(route('pos.index'))
                ->post(route('pos.sales.store'), $payload)
                ->assertRedirect(route('pos.index'))
                ->assertSessionHasErrors('marketplace_code');
            $this->assertSame(0, Sale::query()->where('store_id', $store->id)->count());

            $payload['marketplace_code'] = $providers['allowed'];
            $payload['idempotency_key'] = (string) Str::uuid();
            $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)
                ->assertSessionHasNoErrors();

            $sale = Sale::query()->where('store_id', $store->id)->sole();
            $this->assertSame('marketplace', $sale->sales_channel);
            $this->assertSame($providers['allowed'], $sale->marketplace_code);
        }
    }

    public function test_payment_catalog_codes_are_unique_and_country_scoped(): void
    {
        $countryCodes = ['ID', 'MY', 'TH', 'VN'];
        $qrCodes = [];
        $walletCodes = [];

        foreach ($countryCodes as $countryCode) {
            $qr = PaymentMethodCatalog::qrForCountry($countryCode);
            $this->assertContains($qr['method'], ['qris', 'qr_payment']);
            $this->assertNotContains($qr['code'], $qrCodes, "Duplicate QR code: {$qr['code']}");
            $qrCodes[] = $qr['code'];

            foreach (PaymentMethodCatalog::walletCodesForCountry($countryCode) as $walletCode) {
                $this->assertNotContains($walletCode, $walletCodes, "Duplicate wallet code: {$walletCode}");
                $this->assertNotContains($walletCode, $qrCodes, "Wallet code collides with QR: {$walletCode}");
                $walletCodes[] = $walletCode;
            }
        }

        $defaultQrCode = PaymentMethodCatalog::qrForCountry('ZZ')['code'];
        $this->assertNotContains($defaultQrCode, $qrCodes);
        $this->assertSame([...$qrCodes, $defaultQrCode], PaymentMethodCatalog::qrCodes());
        $this->assertSame($walletCodes, PaymentMethodCatalog::walletCodes());
        $this->assertSame([], array_intersect($qrCodes, $walletCodes));
    }

    public function test_changing_country_before_transactions_reconciles_visible_pos_payment_methods(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('paymentMethods', 2)
                ->where('paymentMethods.1.brand', 'qris'));

        $this->actingAs($owner)->withSession($session)->patch(route('stores.update', $store), [
            'name' => $store->name,
            'country' => 'MY',
        ])->assertSessionHasNoErrors();
        $this->actingAs($owner)->withSession($session)->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('paymentMethods', 3)
                ->where('paymentMethods.1.brand', 'duitnow_qr')
                ->where('paymentMethods.2.brand', 'touch_n_go'));

        $this->actingAs($owner)->withSession($session)->patch(route('stores.update', $store), [
            'name' => $store->name,
            'country' => 'TH',
        ])->assertSessionHasNoErrors();
        $this->actingAs($owner)->withSession($session)->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('paymentMethods', 2)
                ->where('paymentMethods.0.method', 'cash')
                ->where('paymentMethods.1.method', 'qr_payment')
                ->where('paymentMethods.1.label', 'PromptPay QR')
                ->where('paymentMethods.1.brand', 'promptpay_qr'));

        $this->assertDatabaseHas('financial_accounts', [
            'store_id' => $store->id,
            'payment_code' => 'promptpay_qr',
            'is_active' => true,
        ]);
        $this->assertDatabaseHas('financial_accounts', [
            'store_id' => $store->id,
            'payment_code' => 'touch_n_go',
            'is_active' => true,
        ]);
        $this->assertDatabaseMissing('financial_accounts', [
            'store_id' => $store->id,
            'payment_code' => 'qris',
        ]);
        $this->assertDatabaseMissing('financial_accounts', [
            'store_id' => $store->id,
            'payment_code' => 'duitnow_qr',
        ]);
    }

    public function test_legacy_named_qr_accounts_are_backfilled_by_store_country(): void
    {
        $payments = [
            'ID' => ['code' => 'qris', 'label' => 'QRIS'],
            'MY' => ['code' => 'duitnow_qr', 'label' => 'DuitNow QR'],
            'TH' => ['code' => 'promptpay_qr', 'label' => 'PromptPay QR'],
            'VN' => ['code' => 'vietqr', 'label' => 'VietQR'],
        ];

        foreach ($payments as $countryCode => $payment) {
            $store = Store::factory()->create([
                'country_id' => Country::query()->where('code', $countryCode)->valueOrFail('id'),
            ]);
            FinancialAccount::factory()->for($store)->create([
                'name' => $payment['label'],
                'type' => FinancialAccountType::EWallet,
                'payment_code' => null,
            ]);
            FinancialAccount::factory()->for($store)->create([
                'name' => 'Dompet umum',
                'type' => FinancialAccountType::EWallet,
                'payment_code' => null,
            ]);
        }

        $migration = require database_path('migrations/2026_09_13_020000_tag_legacy_country_qr_accounts.php');
        $migration->up();

        foreach ($payments as $countryCode => $payment) {
            $storeId = Store::query()->whereHas('country', fn ($query) => $query->where('code', $countryCode))->valueOrFail('id');
            $this->assertDatabaseHas('financial_accounts', [
                'store_id' => $storeId,
                'name' => $payment['label'],
                'payment_code' => $payment['code'],
            ]);
            $this->assertDatabaseHas('financial_accounts', [
                'store_id' => $storeId,
                'name' => 'Dompet umum',
                'payment_code' => null,
            ]);
        }
    }

    public function test_thailand_pos_hides_and_rejects_payment_methods_from_another_country(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $store->update(['country_id' => Country::query()->where('code', 'TH')->valueOrFail('id')]);
        $store->unsetRelation('country');
        $this->openStock($store, $owner, $product, '5', '500');
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('pos.index'))->assertOk();
        $touchNGo = FinancialAccount::factory()->for($store)->create([
            'name' => "Touch 'n Go eWallet",
            'type' => FinancialAccountType::EWallet,
            'payment_code' => 'touch_n_go',
            'is_active' => true,
        ]);

        $this->actingAs($owner)->withSession($session)->get(route('pos.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('paymentMethods', 2)
                ->where('paymentMethods.1.label', 'PromptPay QR')
                ->where('paymentMethods.1.brand', 'promptpay_qr'));

        $this->actingAs($owner)->withSession($session)
            ->from(route('pos.index'))
            ->post(route('pos.sales.store'), [
                'sales_channel' => 'in_store',
                'payment_method' => 'e_wallet',
                'account_id' => $touchNGo->public_id,
                'transaction_discount_amount' => '0',
                'paid_amount' => '1000',
                'occurred_at' => '2026-09-09T16:00',
                'idempotency_key' => (string) Str::uuid(),
                'items' => [[
                    'product_id' => $product->public_id,
                    'unit_id' => $product->baseUnit->public_id,
                    'quantity' => '1',
                    'discount_amount' => '0',
                ]],
            ])
            ->assertRedirect(route('pos.index'))
            ->assertSessionHasErrors('payment_method');

        $this->assertDatabaseCount('sales', 0);
    }

    public function test_pos_payment_methods_remain_available_across_indonesian_and_malay_sessions(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();

        foreach (['id', 'ms'] as $locale) {
            $this->actingAs($owner)
                ->withSession([
                    'active_store_id' => $store->id,
                    'market' => $locale,
                    'locale' => $locale,
                ])
                ->get(route('pos.index'))
                ->assertInertia(fn (Assert $page) => $page
                    ->component('customer/pos/index')
                    ->has('paymentMethods', 2)
                    ->where('paymentMethods.0.method', 'cash')
                    ->where('paymentMethods.1.method', 'qris'));
        }

        $this->assertDatabaseHas('financial_accounts', [
            'store_id' => $store->id,
            'type' => FinancialAccountType::Cash->value,
            'is_active' => true,
        ]);
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
                ->component('customer/pos/index')
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

    public function test_qris_sale_can_store_and_open_a_private_payment_proof(): void
    {
        Storage::fake('local');
        [$owner, $store, $product, , $bank] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), [
            'account_id' => $bank->public_id,
            'transaction_discount_amount' => '0',
            'paid_amount' => '1000',
            'payment_proof' => UploadedFile::fake()->create('bukti-qris.pdf', 120, 'application/pdf'),
            'occurred_at' => '2026-08-07T16:00',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '1',
                'discount_amount' => '0',
            ]],
        ])->assertRedirect();

        $sale = Sale::query()->sole();
        $proofPath = DB::table('sale_payments')->where('sale_id', $sale->id)->value('payment_proof_path');
        $this->assertIsString($proofPath);
        $this->assertStringStartsWith("sale-payment-proofs/{$store->public_id}/", $proofPath);
        Storage::disk('local')->assertExists($proofPath);

        $this->actingAs($owner)
            ->withSession($session)
            ->get(route('sales.payment-proof', $sale))
            ->assertOk()
            ->assertHeader('cache-control', 'no-store, private');

        $this->actingAs($owner)->withSession($session)->get(route('sales.show', $sale))
            ->assertInertia(fn (Assert $page) => $page
                ->where('payment.payment_method', 'qris')
                ->where('payment.proof_url', route('sales.payment-proof', $sale)));

        [$otherOwner, $otherStore] = $this->fixtures();
        $this->actingAs($otherOwner)
            ->withSession(['active_store_id' => $otherStore->id])
            ->get(route('sales.payment-proof', $sale))
            ->assertNotFound();
    }

    public function test_cash_sale_rejects_a_payment_proof(): void
    {
        Storage::fake('local');
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->post(route('pos.sales.store'), [
            'account_id' => $cash->public_id,
            'transaction_discount_amount' => '0',
            'paid_amount' => '1000',
            'payment_proof' => UploadedFile::fake()->create('bukti.pdf', 20, 'application/pdf'),
            'occurred_at' => '2026-08-07T16:00',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '1',
                'discount_amount' => '0',
            ]],
        ])->assertSessionHasErrors('payment_proof');

        $this->assertDatabaseCount('sales', 0);
        $this->assertSame([], Storage::disk('local')->allFiles('sale-payment-proofs'));
    }

    public function test_optional_customer_is_reused_by_normalized_phone_and_sale_keeps_snapshots(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');

        $firstSale = $this->postSale(
            $store,
            $owner,
            $product,
            $cash,
            key: 'customer-first-sale',
            customerName: 'Ayu Putri',
            customerPhone: '+62 812-3456-7890',
        );
        $secondSale = $this->postSale(
            $store,
            $owner,
            $product,
            $cash,
            key: 'customer-second-sale',
            customerName: 'Ayu P.',
            customerPhone: '+6281234567890',
        );

        $customer = Customer::query()->sole();
        $this->assertSame('Ayu P.', $customer->name);
        $this->assertSame('+6281234567890', $customer->phone_normalized);
        $this->assertSame($customer->id, $firstSale->customer_id);
        $this->assertSame($customer->id, $secondSale->customer_id);
        $this->assertSame('1000.0000', $firstSale->total_amount);
        $this->assertSame('Ayu Putri', $firstSale->customer_name);
        $this->assertSame('+62 812-3456-7890', $firstSale->customer_phone);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('sales.show', $firstSale))
            ->assertInertia(fn (Assert $page) => $page
                ->where('sale.customer_name', 'Ayu Putri')
                ->where('sale.customer_phone', '+62 812-3456-7890'));
    }

    public function test_customer_fields_are_optional_but_must_be_complete_and_store_scoped(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $session = ['active_store_id' => $store->id];
        $payload = [
            'account_id' => $cash->public_id,
            'transaction_discount_amount' => '0',
            'paid_amount' => '1000',
            'occurred_at' => '2026-08-07T16:00',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '1',
                'discount_amount' => '0',
            ]],
        ];

        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)
            ->assertRedirect();
        $this->assertDatabaseCount('customers', 0);

        $payload['idempotency_key'] = (string) Str::uuid();
        $payload['customer_name'] = 'Pelanggan Tanpa Nomor';
        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)
            ->assertSessionHasErrors('customer_phone');

        $payload['customer_phone'] = 'nomor tidak valid';
        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)
            ->assertSessionHasErrors('customer_phone');

        [$otherOwner, $otherStore, $otherProduct, $otherCash] = $this->fixtures();
        $otherStore->update(['country_id' => Country::query()->where('code', 'MY')->valueOrFail('id')]);
        $otherStore->unsetRelation('country');
        $this->openStock($otherStore, $otherOwner, $otherProduct, '5', '500');
        $this->postSale(
            $store,
            $owner,
            $product,
            $cash,
            key: 'first-store-customer',
            customerName: 'Rina',
            customerPhone: '08123456789',
        );
        $this->postSale(
            $otherStore,
            $otherOwner,
            $otherProduct,
            $otherCash,
            key: 'second-store-customer',
            customerName: 'Rina',
            customerPhone: '08123456789',
        );

        $this->assertDatabaseCount('customers', 2);
        $this->assertDatabaseHas('customers', ['store_id' => $store->id, 'phone_normalized' => '+628123456789']);
        $this->assertDatabaseHas('customers', ['store_id' => $otherStore->id, 'phone_normalized' => '+608123456789']);
    }

    public function test_customer_email_updates_the_profile_and_sale_keeps_an_immutable_snapshot(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $session = ['active_store_id' => $store->id];
        $payload = [
            'sales_channel' => 'in_store',
            'payment_method' => 'cash',
            'account_id' => $cash->public_id,
            'transaction_discount_amount' => '0',
            'paid_amount' => '1000',
            'customer_name' => 'Ayu Putri',
            'customer_phone' => '081234567890',
            'customer_email' => ' AYU@EXAMPLE.COM ',
            'occurred_at' => '2026-08-07T16:00',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '1',
                'discount_amount' => '0',
            ]],
        ];

        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)->assertRedirect();
        $firstSale = Sale::query()->sole();

        $payload['customer_email'] = 'ayu.baru@example.com';
        $payload['idempotency_key'] = (string) Str::uuid();
        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)->assertRedirect();

        $customer = Customer::query()->sole();
        $this->assertSame('ayu.baru@example.com', $customer->email);
        $this->assertSame('ayu@example.com', $firstSale->customer_email);
        $this->actingAs($owner)->withSession($session)->get(route('sales.show', $firstSale))
            ->assertInertia(fn (Assert $page) => $page->where('sale.customer_email', 'ayu@example.com'));

        $payload['customer_name'] = null;
        $payload['customer_phone'] = null;
        $payload['customer_email'] = 'email@example.com';
        $payload['idempotency_key'] = (string) Str::uuid();
        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)
            ->assertSessionHasErrors(['customer_name', 'customer_phone']);
    }

    public function test_marketplace_sale_reuses_a_store_scoped_clearing_account_and_is_searchable(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $session = ['active_store_id' => $store->id];
        $payload = [
            'sales_channel' => 'marketplace',
            'payment_method' => 'marketplace',
            'marketplace_code' => 'shopee',
            'external_order_number' => 'SPX-ORDER-1001',
            'transaction_discount_amount' => '0',
            'paid_amount' => '1000',
            'occurred_at' => '2026-08-07T16:00',
            'idempotency_key' => (string) Str::uuid(),
            'items' => [[
                'product_id' => $product->public_id,
                'unit_id' => $product->baseUnit->public_id,
                'quantity' => '1',
                'discount_amount' => '0',
            ]],
        ];

        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)->assertRedirect();
        $payload['external_order_number'] = 'SPX-ORDER-1002';
        $payload['idempotency_key'] = (string) Str::uuid();
        $this->actingAs($owner)->withSession($session)->post(route('pos.sales.store'), $payload)->assertRedirect();

        $account = FinancialAccount::query()->where('store_id', $store->id)->where('marketplace_code', 'shopee')->sole();
        $this->assertSame(FinancialAccountType::EWallet, $account->type);
        $this->assertDatabaseCount('sales', 2);
        $this->assertDatabaseCount('customers', 0);
        $this->assertDatabaseHas('sale_payments', [
            'financial_account_id' => $account->id,
            'payment_method' => 'marketplace',
        ]);
        $this->assertDatabaseHas('financial_account_balances', [
            'financial_account_id' => $account->id,
            'balance' => '2000.0000',
        ]);

        $this->actingAs($owner)->withSession($session)->get(route('sales.index', [
            'period' => 'all',
            'search' => 'SPX-ORDER-1002',
            'sales_channel' => 'marketplace',
            'marketplace_code' => 'shopee',
        ]))->assertInertia(fn (Assert $page) => $page
            ->has('sales.data', 1)
            ->where('sales.data.0.external_order_number', 'SPX-ORDER-1002')
            ->where('sales.data.0.sales_channel', 'marketplace')
            ->where('sales.data.0.payment_method', 'marketplace'));
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
        ])->assertRedirect(route('sales.show', ['sale' => Sale::query()->sole(), 'print' => 1]));
        $sale = Sale::query()->sole();
        $store->settings()->update([
            'address' => 'Jl. Melati No. 10',
            'receipt_header' => 'Struk Toko Senja',
            'receipt_footer' => 'Terima kasih sudah datang.',
            'receipt_paper_size' => '80mm',
            'receipt_show_address' => true,
            'receipt_show_cashier' => false,
        ]);
        $this->actingAs($owner)->withSession($session)->get(route('sales.show', $sale))
            ->assertInertia(fn (Assert $page) => $page->component('customer/sales/show')
                ->where('canReturn', true)
                ->where('canViewProfit', true)
                ->where('openPrintDialog', false)
                ->where('receipt.address', 'Jl. Melati No. 10')
                ->where('receipt.header', 'Struk Toko Senja')
                ->where('receipt.footer', 'Terima kasih sudah datang.')
                ->where('receipt.paper_size', '80mm')
                ->where('receipt.show_cashier', false)
                ->missing('receipt.auto_print')
                ->has('items', 1));
        $this->actingAs($owner)->withSession($session)->post(route('sales.returns.store', $sale), [
            'account_id' => $cash->public_id, 'occurred_at' => '2026-08-07T17:00', 'idempotency_key' => (string) Str::uuid(),
            'items' => [['sale_item_id' => SaleItem::query()->sole()->public_id, 'quantity' => '1']],
        ])->assertRedirect();
        $this->assertDatabaseCount('sale_returns', 1);
    }

    public function test_receipt_page_issues_a_short_lived_native_print_url_for_the_active_store(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $sale = $this->postSale($store, $owner, $product, $cash);

        $response = $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id, 'locale' => 'id'])
            ->get(route('sales.show', $sale));

        $nativePrintUrl = $response->viewData('page')['props']['nativePrintUrl'];

        $this->assertIsString($nativePrintUrl);
        $this->get($nativePrintUrl)
            ->assertOk()
            ->assertJsonPath('version', 1)
            ->assertJsonPath('store_id', $store->public_id)
            ->assertJsonPath('sale_id', $sale->public_id)
            ->assertJsonPath('currency', 'IDR')
            ->assertJsonPath('currency_format.symbol', 'Rp')
            ->assertJsonPath('currency_format.decimal_places', 0)
            ->assertJsonPath('currency_format.symbol_position', 'before')
            ->assertJsonPath('receipt.store_name', $store->name)
            ->assertJsonPath('sale.document_number', $sale->document_number)
            ->assertJsonPath('sale.sales_channel', 'in_store')
            ->assertJsonPath('sale.marketplace_label', null)
            ->assertJsonPath('labels.cashier', 'Kasir')
            ->assertJsonPath('labels.order', 'Pesanan')
            ->assertJsonCount(1, 'items')
            ->assertHeader('cache-control', 'no-store, private');
    }

    public function test_native_print_payload_rejects_invalid_and_expired_signatures(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $sale = $this->postSale($store, $owner, $product, $cash);

        $this->get(route('sales.native-print', $sale))->assertForbidden();

        $url = URL::temporarySignedRoute('sales.native-print', now()->addSecond(), ['sale' => $sale]);
        $this->travel(2)->seconds();
        $this->get($url)->assertForbidden();
    }

    public function test_default_receipt_copy_follows_locale_without_translating_store_copy(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $sale = $this->postSale($store, $owner, $product, $cash);
        $session = ['active_store_id' => $store->id, 'market' => 'ms', 'locale' => 'ms'];

        $this->actingAs($owner)->withSession($session)->get(route('sales.show', $sale))
            ->assertInertia(fn (Assert $page) => $page
                ->where('receipt.header', 'Bukti jualan')
                ->where('receipt.footer', 'Terima kasih. Simpan resit ini sebagai rujukan pemulangan.'));

        $store->settings()->update([
            'receipt_header' => 'My Store Receipt',
            'receipt_footer' => 'Custom footer',
        ]);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id, 'market' => 'id', 'locale' => 'en'])
            ->get(route('sales.show', $sale))
            ->assertInertia(fn (Assert $page) => $page
                ->where('receipt.header', 'My Store Receipt')
                ->where('receipt.footer', 'Custom footer'));
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
        $this->travelTo(CarbonImmutable::parse('2026-08-07 18:00:00', 'Asia/Jakarta'));
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '30', '500');
        foreach (range(1, 26) as $index) {
            $this->postSale($store, $owner, $product, $cash, key: "page-sale-{$index}");
        }
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('sales.index'))
            ->assertInertia(fn (Assert $page) => $page->component('customer/sales/index')->has('sales.data', 25)->where('sales.total', 26));
        $this->actingAs($owner)->withSession($session)->get(route('sales.index', ['page' => 2]))
            ->assertInertia(fn (Assert $page) => $page->has('sales.data', 1));
    }

    public function test_sales_history_defaults_to_today_and_can_show_the_current_month(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-08-10 18:00:00', 'Asia/Jakarta'));
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $this->postSale(
            $store,
            $owner,
            $product,
            $cash,
            key: 'earlier-sale',
            occurredAt: '2026-08-07T09:00:00Z',
        );
        $this->postSale(
            $store,
            $owner,
            $product,
            $cash,
            key: 'today-sale',
            occurredAt: '2026-08-10T09:00:00Z',
        );
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('sales.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('customer/sales/index')
                ->where('filters.period', 'today')
                ->where('filters.view', 'history')
                ->has('sales.data', 1));

        $this->actingAs($owner)->withSession($session)->get(route('sales.index', [
            'period' => 'month',
            'view' => 'returns',
            'from' => 'pos',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('filters.period', 'month')
            ->where('filters.view', 'returns')
            ->where('filters.from', 'pos')
            ->has('sales.data', 2));
    }

    public function test_sales_history_can_find_a_receipt_by_customer_and_filter_payment_and_presence(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-08-10 18:00:00', 'Asia/Jakarta'));
        [$owner, $store, $product, $cash, $bank] = $this->fixtures();
        $this->openStock($store, $owner, $product, '10', '500');
        $customerSale = $this->postSale(
            $store,
            $owner,
            $product,
            $bank,
            key: 'searchable-customer-sale',
            occurredAt: '2026-08-07T09:00:00Z',
            customerName: 'Ayu Putri',
            customerPhone: '+62 812-3456-7890',
        );
        $this->postSale($store, $owner, $product, $cash, key: 'guest-sale', occurredAt: '2026-08-10T09:00:00Z');
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('sales.index', [
            'period' => 'all',
            'search' => '081234567890',
            'payment_method' => 'qris',
            'customer' => 'identified',
        ]))->assertInertia(fn (Assert $page) => $page
            ->component('customer/sales/index')
            ->where('filters.search', '081234567890')
            ->where('filters.period', 'all')
            ->where('filters.payment_method', 'qris')
            ->where('filters.customer', 'identified')
            ->has('sales.data', 1)
            ->where('sales.data.0.public_id', $customerSale->public_id)
            ->where('sales.data.0.customer_name', 'Ayu Putri')
            ->where('sales.data.0.customer_phone', '+62 812-3456-7890')
            ->where('sales.data.0.payment_method', 'qris'));

        $this->actingAs($owner)->withSession($session)->get(route('sales.index', [
            'period' => 'all',
            'search' => $customerSale->document_number,
        ]))->assertInertia(fn (Assert $page) => $page
            ->has('sales.data', 1)
            ->where('sales.data.0.public_id', $customerSale->public_id));
    }

    public function test_sales_history_supports_custom_store_dates_and_keeps_other_store_sales_private(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-08-10 18:00:00', 'Asia/Jakarta'));
        [$owner, $store, $product, $cash] = $this->fixtures();
        $this->openStock($store, $owner, $product, '5', '500');
        $this->postSale($store, $owner, $product, $cash, key: 'before-custom-range', occurredAt: '2026-08-07T09:00:00Z');
        $saleInRange = $this->postSale($store, $owner, $product, $cash, key: 'inside-custom-range', occurredAt: '2026-08-10T09:00:00Z');

        [$otherOwner, $otherStore, $otherProduct, $otherCash] = $this->fixtures();
        $this->openStock($otherStore, $otherOwner, $otherProduct, '5', '500');
        $this->postSale(
            $otherStore,
            $otherOwner,
            $otherProduct,
            $otherCash,
            key: 'other-store-matching-sale',
            occurredAt: '2026-08-10T09:00:00Z',
            customerName: 'Ayu Putri',
            customerPhone: '081234567890',
        );

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->get(route('sales.index', [
            'period' => 'custom',
            'start_date' => '2026-08-10',
            'end_date' => '2026-08-10',
        ]))->assertInertia(fn (Assert $page) => $page
            ->where('filters.period', 'custom')
            ->where('filters.start_date', '2026-08-10')
            ->where('filters.end_date', '2026-08-10')
            ->has('sales.data', 1)
            ->where('sales.data.0.public_id', $saleInRange->public_id));

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->get(route('sales.index', [
            'period' => 'all',
            'search' => 'Ayu Putri',
        ]))->assertInertia(fn (Assert $page) => $page->has('sales.data', 0));
    }

    /** @return array{User, Store, Product, FinancialAccount, FinancialAccount} */
    private function fixtures(string $sellingPrice = '1000'): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $product->productUnits()->sole()->update(['selling_price' => $sellingPrice]);
        $cash = FinancialAccount::factory()->for($store)->create(['name' => 'Kas', 'type' => FinancialAccountType::Cash]);
        $bank = FinancialAccount::factory()->for($store)->create([
            'name' => 'QRIS',
            'type' => FinancialAccountType::EWallet,
            'payment_code' => 'qris',
        ]);

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

    private function postSale(Store $store, User $owner, Product $product, FinancialAccount $account, string $quantity = '1', string $itemDiscount = '0', string $transactionDiscount = '0', ?string $paid = null, string $key = 'sale-key', string $occurredAt = '2026-08-07T09:00:00Z', ?string $customerName = null, ?string $customerPhone = null): Sale
    {
        $gross = Decimal::multiply($quantity, (string) $product->productUnits()->sole()->selling_price);
        $paid ??= Decimal::subtract(Decimal::subtract($gross, $itemDiscount, Decimal::MONEY_SCALE), $transactionDiscount, Decimal::MONEY_SCALE);

        return app(PostSale::class)->handle($store, $owner, $account->id, [[
            'product_unit_id' => $product->productUnits()->sole()->id, 'quantity' => $quantity, 'item_discount' => $itemDiscount,
        ]], $transactionDiscount, $paid, $occurredAt, null, $key, null, null, $customerName, $customerPhone);
    }
}
