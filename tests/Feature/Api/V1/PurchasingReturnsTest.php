<?php

namespace Tests\Feature\Api\V1;

use App\Actions\Ledgers\PostOpeningCash;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Fase 3 backend: kulakan (PostPurchase), pembayaran hutang (PostPurchasePayment),
 * retur penjualan (PostSaleReturn). Verifikasi reuse Action + nominal decimal
 * string + permission (purchasing.write / sale.reconcile).
 */
class PurchasingReturnsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{User, Store, Product, FinancialAccount}
     */
    private function fixtures(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $product->productUnits()->sole()->update(['selling_price' => '1000']);
        $cash = FinancialAccount::factory()->for($store)->create([
            'name' => 'Kas', 'type' => FinancialAccountType::Cash, 'payment_code' => null,
        ]);

        app(PostStockAdjustment::class)->handle(
            $store, $owner, 'opening',
            [['product_id' => $product->id, 'quantity' => '100', 'unit_cost' => '500']],
            '2026-08-07T08:00:00Z', null, 'stock-'.$store->id,
        );

        // Danai kas agar pembayaran kulakan tidak ditolak karena saldo kosong.
        app(PostOpeningCash::class)->handle(
            $store, $owner, $cash->id, '1000000', '2026-08-07T08:00:00Z', null, 'open-'.$store->id,
        );

        return [$owner, $store, $product, $cash];
    }

    public function test_owner_creates_purchase_with_partial_payment_and_debt(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $supplier = Supplier::factory()->create(['store_id' => $store->id]);
        Sanctum::actingAs($owner, ['store.read', 'purchasing.write']);

        $response = $this->postJson("/api/v1/stores/{$store->public_id}/purchases", [
            'client_operation_id' => (string) Str::uuid(),
            'supplier_public_id' => $supplier->public_id,
            'account_public_id' => $cash->public_id,
            'occurred_at' => '2026-08-08T09:00:00Z',
            'discount' => '0',
            'additional_cost' => '0',
            'paid_amount' => '30000',
            'items' => [[
                'product_unit_id' => (string) $product->productUnits()->sole()->id,
                'quantity' => '10.000000',
                'unit_price' => '5000',
            ]],
        ])->assertStatus(201);

        // Total 10 * 5000 = 50000; paid 30000; debt 20000 (string decimal scale 4).
        $response->assertJsonPath('data.total_amount', '50000.0000')
            ->assertJsonPath('data.paid_amount', '30000.0000')
            ->assertJsonPath('data.debt_amount', '20000.0000')
            ->assertJsonPath('data.payment_status', 'partial');
        $this->assertIsString($response->json('data.total_amount'));

        // Pembayaran hutang mengurangi sisa.
        $purchasePublicId = $response->json('data.public_id');
        $pay = $this->postJson("/api/v1/stores/{$store->public_id}/suppliers/{$supplier->public_id}/payments", [
            'client_operation_id' => (string) Str::uuid(),
            'purchase_public_id' => $purchasePublicId,
            'account_public_id' => $cash->public_id,
            'amount' => '20000',
            'occurred_at' => '2026-08-09T09:00:00Z',
        ])->assertStatus(201);
        $this->assertSame('20000.0000', $pay->json('data.amount'));

        // Detail sekarang lunas.
        $this->getJson("/api/v1/stores/{$store->public_id}/purchases/{$purchasePublicId}")
            ->assertOk()
            ->assertJsonPath('data.debt_amount', '0.0000')
            ->assertJsonPath('data.payment_status', 'paid');
    }

    public function test_payment_exceeding_debt_is_rejected(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $supplier = Supplier::factory()->create(['store_id' => $store->id]);
        Sanctum::actingAs($owner, ['store.read', 'purchasing.write']);

        $purchasePublicId = $this->postJson("/api/v1/stores/{$store->public_id}/purchases", [
            'client_operation_id' => (string) Str::uuid(),
            'supplier_public_id' => $supplier->public_id,
            'account_public_id' => $cash->public_id,
            'occurred_at' => '2026-08-08T09:00:00Z',
            'discount' => '0', 'additional_cost' => '0', 'paid_amount' => '0',
            'items' => [[
                'product_unit_id' => (string) $product->productUnits()->sole()->id,
                'quantity' => '1.000000', 'unit_price' => '5000',
            ]],
        ])->assertStatus(201)->json('data.public_id');

        $this->postJson("/api/v1/stores/{$store->public_id}/suppliers/{$supplier->public_id}/payments", [
            'client_operation_id' => (string) Str::uuid(),
            'purchase_public_id' => $purchasePublicId,
            'account_public_id' => $cash->public_id,
            'amount' => '999999',
            'occurred_at' => '2026-08-09T09:00:00Z',
        ])->assertStatus(422);
    }

    public function test_cashier_cannot_create_purchase(): void
    {
        [, $store, $product, $cash] = $this->fixtures();
        $supplier = Supplier::factory()->create(['store_id' => $store->id]);
        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => 'cashier', 'status' => 'active'],
        ]);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson("/api/v1/stores/{$store->public_id}/purchases", [
            'client_operation_id' => (string) Str::uuid(),
            'supplier_public_id' => $supplier->public_id,
            'occurred_at' => '2026-08-08T09:00:00Z',
            'discount' => '0', 'additional_cost' => '0', 'paid_amount' => '0',
            'items' => [[
                'product_unit_id' => (string) $product->productUnits()->sole()->id,
                'quantity' => '1.000000', 'unit_price' => '5000',
            ]],
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_owner_can_return_sold_items(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create', 'sale.reconcile', 'store.read']);

        // Buat sale dulu.
        $sale = $this->postJson("/api/v1/stores/{$store->public_id}/sales", [
            'client_operation_id' => (string) Str::uuid(),
            'occurred_at' => '2026-08-08T09:30:00Z',
            'sales_channel' => 'in_store',
            'payment_method' => 'cash',
            'account_public_id' => $cash->public_id,
            'transaction_discount' => '0',
            'paid_amount' => '2000',
            'items' => [[
                'product_unit_id' => (string) $product->productUnits()->sole()->id,
                'quantity' => '2.000000',
                'item_discount' => '0',
            ]],
        ])->assertStatus(201);

        $salePublicId = $sale->json('data.public_id');
        $saleItemPublicId = $sale->json('data.items.0.public_id');
        $this->assertIsString($saleItemPublicId);

        $response = $this->postJson("/api/v1/stores/{$store->public_id}/sales/{$salePublicId}/returns", [
            'client_operation_id' => (string) Str::uuid(),
            'account_public_id' => $cash->public_id,
            'occurred_at' => '2026-08-08T10:00:00Z',
            'notes' => 'Barang rusak',
            'items' => [[
                'sale_item_public_id' => $saleItemPublicId,
                'quantity' => '1.000000',
            ]],
        ])->assertStatus(201);

        // Refund 1 dari 2 unit @1000 = 1000 (string decimal).
        $response->assertJsonPath('data.refund_amount', '1000.0000');
        $this->assertIsString($response->json('data.refund_amount'));
    }

    public function test_cashier_cannot_return_sale(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        // Buat sale sebagai owner.
        Sanctum::actingAs($owner, ['sale.create']);
        $sale = $this->postJson("/api/v1/stores/{$store->public_id}/sales", [
            'client_operation_id' => (string) Str::uuid(),
            'occurred_at' => '2026-08-08T09:30:00Z',
            'sales_channel' => 'in_store', 'payment_method' => 'cash',
            'account_public_id' => $cash->public_id,
            'transaction_discount' => '0', 'paid_amount' => '2000',
            'items' => [[
                'product_unit_id' => (string) $product->productUnits()->sole()->id,
                'quantity' => '2.000000', 'item_discount' => '0',
            ]],
        ])->assertStatus(201);
        $salePublicId = $sale->json('data.public_id');
        $saleItemPublicId = $sale->json('data.items.0.public_id');

        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => 'cashier', 'status' => 'active'],
        ]);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson("/api/v1/stores/{$store->public_id}/sales/{$salePublicId}/returns", [
            'client_operation_id' => (string) Str::uuid(),
            'account_public_id' => $cash->public_id,
            'occurred_at' => '2026-08-08T10:00:00Z',
            'items' => [['sale_item_public_id' => $saleItemPublicId, 'quantity' => '1.000000']],
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }
}
