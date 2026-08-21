<?php

namespace Tests\Feature;

use App\Actions\Audit\RecordAudit;
use App\Actions\Expenses\PostExpense;
use App\Actions\Ledgers\PostOpeningCash;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Actions\Sales\PostSale;
use App\Actions\Sales\PostSaleReturn;
use App\Enums\FinancialAccountType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\ExpenseCategory;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountBalance;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\SupplierPayableBalance;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class ExpensesReportsTest extends TestCase
{
    use RefreshDatabase;

    public function test_expense_posting_reconciles_document_cash_ledger_and_audit(): void
    {
        [$owner, $store, , $cash, , $category] = $this->fixtures();
        $this->openCash($store, $owner, $cash, '1000');

        $expense = app(PostExpense::class)->handle($store, $owner, $category->id, $cash->id, '250.50', '2026-08-08T10:00:00Z', 'Listrik', 'expense-1');

        $this->assertStringStartsWith('EXP-202608-', $expense->document_number);
        $this->assertSame('250.5000', $expense->amount);
        $this->assertSame('749.5000', FinancialAccountBalance::query()->sole()->balance);
        $this->assertDatabaseHas('cash_transactions', ['direction' => 'out', 'reason' => 'expense', 'amount' => 250.5, 'reference_type' => $expense->getMorphClass(), 'reference_id' => $expense->id]);
        $this->assertDatabaseHas('audit_logs', ['store_id' => $store->id, 'action' => 'expense.posted', 'subject_id' => $expense->id]);
    }

    public function test_expense_is_idempotent_payload_bound_and_immutable(): void
    {
        [$owner, $store, , $cash, , $category] = $this->fixtures();
        $this->openCash($store, $owner, $cash, '1000');
        $action = app(PostExpense::class);
        $first = $action->handle($store, $owner, $category->id, $cash->id, '100', '2026-08-08T10:00:00Z', null, 'same-expense');
        $second = $action->handle($store, $owner, $category->id, $cash->id, '100', '2026-08-08T10:00:00Z', null, 'same-expense');

        $this->assertTrue($first->is($second));
        $this->assertDatabaseCount('expenses', 1);
        $this->assertDatabaseCount('cash_transactions', 2);
        try {
            $first->update(['amount' => '1']);
            $this->fail('Posted expense must be immutable.');
        } catch (LogicException) {
            $this->assertSame('100.0000', $first->fresh()?->amount);
        }

        $this->expectException(ValidationException::class);
        $action->handle($store, $owner, $category->id, $cash->id, '101', '2026-08-08T10:00:00Z', null, 'same-expense');
    }

    public function test_insufficient_balance_and_audit_failure_roll_back_the_entire_expense(): void
    {
        [$owner, $store, , $cash, , $category] = $this->fixtures();
        $this->openCash($store, $owner, $cash, '100');

        try {
            app(PostExpense::class)->handle($store, $owner, $category->id, $cash->id, '150', '2026-08-08T10:00:00Z', null, 'expense-no-cash');
            $this->fail('Insufficient expense balance should fail.');
        } catch (ValidationException) {
            $this->assertDatabaseCount('expenses', 0);
            $this->assertSame('100.0000', FinancialAccountBalance::query()->sole()->balance);
            $this->assertDatabaseCount('cash_transactions', 1);
        }

        $this->mock(RecordAudit::class)->shouldReceive('handle')->andThrow(new RuntimeException('Injected expense audit failure'));
        try {
            app(PostExpense::class)->handle($store, $owner, $category->id, $cash->id, '50', '2026-08-08T10:00:00Z', null, 'expense-audit-failure');
            $this->fail('Audit failure should fail expense posting.');
        } catch (RuntimeException) {
            $this->assertDatabaseCount('expenses', 0);
            $this->assertSame('100.0000', FinancialAccountBalance::query()->sole()->balance);
            $this->assertDatabaseCount('cash_transactions', 1);
        }
    }

    public function test_expense_http_routes_reject_cashier_and_cross_store_references(): void
    {
        [$owner, $store, , $cash, , $category] = $this->fixtures();
        [, , , $foreignCash, , $foreignCategory] = $this->fixtures();
        $cashier = User::factory()->create();
        $store->users()->attach($cashier, ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value]);
        $session = ['active_store_id' => $store->id];

        $this->actingAs($cashier)->withSession($session)->get(route('expenses.index'))->assertForbidden();
        $this->actingAs($cashier)->withSession($session)->get(route('reports.index'))->assertForbidden();
        $this->actingAs($cashier)->withSession($session)->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')->where('canViewBusinessPosition', false)->missing('performance')->missing('position')->missing('lowStock'));

        $this->actingAs($owner)->withSession($session)->post(route('expenses.store'), [
            'category_id' => $foreignCategory->public_id, 'account_id' => $foreignCash->public_id, 'amount' => '10',
            'occurred_at' => '2026-08-08T10:00', 'idempotency_key' => (string) Str::uuid(),
        ])->assertSessionHasErrors(['category_id', 'account_id']);
        $this->assertDatabaseCount('expenses', 0);

        $this->expectException(ModelNotFoundException::class);
        app(PostExpense::class)->handle($store, $owner, $foreignCategory->id, $cash->id, '10', '2026-08-08T10:00:00Z', null, 'foreign-expense');
    }

    public function test_dashboard_and_report_reconcile_sales_returns_cogs_expenses_and_positions(): void
    {
        CarbonImmutable::setTestNow('2026-08-08T12:00:00+07:00');
        [$owner, $store, $product, $cash, , $category] = $this->fixtures();
        $product->productUnits()->sole()->update(['selling_price' => '1000']);
        $this->openCash($store, $owner, $cash, '10000');
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [['product_id' => $product->id, 'quantity' => '10', 'unit_cost' => '500']], '2026-08-07T08:00:00Z', null, 'report-stock');
        $sale = app(PostSale::class)->handle($store, $owner, $cash->id, [[
            'product_unit_id' => $product->productUnits()->sole()->id, 'quantity' => '4', 'item_discount' => '0',
        ]], '0', '4000', '2026-08-07T09:00:00Z', null, 'report-sale');
        app(PostSaleReturn::class)->handle($store, $owner, $sale->id, $cash->id, [[
            'sale_item_id' => SaleItem::query()->sole()->id, 'quantity' => '1',
        ]], '2026-08-07T10:00:00Z', null, 'report-return');
        $soldProductName = $product->name;
        $product->update(['name' => 'Nama Produk Setelah Transaksi']);
        app(PostExpense::class)->handle($store, $owner, $category->id, $cash->id, '300', '2026-08-07T11:00:00Z', null, 'report-expense');
        $supplier = Supplier::factory()->for($store)->create();
        SupplierPayableBalance::create(['store_id' => $store->id, 'supplier_id' => $supplier->id, 'balance' => '700']);
        InventoryBalance::query()->sole()->update(['minimum_quantity' => '8']);
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->component('dashboard')
                ->where('canViewBusinessPosition', true)
                ->where('performance.net_revenue', '3000.0000')
                ->where('performance.net_cogs', '1500.0000')
                ->where('performance.gross_profit', '1500.0000')
                ->where('performance.expenses', '300.0000')
                ->where('performance.estimated_profit', '1200.0000')
                ->where('position.cash_balance', '12700.0000')
                ->where('position.inventory_value', '3500.0000')
                ->where('position.supplier_payable', '700.0000')
                ->where('position.low_stock_count', 1)
                ->where('transactions', 1)
                ->where('storeCount', 1)
                ->where('period.key', 'month')
                ->where('comparison.previous_net_revenue', '0.0000')
                ->has('salesTrend', 8)
                ->has('storePerformance', 1)
                ->where('storePerformance.0.public_id', $store->public_id)
                ->where('storePerformance.0.net_revenue', '3000.0000')
                ->where('storePerformance.0.estimated_profit', '1200.0000')
                ->where('storePerformance.0.transactions', 1)
                ->has('topProducts', 1)
                ->where('topProducts.0.product_name', $soldProductName)
                ->where('topProducts.0.net_revenue', '3000.0000')
                ->has('categorySales', 1)
                ->where('categorySales.0.category_name', 'Tanpa Kategori')
                ->where('categorySales.0.net_revenue', '3000.0000')
                ->has('lowStock', 1));

        $this->actingAs($owner)->withSession($session)->get(route('dashboard', ['period' => 'day']))
            ->assertInertia(fn (Assert $page) => $page->component('dashboard')
                ->where('period.key', 'day')
                ->where('performance.net_revenue', '0.0000')
                ->where('transactions', 0)
                ->has('salesTrend', 1)
                ->has('topProducts', 0)
                ->has('categorySales', 0));

        $this->actingAs($owner)->withSession($session)->get(route('reports.index', ['start_date' => '2026-08-07', 'end_date' => '2026-08-07']))
            ->assertInertia(fn (Assert $page) => $page->component('reports/index')
                ->where('performance.estimated_profit', '1200.0000')
                ->where('daily.0.net_revenue', '3000.0000')
                ->where('daily.0.gross_profit', '1500.0000')
                ->where('daily.0.expenses', '300.0000')
                ->where('products.0.product_name', $soldProductName)
                ->where('products.0.quantity_sold', '4.000000')
                ->where('products.0.quantity_returned', '1.000000')
                ->where('products.0.net_revenue', '3000.0000')
                ->where('products.0.net_cogs', '1500.0000'));
    }

    public function test_reports_exclude_other_stores_and_transactions_outside_the_period(): void
    {
        [$owner, $store, , $cash, , $category] = $this->fixtures();
        [$foreignOwner, $foreignStore, , $foreignCash, , $foreignCategory] = $this->fixtures();
        $this->openCash($store, $owner, $cash, '1000');
        $this->openCash($foreignStore, $foreignOwner, $foreignCash, '1000');
        app(PostExpense::class)->handle($store, $owner, $category->id, $cash->id, '100', '2026-08-07T10:00:00Z', null, 'period-expense');
        app(PostExpense::class)->handle($store, $owner, $category->id, $cash->id, '200', '2026-08-08T10:00:00Z', null, 'outside-expense');
        app(PostExpense::class)->handle($foreignStore, $foreignOwner, $foreignCategory->id, $foreignCash->id, '900', '2026-08-07T10:00:00Z', null, 'foreign-report-expense');

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('reports.index', ['start_date' => '2026-08-07', 'end_date' => '2026-08-07']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('performance.expenses', '100.0000')
                ->where('performance.estimated_profit', '-100.0000')
                ->where('daily.0.expenses', '100.0000'));
    }

    public function test_report_rejects_inverted_and_overlong_periods(): void
    {
        [$owner, $store] = $this->fixtures();
        $session = ['active_store_id' => $store->id];

        $this->actingAs($owner)->withSession($session)->from(route('reports.index'))
            ->get(route('reports.index', ['start_date' => '2026-08-08', 'end_date' => '2026-08-07']))
            ->assertRedirect(route('reports.index'))->assertSessionHasErrors('end_date');
        $this->actingAs($owner)->withSession($session)->from(route('reports.index'))
            ->get(route('reports.index', ['start_date' => '2025-01-01', 'end_date' => '2026-08-08']))
            ->assertRedirect(route('reports.index'))->assertSessionHasErrors('end_date');
    }

    public function test_expense_history_is_paginated_after_twenty_documents(): void
    {
        [$owner, $store, , $cash, , $category] = $this->fixtures();
        $this->openCash($store, $owner, $cash, '1000');
        foreach (range(1, 21) as $index) {
            app(PostExpense::class)->handle($store, $owner, $category->id, $cash->id, '1', '2026-08-08T10:00:00Z', null, "paged-expense-{$index}");
        }

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->get(route('expenses.index'))
            ->assertInertia(fn (Assert $page) => $page->component('expenses/index')->has('expenses.data', 20)->where('expenses.total', 21)->has('expenses.links'));
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])->get(route('expenses.index', ['page' => 2]))
            ->assertInertia(fn (Assert $page) => $page->has('expenses.data', 1));
    }

    public function test_expense_summary_uses_the_same_tenant_scoped_filters_as_the_history(): void
    {
        [$owner, $store, , $cash, , $category] = $this->fixtures();
        [$foreignOwner, $foreignStore, , $foreignCash, , $foreignCategory] = $this->fixtures();
        $marketing = ExpenseCategory::create(['store_id' => $store->id, 'name' => 'Marketing', 'is_active' => true]);
        $this->openCash($store, $owner, $cash, '2000');
        $this->openCash($foreignStore, $foreignOwner, $foreignCash, '2000');
        app(PostExpense::class)->handle($store, $owner, $category->id, $cash->id, '100', '2026-08-07T10:00:00Z', 'Listrik', 'summary-operational');
        app(PostExpense::class)->handle($store, $owner, $marketing->id, $cash->id, '250', '2026-08-08T10:00:00Z', 'Iklan', 'summary-marketing');
        app(PostExpense::class)->handle($foreignStore, $foreignOwner, $foreignCategory->id, $foreignCash->id, '900', '2026-08-08T10:00:00Z', 'Asing', 'summary-foreign');

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->get(route('expenses.index', [
                'category' => $marketing->public_id,
                'start_date' => '2026-08-08',
                'end_date' => '2026-08-08',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('expenses/index')
                ->where('filters.category', $marketing->public_id)
                ->where('filters.start_date', '2026-08-08')
                ->where('filters.end_date', '2026-08-08')
                ->where('summary.total', '250.0000')
                ->where('summary.count', 1)
                ->where('summary.largest_category.name', 'Marketing')
                ->where('summary.largest_category.total', '250.0000')
                ->where('summary.account_balance', '1650.0000')
                ->has('accounts', 2)
                ->has('expenses.data', 1)
                ->where('expenses.data.0.category_name', 'Marketing'));
    }

    /** @return array{User, Store, Product, FinancialAccount, FinancialAccount, ExpenseCategory} */
    private function fixtures(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $cash = FinancialAccount::factory()->for($store)->create(['name' => 'Kas', 'type' => FinancialAccountType::Cash]);
        $bank = FinancialAccount::factory()->for($store)->create(['name' => 'Bank', 'type' => FinancialAccountType::Bank]);
        $category = ExpenseCategory::create(['store_id' => $store->id, 'name' => 'Operasional', 'is_active' => true]);

        return [$owner, $store, $product, $cash, $bank, $category];
    }

    private function openCash(Store $store, User $owner, FinancialAccount $account, string $amount): void
    {
        app(PostOpeningCash::class)->handle($store, $owner, $account->id, $amount, '2026-08-07T07:00:00Z', null, 'report-opening-'.$store->id);
    }
}
