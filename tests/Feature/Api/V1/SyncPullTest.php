<?php

namespace Tests\Feature\Api\V1;

use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Kontrak cursor/tombstone `bootstrap` + `sync/pull` (Req 7.1, 25.3).
 *
 * Feature: xsisten — pull delta + next cursor maju + idempotent + isolasi toko.
 */
class SyncPullTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{User, Store, Product}
     */
    private function storeWithProduct(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        $product->productUnits()->sole()->update(['selling_price' => '1000']);

        return [$owner, $store, $product];
    }

    public function test_bootstrap_returns_snapshot_cursor_and_offline_lease(): void
    {
        [$owner, $store, $product] = $this->storeWithProduct();
        Sanctum::actingAs($owner, ['store.read']);

        $response = $this->getJson("/api/v1/stores/{$store->public_id}/bootstrap");

        $response->assertOk()
            ->assertJsonPath('data.store.public_id', $store->public_id)
            ->assertJsonStructure([
                'data' => [
                    'store' => ['public_id', 'name', 'settings' => ['timezone', 'currency_code', 'theme_color']],
                    'currency' => ['code', 'symbol', 'decimal_places', 'symbol_position'],
                    'financial_accounts',
                    'product_units' => [['product_unit_id', 'product_public_id', 'name', 'selling_price', 'is_active']],
                    'cursor',
                    'offline_lease' => ['granted_at', 'expires_at', 'ttl_seconds'],
                ],
            ]);

        // product_unit_id diekspos sebagai string, bukan integer id mentah.
        $this->assertIsString($response->json('data.product_units.0.product_unit_id'));
        $this->assertSame('1000.0000', $response->json('data.product_units.0.selling_price'));
    }

    public function test_pull_returns_changed_unit_then_advances_cursor_to_empty(): void
    {
        [$owner, $store, $product] = $this->storeWithProduct();
        Sanctum::actingAs($owner, ['store.read']);

        // Bootstrap memberi cursor awal.
        $cursor = $this->getJson("/api/v1/stores/{$store->public_id}/bootstrap")
            ->assertOk()
            ->json('data.cursor');

        // Pull dengan cursor awal → belum ada perubahan.
        $this->getJson("/api/v1/stores/{$store->public_id}/sync/pull?cursor={$cursor}")
            ->assertOk()
            ->assertJsonCount(0, 'data.changes.product_units');

        // Buat perubahan: update selling_price unit (updated_at maju).
        Carbon::setTestNow(now()->addMinute());
        $product->productUnits()->sole()->update(['selling_price' => '1500']);
        Carbon::setTestNow();

        // Pull dengan cursor lama → mengembalikan unit itu + next_cursor maju.
        $pull = $this->getJson("/api/v1/stores/{$store->public_id}/sync/pull?cursor={$cursor}")
            ->assertOk()
            ->assertJsonCount(1, 'data.changes.product_units')
            ->assertJsonPath('data.changes.product_units.0.selling_price', '1500.0000');

        $nextCursor = $pull->json('data.next_cursor');
        $this->assertNotSame($cursor, $nextCursor, 'next_cursor harus bergerak maju setelah perubahan.');

        // Pull ulang dengan next_cursor → tidak ada perubahan (idempotent).
        $this->getJson("/api/v1/stores/{$store->public_id}/sync/pull?cursor={$nextCursor}")
            ->assertOk()
            ->assertJsonCount(0, 'data.changes.product_units');
    }

    public function test_reapplying_same_cursor_is_idempotent(): void
    {
        [$owner, $store, $product] = $this->storeWithProduct();
        Sanctum::actingAs($owner, ['store.read']);

        $first = $this->getJson("/api/v1/stores/{$store->public_id}/sync/pull")
            ->assertOk()
            ->json('data');

        $second = $this->getJson("/api/v1/stores/{$store->public_id}/sync/pull")
            ->assertOk()
            ->json('data');

        $this->assertSame($first, $second, 'Pull dengan cursor sama harus mengembalikan data sama (no-op).');
    }

    public function test_pull_is_store_scoped_and_does_not_leak_other_store_data(): void
    {
        $owner = User::factory()->create();
        $storeA = Store::factory()->for($owner, 'owner')->create();
        $storeB = Store::factory()->for($owner, 'owner')->create();

        $productA = Product::factory()->for($storeA)->create(['name' => 'Produk A']);
        $productA->productUnits()->sole()->update(['selling_price' => '1000']);
        $productB = Product::factory()->for($storeB)->create(['name' => 'Produk B']);
        $productB->productUnits()->sole()->update(['selling_price' => '2000']);

        Sanctum::actingAs($owner, ['store.read']);

        $names = collect(
            $this->getJson("/api/v1/stores/{$storeA->public_id}/sync/pull")
                ->assertOk()
                ->json('data.changes.product_units')
        )->pluck('name');

        $this->assertContains('Produk A', $names);
        $this->assertNotContains('Produk B', $names);
    }
}
