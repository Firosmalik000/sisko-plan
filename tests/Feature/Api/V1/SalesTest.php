<?php

namespace Tests\Feature\Api\V1;

use App\Actions\Ledgers\PostStockAdjustment;
use App\Enums\FinancialAccountType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\FinancialAccount;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak `POST /stores/{store}/sales` (online sale) + riwayat/detail (design
 * §3.6, Req 12.6, 12.9, 26, 27): posting via PostSale, payload lengkap
 * (customer/channel/marketplace/payment_proof), cursor pagination, tenant
 * isolation, dan ability gate.
 */
class SalesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{User, Store, Product, FinancialAccount}
     */
    private function fixtures(string $sellingPrice = '1000'): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $product->productUnits()->sole()->update(['selling_price' => $sellingPrice]);
        $cash = FinancialAccount::factory()->for($store)->create([
            'name' => 'Kas',
            'type' => FinancialAccountType::Cash,
            'payment_code' => null,
        ]);

        app(PostStockAdjustment::class)->handle(
            $store,
            $owner,
            'opening',
            [['product_id' => $product->id, 'quantity' => '100', 'unit_cost' => '500']],
            '2026-08-07T08:00:00Z',
            null,
            'stock-'.$store->id,
        );

        return [$owner, $store, $product, $cash];
    }

    private function qrisAccount(Store $store): FinancialAccount
    {
        return FinancialAccount::factory()->for($store)->create([
            'name' => 'QRIS',
            'type' => FinancialAccountType::EWallet,
            'payment_code' => 'qris',
        ]);
    }

    private function marketplaceAccount(Store $store, string $code = 'shopee'): FinancialAccount
    {
        return FinancialAccount::factory()->for($store)->create([
            'name' => 'Saldo '.$code,
            'type' => FinancialAccountType::EWallet,
            'marketplace_code' => $code,
            'payment_code' => null,
        ]);
    }

    private function attach(Store $store, User $user, MembershipRole $role): void
    {
        $store->users()->syncWithoutDetaching([
            $user->id => ['role' => $role->value, 'status' => MembershipStatus::Active->value],
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function salePayload(Product $product, FinancialAccount $account, array $overrides = []): array
    {
        return array_merge([
            'client_operation_id' => (string) Str::uuid(),
            'occurred_at' => '2026-08-07T09:30:00Z',
            'sales_channel' => 'in_store',
            'payment_method' => 'cash',
            'account_public_id' => $account->public_id,
            'transaction_discount' => '0',
            'paid_amount' => '2000',
            'items' => [[
                'product_unit_id' => (string) $product->productUnits()->sole()->id,
                'quantity' => '2.000000',
                'item_discount' => '0',
            ]],
        ], $overrides);
    }

    public function test_online_cash_sale_succeeds_and_is_persisted(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $response = $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $cash),
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.sales_channel', 'in_store')
            ->assertJsonPath('data.totals.total_amount', '2000.0000')
            ->assertJsonPath('data.totals.change_amount', '0.0000')
            ->assertJsonPath('data.payments.0.payment_method', 'cash')
            ->assertJsonCount(1, 'data.items');

        $this->assertIsString($response->json('data.totals.total_amount'));
        $this->assertDatabaseCount('sales', 1);
        $this->assertNotNull($response->json('data.document_number'));
    }

    public function test_online_sale_is_idempotent_for_same_client_operation_id(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $payload = $this->salePayload($product, $cash);

        $first = $this->postJson("/api/v1/stores/{$store->public_id}/sales", $payload)->assertStatus(201);
        $second = $this->postJson("/api/v1/stores/{$store->public_id}/sales", $payload)->assertStatus(201);

        $this->assertSame($first->json('data.public_id'), $second->json('data.public_id'));
        $this->assertDatabaseCount('sales', 1);
    }

    public function test_cash_sale_allows_change_when_paid_more_than_total(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $cash, ['paid_amount' => '5000']),
        )->assertStatus(201)
            ->assertJsonPath('data.totals.change_amount', '3000.0000');
    }

    public function test_sale_persists_customer_when_name_and_phone_provided(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $cash, [
                'customer_name' => 'Ayu',
                'customer_phone' => '081234567890',
                'customer_email' => 'ayu@example.com',
            ]),
        )->assertStatus(201)
            ->assertJsonPath('data.customer.name', 'Ayu');

        $this->assertDatabaseHas('sales', ['store_id' => $store->id, 'customer_name' => 'Ayu']);
    }

    public function test_customer_name_without_phone_is_rejected(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $cash, ['customer_name' => 'Ayu']),
        )->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $this->assertDatabaseCount('sales', 0);
    }

    public function test_non_cash_payment_must_equal_total(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $qris = $this->qrisAccount($store);
        Sanctum::actingAs($owner, ['sale.create']);

        $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $qris, [
                'payment_method' => 'qris',
                'account_public_id' => $qris->public_id,
                'paid_amount' => '5000',
            ]),
        )->assertStatus(422);

        $this->assertDatabaseCount('sales', 0);
    }

    public function test_marketplace_channel_requires_marketplace_code(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $payload = $this->salePayload($product, $this->qrisAccount($store), [
            'sales_channel' => 'marketplace',
            'payment_method' => 'marketplace',
            'account_public_id' => null,
        ]);
        unset($payload['account_public_id']);

        $this->postJson("/api/v1/stores/{$store->public_id}/sales", $payload)
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_marketplace_sale_posts_to_marketplace_account(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $marketplace = $this->marketplaceAccount($store, 'shopee');
        Sanctum::actingAs($owner, ['sale.create']);

        $payload = $this->salePayload($product, $marketplace, [
            'sales_channel' => 'marketplace',
            'payment_method' => 'marketplace',
            'marketplace_code' => 'shopee',
            'external_order_number' => 'SPX-1001',
        ]);
        unset($payload['account_public_id']);

        $this->postJson("/api/v1/stores/{$store->public_id}/sales", $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.sales_channel', 'marketplace')
            ->assertJsonPath('data.marketplace_code', 'shopee')
            ->assertJsonPath('data.external_order_number', 'SPX-1001');

        $this->assertDatabaseHas('sale_payments', [
            'financial_account_id' => $marketplace->id,
            'payment_method' => 'marketplace',
        ]);
    }

    public function test_in_store_channel_rejects_marketplace_code(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $cash, ['marketplace_code' => 'shopee']),
        )->assertStatus(422);
    }

    public function test_payment_proof_allowed_for_non_cash_payment(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $qris = $this->qrisAccount($store);
        Sanctum::actingAs($owner, ['sale.create']);

        $payload = $this->salePayload($product, $qris, [
            'payment_method' => 'qris',
            'account_public_id' => $qris->public_id,
            'paid_amount' => '2000',
        ]);
        $payload['payment_proof'] = UploadedFile::fake()->image('proof.jpg');

        $this->post("/api/v1/stores/{$store->public_id}/sales", $payload, ['Accept' => 'application/json'])
            ->assertStatus(201)
            ->assertJsonPath('data.payments.0.has_payment_proof', true);
    }

    public function test_payment_proof_prohibited_for_cash_payment(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $payload = $this->salePayload($product, $cash);
        $payload['payment_proof'] = UploadedFile::fake()->image('proof.jpg');

        $this->post("/api/v1/stores/{$store->public_id}/sales", $payload, ['Accept' => 'application/json'])
            ->assertStatus(422);

        $this->assertDatabaseCount('sales', 0);
    }

    public function test_index_returns_history_with_cursor_and_tenant_isolation(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create', 'store.read']);

        for ($i = 0; $i < 3; $i++) {
            $this->postJson(
                "/api/v1/stores/{$store->public_id}/sales",
                $this->salePayload($product, $cash),
            )->assertStatus(201);
        }

        // Sale on another store must not leak.
        [$otherOwner, $otherStore, $otherProduct, $otherCash] = $this->fixtures();
        Sanctum::actingAs($otherOwner, ['sale.create']);
        $this->postJson(
            "/api/v1/stores/{$otherStore->public_id}/sales",
            $this->salePayload($otherProduct, $otherCash),
        )->assertStatus(201);

        Sanctum::actingAs($owner, ['store.read']);
        $first = $this->getJson("/api/v1/stores/{$store->public_id}/sales?limit=2");
        $first->assertOk()
            ->assertJsonCount(2, 'data.sales')
            ->assertJsonPath('data.page.has_more', true);

        $cursor = $first->json('data.page.next_cursor');
        $second = $this->getJson("/api/v1/stores/{$store->public_id}/sales?limit=2&cursor={$cursor}");
        $second->assertOk()->assertJsonCount(1, 'data.sales');

        $this->assertSame(3, Sale::query()->where('store_id', $store->id)->count());
    }

    public function test_show_returns_detail_by_public_id_scoped_to_store(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create', 'store.read']);

        $created = $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $cash),
        )->assertStatus(201)->json('data.public_id');

        Sanctum::actingAs($owner, ['store.read']);
        $this->getJson("/api/v1/stores/{$store->public_id}/sales/{$created}")
            ->assertOk()
            ->assertJsonPath('data.public_id', $created)
            ->assertJsonCount(1, 'data.items')
            ->assertJsonCount(1, 'data.payments');

        // Sale from another store → 404 (tenant isolation).
        [$otherOwner, $otherStore] = $this->fixtures();
        Sanctum::actingAs($otherOwner, ['store.read']);
        $this->getJson("/api/v1/stores/{$otherStore->public_id}/sales/{$created}")
            ->assertStatus(404);
    }

    public function test_index_requires_store_read_ability(): void
    {
        [$owner, $store] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $this->getJson("/api/v1/stores/{$store->public_id}/sales")
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_create_requires_sale_create_ability(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['store.read']);

        $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $cash),
        )->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_cashier_can_create_sale_and_read_history(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $cashier = User::factory()->create();
        $this->attach($store, $cashier, MembershipRole::Cashier);
        Sanctum::actingAs($cashier, ['sale.create', 'store.read']);

        $this->postJson(
            "/api/v1/stores/{$store->public_id}/sales",
            $this->salePayload($product, $cash),
        )->assertStatus(201);

        $this->getJson("/api/v1/stores/{$store->public_id}/sales")
            ->assertOk()
            ->assertJsonCount(1, 'data.sales');
    }
}
