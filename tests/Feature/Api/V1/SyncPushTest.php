<?php

namespace Tests\Feature\Api\V1;

use App\Actions\Ledgers\PostStockAdjustment;
use App\Enums\FinancialAccountType;
use App\Models\FinancialAccount;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak `sync/push` (Req 7.3–7.7): idempotency, konflik, registry tertutup.
 *
 * Feature: xsisten
 * - Property 8: Push idempotent (doing twice = once).
 * - Property 9: Konflik idempotency terdeteksi — tanpa mutasi state.
 * - Property 10: Registry operation tertutup — unsupported tanpa side effect.
 */
class SyncPushTest extends TestCase
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
        ]);

        app(PostStockAdjustment::class)->handle(
            $store,
            $owner,
            'opening',
            [['product_id' => $product->id, 'quantity' => '100', 'unit_cost' => '500']],
            '2026-08-07T08:00:00Z',
            null,
            'push-stock-'.$store->id,
        );

        return [$owner, $store, $product, $cash];
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function saleCommand(Store $store, Product $product, FinancialAccount $account, string $clientOperationId, array $overrides = []): array
    {
        $payload = array_merge([
            'account_public_id' => $account->public_id,
            'occurred_at' => '2026-08-07T09:30:00Z',
            'transaction_discount' => '0',
            'paid_amount' => '2000',
            'notes' => null,
            'catalog_revision' => 1,
            'items' => [[
                'product_unit_id' => (string) $product->productUnits()->sole()->id,
                'quantity' => '2.000000',
                'item_discount' => '0',
                'local_price_snapshot' => '1000.0000',
            ]],
        ], $overrides);

        return [
            'client_operation_id' => $clientOperationId,
            'operation_type' => 'sale.create',
            'payload_hash' => 'sha256:'.hash('sha256', json_encode($payload)),
            'payload' => $payload,
        ];
    }

    public function test_sale_create_command_posts_sale_and_returns_summary(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $response = $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
            'batch_id' => 'batch-1',
            'commands' => [$this->saleCommand($store, $product, $cash, 'op-1')],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.results.0.client_operation_id', 'op-1')
            ->assertJsonPath('data.results.0.status', 'synced')
            ->assertJsonPath('data.results.0.sale.total', '2000.0000');

        $this->assertDatabaseCount('sales', 1);
    }

    /**
     * Property 8: kirim sale.create dua kali (client_operation_id + payload sama)
     * → hasil identik, TEPAT 1 sale dibuat. Diulang deterministik banyak iterasi.
     */
    public function test_property_8_push_is_idempotent_doing_twice_equals_once(): void
    {
        for ($iteration = 0; $iteration < 60; $iteration++) {
            [$owner, $store, $product, $cash] = $this->fixtures((string) (1000 + $iteration));
            Sanctum::actingAs($owner, ['sale.create']);

            $command = $this->saleCommand($store, $product, $cash, "op-{$iteration}", [
                'paid_amount' => (string) (2 * (1000 + $iteration)),
            ]);

            $first = $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
                'batch_id' => "batch-{$iteration}",
                'commands' => [$command],
            ])->assertOk()->json('data.results.0');

            $second = $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
                'batch_id' => "batch-{$iteration}-retry",
                'commands' => [$command],
            ])->assertOk()->json('data.results.0');

            $this->assertSame('synced', $first['status'], 'DBG '.json_encode($first));
            $this->assertSame($first, $second, "Iterasi {$iteration}: hasil retry harus identik.");
            $this->assertSame(
                1,
                Sale::query()->where('store_id', $store->id)->count(),
                "Iterasi {$iteration}: hanya satu sale boleh dibuat.",
            );
        }
    }

    /**
     * Property 9: dua command dengan client_operation_id sama tapi payload beda
     * → command kedua IDEMPOTENCY_CONFLICT, tidak menambah sale.
     */
    public function test_property_9_conflicting_payload_same_operation_id_is_rejected(): void
    {
        for ($iteration = 0; $iteration < 55; $iteration++) {
            [$owner, $store, $product, $cash] = $this->fixtures((string) (1000 + $iteration));
            Sanctum::actingAs($owner, ['sale.create']);

            $operationId = "conflict-{$iteration}";
            $paid = 2 * (1000 + $iteration);

            $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
                'batch_id' => "b-{$iteration}",
                'commands' => [$this->saleCommand($store, $product, $cash, $operationId, [
                    'paid_amount' => (string) $paid,
                ])],
            ])->assertOk()->assertJsonPath('data.results.0.status', 'synced');

            // Payload berbeda (quantity berubah) dengan operation id yang sama.
            $conflict = $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
                'batch_id' => "b-{$iteration}-2",
                'commands' => [$this->saleCommand($store, $product, $cash, $operationId, [
                    'paid_amount' => (string) $paid,
                    'items' => [[
                        'product_unit_id' => (string) $product->productUnits()->sole()->id,
                        'quantity' => '3.000000',
                        'item_discount' => '0',
                        'local_price_snapshot' => '1000.0000',
                    ]],
                ])],
            ])->assertOk();

            $conflict->assertJsonPath('data.results.0.status', 'error')
                ->assertJsonPath('data.results.0.error.code', 'IDEMPOTENCY_CONFLICT')
                ->assertJsonPath('data.results.0.error.retryable', false);

            $this->assertSame(
                1,
                Sale::query()->where('store_id', $store->id)->count(),
                "Iterasi {$iteration}: konflik tidak boleh menambah sale.",
            );
        }
    }

    /**
     * Property 10: operation_type acak yang tak terdaftar → UNSUPPORTED_OPERATION
     * tanpa side effect (tidak ada sale dibuat).
     */
    public function test_property_10_unsupported_operation_types_have_no_side_effect(): void
    {
        $samples = [
            'sale.delete', 'product.create', 'inventory.adjust', 'foo.bar',
            'sale.reverse', 'random.op', 'sale', 'SALE.CREATE', 'sale.create.v2', 'noop',
        ];

        foreach ($samples as $index => $operationType) {
            [$owner, $store, $product, $cash] = $this->fixtures();
            Sanctum::actingAs($owner, ['sale.create']);

            $response = $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
                'batch_id' => "unsupported-{$index}",
                'commands' => [[
                    'client_operation_id' => "u-{$index}",
                    'operation_type' => $operationType,
                    'payload_hash' => 'sha256:x',
                    'payload' => [
                        'account_public_id' => $cash->public_id,
                        'items' => [['product_unit_id' => (string) $product->productUnits()->sole()->id, 'quantity' => '1']],
                    ],
                ]],
            ]);

            $response->assertOk()
                ->assertJsonPath('data.results.0.status', 'error')
                ->assertJsonPath('data.results.0.error.code', 'UNSUPPORTED_OPERATION')
                ->assertJsonPath('data.results.0.error.retryable', false);

            $this->assertSame(
                0,
                Sale::query()->where('store_id', $store->id)->count(),
                "Operasi '{$operationType}' tidak boleh menghasilkan side effect.",
            );
        }
    }

    /**
     * Payload lengkap (customer + channel + payment_method) diteruskan handler
     * ke PostSale dan tersimpan benar (design §3.5/§3.6, Req 12.6, 26, 27).
     */
    public function test_sale_create_command_forwards_customer_and_channel_payload(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        Sanctum::actingAs($owner, ['sale.create']);

        $command = $this->saleCommand($store, $product, $cash, 'op-full', [
            'payment_method' => 'cash',
            'sales_channel' => 'in_store',
            'customer_name' => 'Budi',
            'customer_phone' => '081298765432',
            'customer_email' => 'budi@example.com',
        ]);

        $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
            'batch_id' => 'batch-full',
            'commands' => [$command],
        ])->assertOk()->assertJsonPath('data.results.0.status', 'synced');

        $this->assertDatabaseHas('sales', [
            'store_id' => $store->id,
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'sales_channel' => 'in_store',
        ]);
        $this->assertDatabaseHas('sale_payments', [
            'financial_account_id' => $cash->id,
            'payment_method' => 'cash',
        ]);
    }

    /**
     * Channel marketplace: handler meresolve akun dari `marketplace_code`
     * (bukan `account_public_id`) lalu meneruskan ke PostSale (Req 27).
     */
    public function test_sale_create_command_supports_marketplace_channel(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        $marketplace = FinancialAccount::factory()->for($store)->create([
            'name' => 'Saldo Shopee',
            'type' => FinancialAccountType::EWallet,
            'marketplace_code' => 'shopee',
            'payment_code' => null,
        ]);
        Sanctum::actingAs($owner, ['sale.create']);

        $command = $this->saleCommand($store, $product, $marketplace, 'op-mp', [
            'payment_method' => 'marketplace',
            'sales_channel' => 'marketplace',
            'marketplace_code' => 'shopee',
            'external_order_number' => 'SPX-9001',
            'paid_amount' => '2000',
        ]);
        unset($command['payload']['account_public_id']);
        $command['payload_hash'] = 'sha256:'.hash('sha256', json_encode($command['payload']));

        $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
            'batch_id' => 'batch-mp',
            'commands' => [$command],
        ])->assertOk()->assertJsonPath('data.results.0.status', 'synced');

        $this->assertDatabaseHas('sales', [
            'store_id' => $store->id,
            'sales_channel' => 'marketplace',
            'marketplace_code' => 'shopee',
            'external_order_number' => 'SPX-9001',
        ]);
        $this->assertDatabaseHas('sale_payments', [
            'financial_account_id' => $marketplace->id,
            'payment_method' => 'marketplace',
        ]);
    }

    public function test_precondition_failure_maps_to_per_command_error_without_side_effect(): void
    {
        [$owner, $store, $product, $cash] = $this->fixtures();
        $cash->update(['is_active' => false]);
        Sanctum::actingAs($owner, ['sale.create']);

        $response = $this->postJson("/api/v1/stores/{$store->public_id}/sync/push", [
            'batch_id' => 'precondition-1',
            'commands' => [$this->saleCommand($store, $product, $cash, 'op-precondition')],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.results.0.status', 'error');

        $this->assertDatabaseCount('sales', 0);
    }
}
