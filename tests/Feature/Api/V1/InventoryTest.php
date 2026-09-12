<?php

namespace Tests\Feature\Api\V1;

use App\Actions\Ledgers\PostStockAdjustment;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Fase 3 Inventory: posisi stok + minimum + penanda below_minimum, penyesuaian
 * (reuse PostStockAdjustment), dan state machine stok opname (draft↔counted→
 * posted/cancelled) dengan INVALID_STATE_TRANSITION.
 */
class InventoryTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{User, Store, Product}
     */
    private function fixtures(): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();

        app(PostStockAdjustment::class)->handle(
            $store, $owner, 'opening',
            [['product_id' => $product->id, 'quantity' => '20', 'unit_cost' => '500']],
            '2026-08-07T08:00:00Z', null, 'stock-'.$store->id,
        );

        return [$owner, $store, $product];
    }

    public function test_inventory_positions_list_with_string_quantity(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        Sanctum::actingAs($owner, ['store.read']);

        $response = $this->getJson("/api/v1/stores/{$store->public_id}/inventory")->assertOk();

        $row = $response->json('data.inventory.0');
        $this->assertSame($product->public_id, $row['product_public_id']);
        $this->assertIsString($row['quantity']);
        $this->assertSame('20.000000', $row['quantity']);
        $this->assertFalse($row['below_minimum']);
    }

    public function test_set_minimum_flags_below_minimum(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        Sanctum::actingAs($owner, ['store.read', 'inventory.write']);

        // Set minimum 50 while on-hand is 20 -> below minimum.
        $this->patchJson("/api/v1/stores/{$store->public_id}/inventory/{$product->public_id}/minimum", [
            'minimum_quantity' => '50.000000',
        ])->assertOk()->assertJsonPath('data.minimum_quantity', '50.000000');

        $row = $this->getJson("/api/v1/stores/{$store->public_id}/inventory")->json('data.inventory.0');
        $this->assertTrue($row['below_minimum']);
    }

    public function test_adjustment_increases_stock(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        Sanctum::actingAs($owner, ['store.read', 'inventory.write']);

        $this->postJson("/api/v1/stores/{$store->public_id}/inventory/adjustments", [
            'client_operation_id' => (string) Str::uuid(),
            'type' => 'increase',
            'occurred_at' => '2026-08-08T08:00:00Z',
            'items' => [[
                'product_public_id' => $product->public_id,
                'quantity' => '5.000000',
                'unit_cost' => '500',
            ]],
        ])->assertStatus(201);

        $row = $this->getJson("/api/v1/stores/{$store->public_id}/inventory")->json('data.inventory.0');
        $this->assertSame('25.000000', $row['quantity']);
    }

    public function test_cashier_cannot_adjust_stock(): void
    {
        [, $store, $product] = $this->fixtures();
        $cashier = User::factory()->create();
        $store->users()->syncWithoutDetaching([
            $cashier->id => ['role' => 'cashier', 'status' => 'active'],
        ]);
        Sanctum::actingAs($cashier, ['store.read', 'sale.create']);

        $this->postJson("/api/v1/stores/{$store->public_id}/inventory/adjustments", [
            'type' => 'increase',
            'occurred_at' => '2026-08-08T08:00:00Z',
            'items' => [['product_public_id' => $product->public_id, 'quantity' => '5.000000']],
        ])->assertStatus(403)->assertJsonPath('error.code', 'FORBIDDEN');
    }

    public function test_stock_count_full_lifecycle_draft_counted_posted(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        Sanctum::actingAs($owner, ['store.read', 'inventory.write']);

        // Start (draft).
        $created = $this->postJson("/api/v1/stores/{$store->public_id}/stock-counts", [
            'notes' => 'Opname bulanan',
        ])->assertStatus(201)->assertJsonPath('data.status', 'draft');
        $countPublicId = $created->json('data.public_id');

        // Count all items (system 20, counted 18 -> diff -2).
        $this->patchJson("/api/v1/stores/{$store->public_id}/stock-counts/{$countPublicId}", [
            'items' => [[
                'product_public_id' => $product->public_id,
                'counted_quantity' => '18.000000',
            ]],
        ])->assertOk()
            ->assertJsonPath('data.items.0.difference_quantity', '-2.000000');

        // Complete -> counted.
        $this->postJson("/api/v1/stores/{$store->public_id}/stock-counts/{$countPublicId}/complete")
            ->assertOk()->assertJsonPath('data.status', 'counted');

        // Post -> posted, stock adjusted to 18.
        $this->postJson("/api/v1/stores/{$store->public_id}/stock-counts/{$countPublicId}/post")
            ->assertOk()->assertJsonPath('data.status', 'posted');

        $row = $this->getJson("/api/v1/stores/{$store->public_id}/inventory")->json('data.inventory.0');
        $this->assertSame('18.000000', $row['quantity']);
    }

    public function test_posting_uncounted_session_is_invalid_state_transition(): void
    {
        [$owner, $store] = $this->fixtures();
        Sanctum::actingAs($owner, ['store.read', 'inventory.write']);

        $countPublicId = $this->postJson("/api/v1/stores/{$store->public_id}/stock-counts")
            ->assertStatus(201)->json('data.public_id');

        // Post while still draft (not counted) -> 409 INVALID_STATE_TRANSITION.
        $this->postJson("/api/v1/stores/{$store->public_id}/stock-counts/{$countPublicId}/post")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'INVALID_STATE_TRANSITION');
    }

    public function test_cancel_does_not_change_stock(): void
    {
        [$owner, $store, $product] = $this->fixtures();
        Sanctum::actingAs($owner, ['store.read', 'inventory.write']);

        $countPublicId = $this->postJson("/api/v1/stores/{$store->public_id}/stock-counts")
            ->assertStatus(201)->json('data.public_id');

        $this->postJson("/api/v1/stores/{$store->public_id}/stock-counts/{$countPublicId}/cancel")
            ->assertOk()->assertJsonPath('data.status', 'cancelled');

        $row = $this->getJson("/api/v1/stores/{$store->public_id}/inventory")->json('data.inventory.0');
        $this->assertSame('20.000000', $row['quantity']);
    }
}
