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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak `POST /stores/{store}/sales/{sale}/reconcile` (design §5.5, Req 9).
 *
 * Termasuk Feature: xsisten, Property 13 — rekonsiliasi konflik tanpa perubahan
 * diam-diam: owner (ability sale.reconcile) menerima snapshot ATAU reversal via
 * Action yang sama; jumlah dibayar tidak pernah berubah; tanpa produk/stok
 * bayangan; timestamp klien + server tersimpan.
 */
class SaleReconciliationTest extends TestCase
{
    use RefreshDatabase;

    private const ITERATIONS = 100;

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

    private function createSale(User $owner, Store $store, Product $product, FinancialAccount $cash): Sale
    {
        Sanctum::actingAs($owner, ['sale.create']);

        // Tunai boleh dibayar >= total; bayar besar agar aman untuk harga acak.
        $paid = '9999999.0000';

        $publicId = $this->postJson("/api/v1/stores/{$store->public_id}/sales", [
            'client_operation_id' => (string) Str::uuid(),
            'occurred_at' => '2026-08-07T09:30:00Z',
            'sales_channel' => 'in_store',
            'payment_method' => 'cash',
            'account_public_id' => $cash->public_id,
            'transaction_discount' => '0',
            'paid_amount' => $paid,
            'items' => [[
                'product_unit_id' => (string) $product->productUnits()->sole()->id,
                'quantity' => '2.000000',
                'item_discount' => '0',
            ]],
        ])->assertStatus(201)->json('data.public_id');

        return Sale::query()->where('store_id', $store->id)->where('public_id', $publicId)->firstOrFail();
    }

