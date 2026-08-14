<?php

namespace Tests\Feature;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\ApplyCashTransaction;
use App\Actions\Ledgers\NextDocumentNumber;
use App\Actions\Ledgers\PostOpeningCash;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Actions\Purchasing\ApplyPurchasePayment;
use App\Actions\Purchasing\ApplySupplierPayable;
use App\Actions\Purchasing\PostPurchase;
use App\Actions\Purchasing\PostPurchasePayment;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\CashTransaction;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountBalance;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\ProductUnit;
use App\Models\Purchase;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\SupplierPayableBalance;
use App\Models\SupplierPayableTransaction;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class PurchasingTest extends TestCase
{
    use RefreshDatabase;

    public function test_credit_purchase_updates_stock_value_and_supplier_payable_atomically(): void
    {
        [$owner, $store, $product, $supplier] = $this->fixtures();
        $purchase = $this->postPurchase($store, $owner, $product, $supplier, quantity: '10', unitPrice: '1000', discount: '1000', additionalCost: '500');

        $this->assertSame('9500.0000', $purchase->total_amount);
        $this->assertSame('10.000000', InventoryBalance::query()->sole()->quantity);
        $this->assertSame('950.0000', InventoryBalance::query()->sole()->average_cost);
        $this->assertSame('9500.0000', InventoryBalance::query()->sole()->inventory_value);
        $this->assertSame('9500.0000', SupplierPayableBalance::query()->sole()->balance);
        $this->assertDatabaseHas('supplier_payable_transactions', ['reason' => 'purchase', 'direction' => 'increase', 'amount' => 9500]);
        $this->assertDatabaseCount('cash_transactions', 0);
    }

    public function test_purchase_unit_conversion_and_moving_average_use_landed_cost(): void
    {
        [$owner, $store, $product, $supplier] = $this->fixtures();
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '12', 'unit_cost' => '500']], '2026-08-07T09:00:00Z', null, 'opening-before-purchase');
        $pack = Unit::factory()->for($store)->create(['name' => 'Karton', 'symbol' => 'ctn']);
        $productUnit = ProductUnit::create([
            'store_id' => $store->id, 'product_id' => $product->id, 'unit_id' => $pack->id,
            'conversion_factor' => 12, 'purchase_price' => 12000, 'selling_price' => 0, 'is_active' => true,
        ]);
        app(PostPurchase::class)->handle($store, $owner, $supplier->id, [[
            'product_unit_id' => $productUnit->id, 'quantity' => '2', 'unit_price' => '12000',
        ]], '0', '0', null, '0', '2026-08-07T10:00:00Z', 'INV-CONVERSION', null, 'conversion-purchase');

        $balance = InventoryBalance::query()->sole();
        $this->assertSame('36.000000', $balance->quantity);
        $this->assertSame('833.3333', $balance->average_cost);
        $this->assertSame('30000.0000', $balance->inventory_value);
        $this->assertDatabaseHas('purchase_items', ['quantity' => 2, 'base_quantity' => 24, 'landed_total' => 24000, 'base_unit_cost' => 1000]);
    }

    public function test_cash_and_partial_purchases_reconcile_cash_and_payable_balances(): void
    {
        [$owner, $store, $product, $supplier, $cash] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '30000', '2026-08-07T08:00:00Z', null, 'purchase-cash-opening');
        $cashPurchase = $this->postPurchase($store, $owner, $product, $supplier, quantity: '2', unitPrice: '1000', account: $cash, paid: '2000', key: 'cash-purchase', occurredAt: '2026-08-07T09:00:00Z');
        $partialPurchase = $this->postPurchase($store, $owner, $product, $supplier, quantity: '10', unitPrice: '1000', account: $cash, paid: '2500', key: 'partial-purchase', occurredAt: '2026-08-07T10:00:00Z');

        $this->assertSame('25500.0000', FinancialAccountBalance::query()->sole()->balance);
        $this->assertSame('7500.0000', SupplierPayableBalance::query()->sole()->balance);
        $this->assertDatabaseHas('purchase_payments', ['purchase_id' => $cashPurchase->id, 'amount' => 2000]);
        $this->assertDatabaseHas('purchase_payments', ['purchase_id' => $partialPurchase->id, 'amount' => 2500]);

        app(PostPurchasePayment::class)->handle($store, $owner, $partialPurchase->id, $cash->id, '7500', '2026-08-07T11:00:00Z', null, 'partial-payment');
        $this->assertSame('18000.0000', FinancialAccountBalance::query()->sole()->balance);
        $this->assertSame('0.0000', SupplierPayableBalance::query()->sole()->balance);
    }

    public function test_overpayment_is_rejected_without_partial_cash_or_payable_changes(): void
    {
        [$owner, $store, $product, $supplier, $cash] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '10000', '2026-08-07T08:00:00Z', null, 'overpay-opening');
        $purchase = $this->postPurchase($store, $owner, $product, $supplier, quantity: '5', unitPrice: '1000', occurredAt: '2026-08-07T09:00:00Z');

        try {
            app(PostPurchasePayment::class)->handle($store, $owner, $purchase->id, $cash->id, '5001', '2026-08-07T10:00:00Z', null, 'overpay-payment');
            $this->fail('Overpayment should be rejected.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('purchase_payments', 0);
            $this->assertSame('10000.0000', FinancialAccountBalance::query()->sole()->balance);
            $this->assertSame('5000.0000', SupplierPayableBalance::query()->sole()->balance);
        }
    }

    public function test_insufficient_initial_cash_rolls_back_purchase_stock_and_payable(): void
    {
        [$owner, $store, $product, $supplier, $cash] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '1000', '2026-08-07T08:00:00Z', null, 'insufficient-opening');

        try {
            $this->postPurchase($store, $owner, $product, $supplier, quantity: '2', unitPrice: '1000', account: $cash, paid: '2000', occurredAt: '2026-08-07T09:00:00Z');
            $this->fail('Insufficient cash should reject the complete purchase.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('purchases', 0);
            $this->assertDatabaseCount('stock_movements', 0);
            $this->assertDatabaseCount('supplier_payable_transactions', 0);
            $this->assertSame('1000.0000', FinancialAccountBalance::query()->sole()->balance);
        }
    }

    public function test_purchase_and_payment_retries_are_idempotent_and_payload_is_bound_to_key(): void
    {
        [$owner, $store, $product, $supplier, $cash] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '10000', '2026-08-07T08:00:00Z', null, 'retry-opening');
        $first = $this->postPurchase($store, $owner, $product, $supplier, key: 'same-purchase', occurredAt: '2026-08-07T09:00:00Z');
        $second = $this->postPurchase($store, $owner, $product, $supplier, key: 'same-purchase', occurredAt: '2026-08-07T09:00:00Z');
        $payment = app(PostPurchasePayment::class);
        $firstPayment = $payment->handle($store, $owner, $first->id, $cash->id, '500', '2026-08-07T10:00:00Z', null, 'same-payment');
        $secondPayment = $payment->handle($store, $owner, $first->id, $cash->id, '500', '2026-08-07T10:00:00Z', null, 'same-payment');

        $this->assertTrue($first->is($second));
        $this->assertTrue($firstPayment->is($secondPayment));
        $this->assertDatabaseCount('purchases', 1);
        $this->assertDatabaseCount('purchase_payments', 1);

        $this->expectException(ValidationException::class);
        $this->postPurchase($store, $owner, $product, $supplier, quantity: '2', key: 'same-purchase', occurredAt: '2026-08-07T09:00:00Z');
    }

    public function test_audit_failure_rolls_back_all_purchase_ledgers(): void
    {
        [$owner, $store, $product, $supplier] = $this->fixtures();
        $this->mock(RecordAudit::class)->shouldReceive('handle')->andThrow(new RuntimeException('Injected audit failure'));

        try {
            $this->postPurchase($store, $owner, $product, $supplier);
            $this->fail('Injected audit failure should be thrown.');
        } catch (RuntimeException) {
            $this->assertDatabaseCount('purchases', 0);
            $this->assertDatabaseCount('stock_movements', 0);
            $this->assertDatabaseCount('supplier_payable_transactions', 0);
            $this->assertDatabaseCount('supplier_payable_balances', 0);
        }
    }

    public function test_cross_store_domain_and_http_references_are_rejected(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        [, , , $foreignSupplier] = $this->fixtures();

        try {
            $this->postPurchase($store, $owner, $product, $foreignSupplier);
            $this->fail('Cross-store supplier should be rejected.');
        } catch (ModelNotFoundException) {
            $this->assertDatabaseCount('purchases', 0);
        }

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->post(route('purchasing.store'), [
            'supplier_id' => $foreignSupplier->public_id,
            'occurred_at' => '2026-08-07T10:00', 'idempotency_key' => (string) Str::uuid(),
            'discount_amount' => '0', 'additional_cost' => '0', 'paid_amount' => '0',
            'items' => [['product_id' => $product->public_id, 'unit_id' => $product->baseUnit->public_id, 'quantity' => '1', 'unit_price' => '1000']],
        ])->assertSessionHasErrors('supplier_id');
        $this->assertDatabaseCount('purchases', 0);
    }

    public function test_owner_can_use_purchasing_page_while_cashier_is_read_only(): void
    {
        [$owner, $store, $product, $supplier] = $this->fixtures();
        $cashier = User::factory()->create();
        $store->users()->attach($cashier, ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value]);
        $session = ['active_store_id' => $store->id];
        $payload = [
            'supplier_id' => $supplier->public_id, 'occurred_at' => '2026-08-07T10:00', 'idempotency_key' => (string) Str::uuid(),
            'discount_amount' => '0', 'additional_cost' => '0', 'paid_amount' => '0',
            'items' => [['product_id' => $product->public_id, 'unit_id' => $product->baseUnit->public_id, 'quantity' => '1', 'unit_price' => '1000']],
        ];

        $this->actingAs($owner)->withSession($session)->get(route('purchasing.index'))
            ->assertInertia(fn (Assert $page) => $page->component('purchasing/index')->where('canManage', true));
        $this->actingAs($cashier)->withSession($session)->get(route('purchasing.index'))
            ->assertInertia(fn (Assert $page) => $page->where('canManage', false));
        $this->actingAs($cashier)->withSession($session)->post(route('purchasing.store'), $payload)->assertForbidden();
        $this->actingAs($owner)->withSession($session)->post(route('purchasing.store'), $payload)->assertRedirect();
        $this->assertDatabaseCount('purchases', 1);
    }

    public function test_derived_quantity_and_base_cost_capacity_are_validated_before_persistence(): void
    {
        [$owner, $store, $product, $supplier] = $this->fixtures();
        $tinyUnit = Unit::factory()->for($store)->create();
        $productUnit = ProductUnit::create([
            'store_id' => $store->id, 'product_id' => $product->id, 'unit_id' => $tinyUnit->id,
            'conversion_factor' => '0.000001', 'purchase_price' => 1, 'selling_price' => 0, 'is_active' => true,
        ]);

        foreach ([
            ['quantity' => '0.000001', 'unit_price' => '1', 'key' => 'derived-underflow'],
            ['quantity' => '1', 'unit_price' => '999999999999999.9999', 'key' => 'derived-cost-overflow'],
        ] as $case) {
            try {
                app(PostPurchase::class)->handle($store, $owner, $supplier->id, [[
                    'product_unit_id' => $productUnit->id, 'quantity' => $case['quantity'], 'unit_price' => $case['unit_price'],
                ]], '0', '0', null, '0', '2026-08-07T10:00:00Z', null, null, $case['key']);
                $this->fail('Invalid derived decimal should be rejected.');
            } catch (ValidationException) {
                $this->assertDatabaseCount('purchases', 0);
                $this->assertDatabaseCount('stock_movements', 0);
            }
        }

        $largeUnit = Unit::factory()->for($store)->create();
        $largeProductUnit = ProductUnit::create([
            'store_id' => $store->id, 'product_id' => $product->id, 'unit_id' => $largeUnit->id,
            'conversion_factor' => '2', 'purchase_price' => 1, 'selling_price' => 0, 'is_active' => true,
        ]);
        $this->expectException(ValidationException::class);
        app(PostPurchase::class)->handle($store, $owner, $supplier->id, [[
            'product_unit_id' => $largeProductUnit->id, 'quantity' => '999999999999.999999', 'unit_price' => '1',
        ]], '0', '0', null, '0', '2026-08-07T10:00:00Z', null, null, 'derived-quantity-overflow');
    }

    public function test_duplicate_supplier_invoice_is_a_validation_error_in_action_and_http(): void
    {
        [$owner, $store, $product, $supplier] = $this->fixtures();
        $productUnit = $product->productUnits()->sole();
        app(PostPurchase::class)->handle($store, $owner, $supplier->id, [[
            'product_unit_id' => $productUnit->id, 'quantity' => '1', 'unit_price' => '1000',
        ]], '0', '0', null, '0', '2026-08-07T10:00:00Z', 'INV-DUPLICATE', null, 'invoice-first');

        try {
            app(PostPurchase::class)->handle($store, $owner, $supplier->id, [[
                'product_unit_id' => $productUnit->id, 'quantity' => '1', 'unit_price' => '1000',
            ]], '0', '0', null, '0', '2026-08-07T10:00:00Z', 'INV-DUPLICATE', null, 'invoice-second');
            $this->fail('Duplicate invoice should be rejected by the action.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('supplier_invoice_number', $exception->errors());
            $this->assertDatabaseCount('purchases', 1);
        }

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->post(route('purchasing.store'), [
            'supplier_id' => $supplier->public_id, 'supplier_invoice_number' => 'INV-DUPLICATE',
            'occurred_at' => '2026-08-07T11:00', 'idempotency_key' => (string) Str::uuid(),
            'discount_amount' => '0', 'additional_cost' => '0', 'paid_amount' => '0',
            'items' => [['product_id' => $product->public_id, 'unit_id' => $product->baseUnit->public_id, 'quantity' => '1', 'unit_price' => '1000']],
        ])->assertSessionHasErrors('supplier_invoice_number');
        $this->assertDatabaseCount('purchases', 1);
    }

    public function test_backdated_purchase_and_payment_are_rejected_without_partial_ledgers(): void
    {
        [$owner, $store, $product, $supplier, $cash] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '10000', '2026-08-07T08:00:00Z', null, 'backdated-opening');
        $purchase = $this->postPurchase($store, $owner, $product, $supplier, occurredAt: '2026-08-07T10:00:00Z');

        try {
            $this->postPurchase($store, $owner, $product, $supplier, key: 'backdated-purchase', occurredAt: '2026-08-07T09:00:00Z');
            $this->fail('Backdated purchase should be rejected.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('purchases', 1);
            $this->assertDatabaseCount('stock_movements', 1);
        }

        try {
            app(PostPurchasePayment::class)->handle($store, $owner, $purchase->id, $cash->id, '100', '2026-08-07T09:30:00Z', null, 'backdated-payment');
            $this->fail('Backdated payment should be rejected.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('purchase_payments', 0);
            $this->assertDatabaseCount('cash_transactions', 1);
            $this->assertSame('1000.0000', SupplierPayableBalance::query()->sole()->balance);
        }
    }

    public function test_phase_four_documents_are_immutable(): void
    {
        [$owner, $store, $product, $supplier, $cash] = $this->fixtures();
        app(PostOpeningCash::class)->handle($store, $owner, $cash->id, '2000', '2026-08-07T08:00:00Z', null, 'immutable-opening');
        $purchase = $this->postPurchase($store, $owner, $product, $supplier, occurredAt: '2026-08-07T09:00:00Z');
        $payment = app(PostPurchasePayment::class)->handle($store, $owner, $purchase->id, $cash->id, '100', '2026-08-07T10:00:00Z', null, 'immutable-payment');

        try {
            $purchase->update(['total_amount' => '1']);
            $this->fail('Purchase should be immutable.');
        } catch (\LogicException) {
            $this->assertSame('1000.0000', $purchase->fresh()?->total_amount);
        }

        $this->expectException(\LogicException::class);
        $payment->delete();
    }

    public function test_purchase_payment_uses_payable_before_cash_lock_order(): void
    {
        [$owner, $store, $product, $supplier] = $this->fixtures();
        $purchase = $this->postPurchase($store, $owner, $product, $supplier);
        $account = FinancialAccount::factory()->for($store)->create();
        $payable = Mockery::mock(ApplySupplierPayable::class);
        $cash = Mockery::mock(ApplyCashTransaction::class);
        $payable->shouldReceive('handle')->once()->ordered()->andReturn(new SupplierPayableTransaction);
        $cash->shouldReceive('handle')->once()->ordered()->andReturn(new CashTransaction);
        $action = new ApplyPurchasePayment(app(NextDocumentNumber::class), $cash, $payable);

        $action->handle($purchase, $account->id, '100', now(), $owner, null, 'ordered-payment', hash('sha256', 'ordered-payment'));
        $this->assertDatabaseHas('purchase_payments', ['purchase_id' => $purchase->id, 'amount' => 100]);
    }

    /** @return array{User, Store, Product, Supplier, FinancialAccount} */
    private function fixtures(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $supplier = Supplier::factory()->for($store)->create();
        $cash = FinancialAccount::factory()->for($store)->create(['name' => 'Kas']);

        return [$owner, $store, $product, $supplier, $cash];
    }

    private function postPurchase(
        Store $store,
        User $owner,
        Product $product,
        Supplier $supplier,
        string $quantity = '1',
        string $unitPrice = '1000',
        string $discount = '0',
        string $additionalCost = '0',
        ?FinancialAccount $account = null,
        string $paid = '0',
        string $key = 'purchase-key',
        string $occurredAt = '2026-08-07T10:00:00Z',
    ): Purchase {
        $productUnit = $product->productUnits()->sole();

        return app(PostPurchase::class)->handle($store, $owner, $supplier->id, [[
            'product_unit_id' => $productUnit->id, 'quantity' => $quantity, 'unit_price' => $unitPrice,
        ]], $discount, $additionalCost, $account?->id, $paid, $occurredAt, null, null, $key);
    }
}
