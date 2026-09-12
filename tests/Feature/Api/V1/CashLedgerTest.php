<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kas Api/V1 (Req 18.1–18.3): kas awal, transfer antar akun, transaksi modal.
 * Reuse ledger action; verifikasi saldo (string decimal scale 4), saldo tidak
 * cukup ditolak, permission matrix (cashier FORBIDDEN), tenant isolation.
 */
class CashLedgerTest extends TestCase
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

    public function test_owner_posts_opening_cash_and_balance_reflects(): void
    {
        $store = Store::factory()->create();
        $account = $this->account($store, 'Kas Utama');
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/cash/opening", [
            'idempotency_key' => 'open-1',
            'account_public_id' => $account->public_id,
            'amount' => '100000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(201)
            ->assertJsonPath('data.reason', 'opening_balance')
            ->assertJsonPath('data.balance_after', '100000.0000');

        // Saldo terlihat di endpoint akun (string decimal scale 4).
        $balance = $this->getJson("/api/v1/stores/{$store->public_id}/financial-accounts")
            ->json('data.accounts.0.balance');
        $this->assertIsString($balance);
        $this->assertSame('100000.0000', $balance);
    }

    public function test_opening_cash_is_idempotent(): void
    {
        $store = Store::factory()->create();
        $account = $this->account($store);
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $payload = [
            'idempotency_key' => 'open-dup',
            'account_public_id' => $account->public_id,
            'amount' => '50000.0000',
            'occurred_at' => now()->toIso8601String(),
        ];

        $first = $this->postJson("/api/v1/stores/{$store->public_id}/cash/opening", $payload)->assertStatus(201);
        $second = $this->postJson("/api/v1/stores/{$store->public_id}/cash/opening", $payload)->assertStatus(201);

        $this->assertSame($first->json('data.public_id'), $second->json('data.public_id'));
        $this->assertSame('50000.0000', $this->getJson("/api/v1/stores/{$store->public_id}/financial-accounts")->json('data.accounts.0.balance'));
    }

    public function test_transfer_moves_balance_between_accounts(): void
    {
        $store = Store::factory()->create();
        $from = $this->account($store, 'Kas');
        $to = $this->account($store, 'Bank');
        $owner = $this->ownerOf($store);
        Sanctum::actingAs($owner, ['store.read', 'finance.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/cash/opening", [
            'idempotency_key' => 'open-from',
            'account_public_id' => $from->public_id,
            'amount' => '80000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(201);

        $this->postJson("/api/v1/stores/{$store->public_id}/cash/transfers", [
            'idempotency_key' => 'trf-1',
            'from_account_public_id' => $from->public_id,
            'to_account_public_id' => $to->public_id,
            'amount' => '30000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(201)->assertJsonPath('data.amount', '30000.0000');

        $accounts = collect($this->getJson("/api/v1/stores/{$store->public_id}/financial-accounts")->json('data.accounts'))
            ->keyBy('public_id');
        $this->assertSame('50000.0000', $accounts[$from->public_id]['balance']);
        $this->assertSame('30000.0000', $accounts[$to->public_id]['balance']);
    }

    public function test_transfer_rejected_when_balance_insufficient(): void
    {
        $store = Store::factory()->create();
        $from = $this->account($store, 'Kas');
        $to = $this->account($store, 'Bank');
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/cash/transfers", [
            'idempotency_key' => 'trf-nsf',
            'from_account_public_id' => $from->public_id,
            'to_account_public_id' => $to->public_id,
            'amount' => '999999.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_transfer_same_account_rejected(): void
    {
        $store = Store::factory()->create();
        $account = $this->account($store);
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/cash/transfers", [
            'idempotency_key' => 'trf-same',
            'from_account_public_id' => $account->public_id,
            'to_account_public_id' => $account->public_id,
            'amount' => '1000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_capital_cash_contribution_increases_balance(): void
    {
        $store = Store::factory()->create();
        $account = $this->account($store);
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/capital", [
            'idempotency_key' => 'cap-1',
            'type' => 'cash_contribution',
            'account_public_id' => $account->public_id,
            'amount' => '250000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(201)
            ->assertJsonPath('data.type', 'cash_contribution')
            ->assertJsonPath('data.total_value', '250000.0000');

        $this->assertSame('250000.0000', $this->getJson("/api/v1/stores/{$store->public_id}/financial-accounts")->json('data.accounts.0.balance'));
    }

    public function test_cashier_cannot_post_cash_operations(): void
    {
        $store = Store::factory()->create();
        $account = $this->account($store);
        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value],
        ]);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson("/api/v1/stores/{$store->public_id}/cash/opening", [
            'idempotency_key' => 'open-forbidden',
            'account_public_id' => $account->public_id,
            'amount' => '1000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_transfer_rejects_foreign_account(): void
    {
        $store = Store::factory()->create();
        $other = Store::factory()->create();
        $mine = $this->account($store);
        $foreign = $this->account($other, 'Asing');
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/cash/transfers", [
            'idempotency_key' => 'trf-foreign',
            'from_account_public_id' => $mine->public_id,
            'to_account_public_id' => $foreign->public_id,
            'amount' => '1000.0000',
            'occurred_at' => now()->toIso8601String(),
        ])->assertStatus(404)->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
