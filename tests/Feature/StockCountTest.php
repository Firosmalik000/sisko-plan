<?php

namespace Tests\Feature;

use App\Actions\Inventory\PostStockCount;
use App\Actions\Inventory\StartStockCount;
use App\Actions\Inventory\UpdateStockCount;
use App\Actions\Ledgers\PostStockAdjustment;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\StockCountStatus;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\StockAdjustment;
use App\Models\StockCountItem;
use App\Models\StockMovement;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StockCountTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_starts_opname_with_a_tenant_scoped_inventory_snapshot(): void
    {
        [$owner, $store, $product] = $this->fixtures('10', '1250');
        [, , $foreignProduct] = $this->fixtures('99', '500');

        $count = app(StartStockCount::class)->handle($store, $owner, 'Opname bulanan');

        $this->assertSame(StockCountStatus::Draft, $count->status);
        $this->assertStringStartsWith('OPN-', $count->document_number);
        $this->assertDatabaseHas('stock_count_items', [
            'stock_count_id' => $count->id,
            'product_id' => $product->id,
            'system_quantity' => 10,
            'snapshot_unit_cost' => 1250,
        ]);
        $this->assertDatabaseMissing('stock_count_items', ['stock_count_id' => $count->id, 'product_id' => $foreignProduct->id]);
    }

    public function test_cashier_can_count_and_complete_but_cannot_start_or_post(): void
    {
        [$owner, $store, $product] = $this->fixtures('5', '1000');
        $cashier = User::factory()->create();
        $store->users()->attach($cashier, [
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);
        $count = app(StartStockCount::class)->handle($store, $owner, null);
        $session = ['active_store_id' => $store->id];

        $this->actingAs($cashier)->withSession($session)
            ->get(route('operations.stock-opnames.show', $count))
            ->assertInertia(fn (Assert $page) => $page
                ->component('operations/stock-opnames/show')
                ->where('canCount', true)
                ->where('canManage', false)
                ->where('stockCount.items.0.snapshot_unit_cost', 1000));

        $this->actingAs($cashier)->withSession($session)
            ->patch(route('operations.stock-opnames.update', $count), [
                'items' => [['product_id' => $product->public_id, 'counted_quantity' => '4']],
            ])->assertRedirect();
        $this->actingAs($cashier)->withSession($session)
            ->post(route('operations.stock-opnames.complete', $count))
            ->assertRedirect();
        $this->actingAs($cashier)->withSession($session)
            ->post(route('operations.stock-opnames.post', $count))
            ->assertForbidden();
        $this->actingAs($cashier)->withSession($session)
            ->post(route('operations.stock-opnames.store'))
            ->assertForbidden();

        $this->assertSame(StockCountStatus::Counted, $count->fresh()?->status);
        $this->assertDatabaseCount('stock_adjustments', 1);
    }

    public function test_owner_posts_positive_and_negative_differences_atomically(): void
    {
        [$owner, $store, $product] = $this->fixtures('10', '1000');
        $second = Product::factory()->for($store)->create();
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [[
            'product_id' => $second->id, 'quantity' => '3', 'unit_cost' => '2000',
        ]], now()->toISOString(), null, 'stock-count-second-opening');

        $count = app(StartStockCount::class)->handle($store, $owner, null);
        app(UpdateStockCount::class)->save($store, $count, $owner, [
            ['product_id' => $product->public_id, 'counted_quantity' => '8'],
            ['product_id' => $second->public_id, 'counted_quantity' => '5'],
        ]);
        app(UpdateStockCount::class)->complete($store, $count, $owner);
        app(PostStockCount::class)->handle($store, $count, $owner);

        $balances = InventoryBalance::query()->where('store_id', $store->id)->pluck('quantity', 'product_id');
        $this->assertSame('8.000000', $balances[$product->id]);
        $this->assertSame('5.000000', $balances[$second->id]);
        $this->assertSame(StockCountStatus::Posted, $count->fresh()?->status);
        $this->assertDatabaseCount('stock_adjustments', 4);
        $this->assertSame(2, StockAdjustment::query()->where('stock_count_id', $count->id)->count());
        $this->assertEqualsCanonicalizing(
            ['stock_opname_in', 'stock_opname_out'],
            StockMovement::query()->whereIn('reason', ['stock_opname_in', 'stock_opname_out'])->pluck('reason')->all(),
        );
    }

    public function test_posting_applies_snapshot_difference_after_later_stock_movements(): void
    {
        [$owner, $store, $product] = $this->fixtures('10', '1000');
        $count = app(StartStockCount::class)->handle($store, $owner, null);
        app(UpdateStockCount::class)->save($store, $count, $owner, [[
            'product_id' => $product->public_id, 'counted_quantity' => '8',
        ]]);
        app(UpdateStockCount::class)->complete($store, $count, $owner);

        app(PostStockAdjustment::class)->handle($store, $owner, 'decrease', [[
            'product_id' => $product->id, 'quantity' => '1',
        ]], now()->toISOString(), null, 'movement-after-count-start');
        app(PostStockCount::class)->handle($store, $count, $owner);

        $this->assertSame('7.000000', InventoryBalance::query()->where('product_id', $product->id)->value('quantity'));
    }

    public function test_incomplete_and_duplicate_opnames_are_rejected(): void
    {
        [$owner, $store] = $this->fixtures('2', '100');
        Product::factory()->for($store)->create();
        $count = app(StartStockCount::class)->handle($store, $owner, null);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('operations.stock-opnames.complete', $count))
            ->assertSessionHasErrors('items');
        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->post(route('operations.stock-opnames.store'))
            ->assertSessionHasErrors('stock_count');

        $this->assertDatabaseCount('stock_counts', 1);
    }

    public function test_zero_count_is_valid_and_cross_store_opname_is_hidden(): void
    {
        [$owner, $store, $product] = $this->fixtures('2', '100');
        [$foreignOwner, $foreignStore] = $this->fixtures('1', '50');
        $count = app(StartStockCount::class)->handle($store, $owner, null);

        $this->actingAs($owner)->withSession(['active_store_id' => $store->id])
            ->patch(route('operations.stock-opnames.update', $count), [
                'items' => [['product_id' => $product->public_id, 'counted_quantity' => '0']],
            ])->assertRedirect();
        $this->assertSame('0.000000', StockCountItem::query()->sole()->counted_quantity);

        $this->actingAs($foreignOwner)->withSession(['active_store_id' => $foreignStore->id])
            ->get(route('operations.stock-opnames.show', $count))
            ->assertNotFound();
    }

    public function test_fractional_physical_count_keeps_quantity_precision(): void
    {
        [$owner, $store, $product] = $this->fixtures('2', '100');
        $count = app(StartStockCount::class)->handle($store, $owner, null);

        app(UpdateStockCount::class)->save($store, $count, $owner, [[
            'product_id' => $product->public_id,
            'counted_quantity' => '1.125',
        ]]);

        $item = StockCountItem::query()->sole();
        $this->assertSame('1.125000', $item->counted_quantity);
        $this->assertSame('-0.875000', $item->difference_quantity);
    }

    /** @return array{User, Store, Product} */
    private function fixtures(string $quantity, string $cost): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create();
        app(PostStockAdjustment::class)->handle($store, $owner, 'opening', [[
            'product_id' => $product->id,
            'quantity' => $quantity,
            'unit_cost' => $cost,
        ]], now()->toISOString(), null, 'opening-'.$store->id);

        return [$owner, $store, $product];
    }
}
