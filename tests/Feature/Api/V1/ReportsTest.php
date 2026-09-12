<?php

namespace Tests\Feature\Api\V1;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Sale;
use App\Models\Store;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Laporan Api/V1 (Req 20): agregasi penjualan/laba/stok/kas (reuse BusinessMetrics),
 * partisi per kasir menjumlah = total agregat, permission (store.read), nominal
 * string decimal scale 4.
 */
class ReportsTest extends TestCase
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

    private function seedSale(Store $store, User $cashier, string $total, string $occurredAt): void
    {
        Sale::create([
            'store_id' => $store->id,
            'document_number' => 'INV-'.uniqid(),
            'subtotal' => $total,
            'total_amount' => $total,
            'paid_amount' => $total,
            'idempotency_key' => uniqid('sale-', true),
            'request_hash' => str_repeat('a', 64),
            'occurred_at' => $occurredAt,
            'created_by_user_id' => $cashier->id,
            'posted_at' => now(),
        ]);
    }

    public function test_sales_report_partition_by_cashier_sums_to_aggregate(): void
    {
        $store = Store::factory()->create();
        $owner = $this->ownerOf($store);
        $cashier = User::factory()->create(['name' => 'Kasir A']);
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => MembershipRole::Cashier->value, 'status' => MembershipStatus::Active->value],
        ]);

        $today = now()->format('Y-m-d');
        $this->seedSale($store, $owner, '100000.0000', now()->setTime(9, 0));
        $this->seedSale($store, $owner, '50000.0000', now()->setTime(10, 0));
        $this->seedSale($store, $cashier, '75000.0000', now()->setTime(11, 0));

        Sanctum::actingAs($owner, ['store.read']);

        $response = $this->getJson("/api/v1/stores/{$store->public_id}/reports/sales?start_date={$today}&end_date={$today}")
            ->assertOk();

        $aggregate = $response->json('data.net_revenue');
        $this->assertIsString($aggregate);
        $this->assertSame('225000.0000', $aggregate);
        $this->assertSame(3, $response->json('data.transaction_count'));

        // Invarian: jumlah partisi per kasir == total agregat.
        $partitionSum = array_reduce(
            $response->json('data.by_cashier'),
            fn (string $carry, array $row): string => Decimal::add($carry, $row['net_revenue'], Decimal::MONEY_SCALE),
            '0.0000',
        );
        $this->assertSame($aggregate, $partitionSum);
        $this->assertCount(2, $response->json('data.by_cashier'));
    }

    public function test_profit_report_returns_performance_decimals(): void
    {
        $store = Store::factory()->create();
        $owner = $this->ownerOf($store);
        $today = now()->format('Y-m-d');
        $this->seedSale($store, $owner, '100000.0000', now()->setTime(9, 0));

        Sanctum::actingAs($owner, ['store.read']);

        $this->getJson("/api/v1/stores/{$store->public_id}/reports/profit?start_date={$today}&end_date={$today}")
            ->assertOk()
            ->assertJsonPath('data.performance.net_revenue', '100000.0000')
            ->assertJsonStructure(['data' => ['performance' => ['net_revenue', 'net_cogs', 'gross_profit', 'expenses', 'estimated_profit'], 'categories', 'products']]);
    }

    public function test_stock_and_cash_reports_return_string_decimals(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read']);

        $stock = $this->getJson("/api/v1/stores/{$store->public_id}/reports/stock")->assertOk();
        $this->assertIsString($stock->json('data.inventory_value'));

        $cash = $this->getJson("/api/v1/stores/{$store->public_id}/reports/cash")->assertOk();
        $this->assertIsString($cash->json('data.cash_balance'));
        $this->assertIsArray($cash->json('data.accounts'));
    }

    public function test_report_requires_valid_range(): void
    {
        $store = Store::factory()->create();
        Sanctum::actingAs($this->ownerOf($store), ['store.read']);

        $this->getJson("/api/v1/stores/{$store->public_id}/reports/sales?start_date=2026-05-10&end_date=2026-05-01")
            ->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_report_forbidden_without_store_read(): void
    {
        $store = Store::factory()->create();
        $today = now()->format('Y-m-d');
        Sanctum::actingAs($this->ownerOf($store), ['sale.create']);

        $this->getJson("/api/v1/stores/{$store->public_id}/reports/sales?start_date={$today}&end_date={$today}")
            ->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }
}
