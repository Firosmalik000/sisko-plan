<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\ExpenseCategory;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Expense categories + expenses Api/V1 (Req 19): CRUD kategori soft-deactivate,
 * pencatatan pengeluaran (reuse PostExpense) kurangi saldo akun, permission matrix,
 * tenant isolation, saldo tidak cukup ditolak. Nominal string decimal scale 4.
 */
class ExpensesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.debug' => false]);
    }

    private function ownerOf(Store $store): User
    {
        return User::find($store->owner_user_id);
    }

    private function account(Store $store, string $name = 'Kas'): FinancialAccount
    {
        return FinancialAccount::create([
            'store_id' => $store->id,
            'name' => $name,
            'type' => 'cash',
            'is_active' => true,
        ]);
    }

    private function openAccount(Store $store, FinancialAccount $account, string $amount): void
    {
        $this->postJson("/api/v1/stores/{$store->public_id}/cash/opening", [
            'idempotency_key' => 'seed-'.$account->id,
            'account_public_id' => $account->public_id,
            'amount' => $amount,
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(201);
    }

    public function test_owner_can_crud_expense_category_and_soft_deactivate(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $created = $this->postJson("/api/v1/stores/{$store->public_id}/expense-categories", [
            'name' => 'Operasional',
        ])->assertStatus(201)->assertJsonPath('data.name', 'Operasional');

        $publicId = $created->json('data.public_id');

        $this->getJson("/api/v1/stores/{$store->public_id}/expense-categories?q=Oper")
            ->assertOk()->assertJsonPath('data.expense_categories.0.name', 'Operasional');

        $this->deleteJson("/api/v1/stores/{$store->public_id}/expense-categories/{$publicId}")
            ->assertOk()->assertJsonPath('data.is_active', false);
    }

    public function test_owner_records_expense_and_balance_decreases(): void
    {
        $store = Store::factory()->create();
        $account = $this->account($store);
        $owner = $this->ownerOf($store);
        Sanctum::actingAs($owner, ['store.read', 'finance.write']);

        $this->openAccount($store, $account, '100000.0000');
        $category = ExpenseCategory::create(['store_id' => $store->id, 'name' => 'Listrik', 'is_active' => true]);

        $this->postJson("/api/v1/stores/{$store->public_id}/expenses", [
            'idempotency_key' => 'exp-1',
            'category_public_id' => $category->public_id,
            'account_public_id' => $account->public_id,
            'amount' => '25000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(201)
            ->assertJsonPath('data.category_name', 'Listrik')
            ->assertJsonPath('data.amount', '25000.0000');

        $balance = $this->getJson("/api/v1/stores/{$store->public_id}/financial-accounts")->json('data.accounts.0.balance');
        $this->assertSame('75000.0000', $balance);

        $this->getJson("/api/v1/stores/{$store->public_id}/expenses")
            ->assertOk()->assertJsonPath('data.expenses.0.amount', '25000.0000');
    }

    public function test_expense_rejected_when_balance_insufficient(): void
    {
        $store = Store::factory()->create();
        $account = $this->account($store);
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $category = ExpenseCategory::create(['store_id' => $store->id, 'name' => 'Besar', 'is_active' => true]);

        $this->postJson("/api/v1/stores/{$store->public_id}/expenses", [
            'idempotency_key' => 'exp-nsf',
            'category_public_id' => $category->public_id,
            'account_public_id' => $account->public_id,
            'amount' => '5000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_cashier_cannot_mutate_expense_category_or_record_expense(): void
    {
        $store = Store::factory()->create();
        $account = $this->account($store);
        $category = ExpenseCategory::create(['store_id' => $store->id, 'name' => 'X', 'is_active' => true]);
        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value],
        ]);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson("/api/v1/stores/{$store->public_id}/expense-categories", ['name' => 'Y'])
            ->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');

        $this->postJson("/api/v1/stores/{$store->public_id}/expenses", [
            'idempotency_key' => 'exp-forbidden',
            'category_public_id' => $category->public_id,
            'account_public_id' => $account->public_id,
            'amount' => '1000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_expense_category_tenant_isolation(): void
    {
        $store = Store::factory()->create();
        $other = Store::factory()->create();
        ExpenseCategory::create(['store_id' => $other->id, 'name' => 'Asing', 'is_active' => true]);

        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $names = array_column(
            $this->getJson("/api/v1/stores/{$store->public_id}/expense-categories")->json('data.expense_categories'),
            'name'
        );
        $this->assertNotContains('Asing', $names);
    }
}
