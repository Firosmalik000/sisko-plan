<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * CRUD Supplier (Purchasing) & Financial Account (Finance) Api/V1 (Req 12, 13):
 * permission matrix, tenant isolation, soft-deactivate, saldo string decimal.
 */
class PurchasingFinanceMasterDataTest extends TestCase
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

    private function cashierOf(Store $store): User
    {
        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value],
        ]);

        return $cashier;
    }

    // ---- Suppliers ----

    public function test_owner_can_crud_supplier_and_soft_deactivate(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'purchasing.write']);

        $created = $this->postJson("/api/v1/stores/{$store->public_id}/suppliers", [
            'name' => 'PT Sumber Rejeki',
            'phone' => '08123456789',
        ])->assertStatus(201)->assertJsonPath('data.name', 'PT Sumber Rejeki');

        $publicId = $created->json('data.public_id');

        $this->getJson("/api/v1/stores/{$store->public_id}/suppliers?q=Sumber")
            ->assertOk()->assertJsonPath('data.suppliers.0.name', 'PT Sumber Rejeki');

        $this->deleteJson("/api/v1/stores/{$store->public_id}/suppliers/{$publicId}")
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertDatabaseHas('suppliers', ['public_id' => $publicId, 'is_active' => false]);
    }

    public function test_cashier_cannot_mutate_supplier(): void
    {
        $store = Store::factory()->create();
        $cashier = $this->cashierOf($store);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson("/api/v1/stores/{$store->public_id}/suppliers", ['name' => 'X'])
            ->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_supplier_tenant_isolation(): void
    {
        $store = Store::factory()->create();
        $other = Store::factory()->create();
        Supplier::factory()->create(['store_id' => $other->id, 'name' => 'Asing']);

        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'purchasing.write']);

        $names = array_column(
            $this->getJson("/api/v1/stores/{$store->public_id}/suppliers")->json('data.suppliers'),
            'name'
        );
        $this->assertNotContains('Asing', $names);
    }

    // ---- Financial Accounts ----

    public function test_owner_can_crud_financial_account_with_string_balance(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $created = $this->postJson("/api/v1/stores/{$store->public_id}/financial-accounts", [
            'name' => 'Kas Utama',
            'type' => 'cash',
        ])->assertStatus(201);

        $created->assertJsonPath('data.type', 'cash');
        // Saldo default string decimal scale 4 (Req 13.4, no float).
        $this->assertIsString($created->json('data.balance'));
        $this->assertSame('0.0000', $created->json('data.balance'));

        $publicId = $created->json('data.public_id');

        $this->getJson("/api/v1/stores/{$store->public_id}/financial-accounts")
            ->assertOk()
            ->assertJsonPath('data.accounts.0.balance', '0.0000');

        $this->deleteJson("/api/v1/stores/{$store->public_id}/financial-accounts/{$publicId}")
            ->assertOk()->assertJsonPath('data.is_active', false);
    }

    public function test_cashier_cannot_mutate_financial_account(): void
    {
        $store = Store::factory()->create();
        $cashier = $this->cashierOf($store);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson("/api/v1/stores/{$store->public_id}/financial-accounts", [
            'name' => 'X', 'type' => 'cash',
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_financial_account_rejects_invalid_type(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read', 'finance.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/financial-accounts", [
            'name' => 'Aneh', 'type' => 'crypto',
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }
}