    public function test_reconcile_requires_sale_reconcile_ability(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $sale = $this->createSale($owner, $store, $product, $cash);

        // Admin punya sale.create tetapi bukan sale.reconcile.
        Sanctum::actingAs($owner, ['sale.create', 'store.settings']);

        $this->postJson("/api/v1/stores/{$store->public_id}/sales/{$sale->public_id}/reconcile", [
            'action' => 'accept-snapshot',
            'reason' => 'Harga sudah sesuai',
            'client_recorded_at' => '2026-08-07T09:30:00Z',
            'client_operation_id' => (string) Str::uuid(),
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_accept_snapshot_does_not_change_paid_amount_or_create_shadow_records(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $sale = $this->createSale($owner, $store, $product, $cash);
        $paidBefore = (string) $sale->paid_amount;

        $productCountBefore = Product::query()->where('store_id', $store->id)->count();
        $returnsBefore = (int) DB::table('sale_returns')->where('store_id', $store->id)->count();

        Sanctum::actingAs($owner, ['sale.reconcile']);

        $this->postJson("/api/v1/stores/{$store->public_id}/sales/{$sale->public_id}/reconcile", [
            'action' => 'accept-snapshot',
            'reason' => 'Owner menerima harga server',
            'client_recorded_at' => '2026-08-07T09:29:00Z',
            'client_operation_id' => (string) Str::uuid(),
            'local_price_snapshot' => '950.0000',
            'catalog_revision' => 12,
        ])->assertOk()
            ->assertJsonPath('data.resolution', 'accepted')
            ->assertJsonPath('data.paid_amount', $paidBefore);

        // Jumlah dibayar immutable.
        $this->assertSame($paidBefore, (string) $sale->fresh()->paid_amount);
        // Tidak ada produk/stok/return bayangan.
        $this->assertSame($productCountBefore, Product::query()->where('store_id', $store->id)->count());
        $this->assertSame($returnsBefore, (int) DB::table('sale_returns')->where('store_id', $store->id)->count());
        // Audit tercatat dengan snapshot + timestamp klien & server.
        $this->assertDatabaseHas('audit_logs', [
            'store_id' => $store->id,
            'action' => 'sale.reconciled.accepted',
        ]);
    }

    public function test_reversal_uses_post_sale_return_and_keeps_sale_paid_amount(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $sale = $this->createSale($owner, $store, $product, $cash);
        $paidBefore = (string) $sale->paid_amount;

        Sanctum::actingAs($owner, ['sale.reconcile']);

        $this->postJson("/api/v1/stores/{$store->public_id}/sales/{$sale->public_id}/reconcile", [
            'action' => 'reversal',
            'reason' => 'Harga menyimpang, batalkan',
            'client_recorded_at' => '2026-08-07T09:29:00Z',
            'client_operation_id' => (string) Str::uuid(),
            'account_public_id' => $cash->public_id,
            'occurred_at' => '2026-08-08T10:00:00Z',
        ])->assertStatus(201)
            ->assertJsonPath('data.resolution', 'reversed')
            ->assertJsonPath('data.paid_amount', $paidBefore);

        // Sale asli tetap immutable (jumlah dibayar tak berubah).
        $this->assertSame($paidBefore, (string) $sale->fresh()->paid_amount);
        // Reversal terbentuk via PostSaleReturn (Action yang sama).
        $this->assertDatabaseHas('sale_returns', ['store_id' => $store->id, 'sale_id' => $sale->id]);
        $this->assertDatabaseHas('audit_logs', [
            'store_id' => $store->id,
            'action' => 'sale.reconciled.reversed',
        ]);
    }

    public function test_reconcile_tenant_isolation(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $sale = $this->createSale($owner, $store, $product, $cash);

        [$otherOwner, $otherStore] = $this->fixtures();
        Sanctum::actingAs($otherOwner, ['sale.reconcile']);

        // Sale toko lain di bawah store lain → 404.
        $this->postJson("/api/v1/stores/{$otherStore->public_id}/sales/{$sale->public_id}/reconcile", [
            'action' => 'accept-snapshot',
            'reason' => 'x',
            'client_recorded_at' => '2026-08-07T09:29:00Z',
            'client_operation_id' => (string) Str::uuid(),
        ])->assertStatus(404);
    }

    /**
     * Feature: xsisten, Property 13: Rekonsiliasi konflik tanpa perubahan diam-diam.
     *
     * Untuk banyak kombinasi (harga jual, kuantitas, resolusi accept/reversal),
     * jumlah dibayar sale asli tidak pernah berubah dan tidak ada produk/stok
     * bayangan yang dibuat.
     */
    public function test_property_13_reconcile_never_mutates_paid_amount(): void
    {
        mt_srand(20260914);

        for ($i = 0; $i < self::ITERATIONS; $i++) {
            [$owner, $store, $product, $cash] = $this->fixtures((string) mt_rand(500, 5000));
            $sale = $this->createSale($owner, $store, $product, $cash);

            $paidBefore = (string) $sale->paid_amount;
            $productsBefore = Product::query()->where('store_id', $store->id)->count();

            Sanctum::actingAs($owner, ['sale.reconcile']);

            $acceptSnapshot = mt_rand(0, 1) === 1;
            $payload = [
                'reason' => 'iter-'.$i,
                'client_recorded_at' => '2026-08-07T09:29:00Z',
                'client_operation_id' => (string) Str::uuid(),
            ];

            if ($acceptSnapshot) {
                $payload['action'] = 'accept-snapshot';
                $payload['local_price_snapshot'] = (string) mt_rand(400, 6000).'.0000';
            } else {
                $payload['action'] = 'reversal';
                $payload['account_public_id'] = $cash->public_id;
                $payload['occurred_at'] = '2026-08-08T10:00:00Z';
            }

            $this->postJson(
                "/api/v1/stores/{$store->public_id}/sales/{$sale->public_id}/reconcile",
                $payload,
            )->assertStatus($acceptSnapshot ? 200 : 201);

            // Invarian Property 13.
            $this->assertSame($paidBefore, (string) $sale->fresh()->paid_amount, 'Jumlah dibayar berubah diam-diam');
            $this->assertSame(
                $productsBefore,
                Product::query()->where('store_id', $store->id)->count(),
                'Produk bayangan dibuat saat rekonsiliasi',
            );
        }
    }

    private function attach(Store $store, User $user, MembershipRole $role): void
    {
        $store->users()->syncWithoutDetaching([
            $user->id => ['role' => $role->value, 'status' => MembershipStatus::Active->value],
        ]);
    }
}
