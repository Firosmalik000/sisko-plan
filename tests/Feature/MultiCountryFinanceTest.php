<?php

namespace Tests\Feature;

use App\Actions\Expenses\PostExpense;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Enums\FinancialAccountType;
use App\Models\ExpenseCategory;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountBalance;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MultiCountryFinanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_financial_documents_snapshot_server_store_currency(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->ownedBy($owner)->create();
        $category = ExpenseCategory::create(['store_id' => $store->id, 'name' => 'Operasional', 'is_active' => true]);
        $account = FinancialAccount::factory()->for($store)->create(['type' => FinancialAccountType::Cash]);
        FinancialAccountBalance::create(['store_id' => $store->id, 'financial_account_id' => $account->id, 'balance' => '2000']);
        app(PostExpense::class)->handle($store, $owner, $category->id, $account->id, '1000', now()->toISOString(), null, 'currency-expense');

        $this->assertDatabaseHas('expenses', ['store_id' => $store->id, 'currency_code' => 'IDR']);
        $store->settings()->update(['currency' => 'MYR']);
        $this->assertDatabaseHas('expenses', ['store_id' => $store->id, 'currency_code' => 'IDR']);
    }

    public function test_country_is_locked_after_operational_history_but_timezone_remains_editable(): void
    {
        $owner = User::factory()->create();
        $store = Store::factory()->ownedBy($owner)->create();
        $product = Product::factory()->for($store)->create();
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [[
            'product_id' => $product->id, 'quantity' => '1', 'unit_cost' => '1000',
        ]], now()->toISOString(), null, 'country-lock-stock');

        $session = ['active_business_id' => $store->business_id, 'active_store_id' => $store->id];
        $this->actingAs($owner)->withSession($session)->patch(route('stores.update', $store), [
            'name' => $store->name,
            'country' => 'MY',
            'timezone' => 'Asia/Kuala_Lumpur',
        ])->assertSessionHasErrors('country');
        $this->assertSame('ID', $store->fresh()?->country?->code);

        $this->actingAs($owner)->withSession($session)->patch(route('stores.update', $store), [
            'name' => $store->name,
            'timezone' => 'Asia/Makassar',
        ])->assertSessionHasNoErrors();
        $this->assertSame('Asia/Makassar', $store->settings()->value('timezone'));
    }
}
