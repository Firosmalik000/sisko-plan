<?php

namespace Tests\Feature;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\InventoryBalance;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StockAlertNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_pages_remain_available_during_deployment_before_alert_read_migration(): void
    {
        [$owner, $store] = $this->criticalBalance('2.500000', '5.000000');
        Schema::rename('stock_alert_reads', 'stock_alert_reads_pending');

        try {
            $this->actingAs($owner)
                ->withSession(['active_store_id' => $store->id])
                ->get(route('dashboard'))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->where('stockAlerts.count', 0)
                    ->where('stockAlerts.unread_count', 0)
                    ->where('stockAlerts.items', []));
        } finally {
            Schema::rename('stock_alert_reads_pending', 'stock_alert_reads');
        }
    }

    public function test_critical_stock_is_shared_as_an_unread_notification(): void
    {
        [$owner, $store, $balance] = $this->criticalBalance('2.500000', '5.000000');

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('stockAlerts.count', 1)
                ->where('stockAlerts.unread_count', 1)
                ->where('stockAlerts.items.0.id', $balance->id)
                ->where('stockAlerts.items.0.quantity', '2.500000')
                ->where('stockAlerts.items.0.minimum_quantity', '5.000000')
                ->where('stockAlerts.items.0.unread', true));
    }

    public function test_opening_notifications_marks_current_alerts_as_read_until_stock_changes(): void
    {
        [$owner, $store, $balance] = $this->criticalBalance('2.500000', '5.000000');

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->post(route('notifications.stock-alerts.read'))
            ->assertRedirect();

        $this->assertDatabaseHas('stock_alert_reads', [
            'user_id' => $owner->id,
            'store_id' => $store->id,
            'inventory_balance_id' => $balance->id,
            'quantity' => '2.500000',
            'minimum_quantity' => '5.000000',
        ]);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stockAlerts.count', 1)
                ->where('stockAlerts.unread_count', 0)
                ->where('stockAlerts.items.0.unread', false));

        $balance->update(['quantity' => '1.250000']);

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stockAlerts.unread_count', 1)
                ->where('stockAlerts.items.0.quantity', '1.250000')
                ->where('stockAlerts.items.0.unread', true));
    }

    public function test_read_state_is_isolated_per_user_and_store(): void
    {
        [$owner, $store, $balance] = $this->criticalBalance('1.000000', '3.000000');
        $cashier = User::factory()->create();
        $store->users()->attach($cashier->id, [
            'role' => MembershipRole::Cashier->value,
            'status' => MembershipStatus::Active->value,
        ]);
        [$otherOwner, $otherStore, $otherBalance] = $this->criticalBalance('0.000000', '2.000000');

        $this->actingAs($owner)
            ->withSession(['active_store_id' => $store->id])
            ->post(route('notifications.stock-alerts.read'))
            ->assertRedirect();

        $this->assertDatabaseHas('stock_alert_reads', [
            'user_id' => $owner->id,
            'inventory_balance_id' => $balance->id,
        ]);
        $this->assertDatabaseMissing('stock_alert_reads', [
            'inventory_balance_id' => $otherBalance->id,
        ]);

        $this->actingAs($cashier)
            ->withSession(['active_store_id' => $store->id])
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stockAlerts.unread_count', 1));

        $this->actingAs($otherOwner)
            ->withSession(['active_store_id' => $otherStore->id])
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('stockAlerts.unread_count', 1));
    }

    /** @return array{User, Store, InventoryBalance} */
    private function criticalBalance(string $quantity, string $minimumQuantity): array
    {
        $owner = User::factory()->create();
        $store = Store::factory()->for($owner, 'owner')->create();
        $product = Product::factory()->for($store)->create(['name' => 'Kopi Susu']);
        $balance = InventoryBalance::query()->create([
            'store_id' => $store->id,
            'product_id' => $product->id,
            'product_variant_id' => null,
            'stock_key' => "product:{$product->id}",
            'quantity' => $quantity,
            'average_cost' => 0,
            'inventory_value' => 0,
            'minimum_quantity' => $minimumQuantity,
        ]);

        return [$owner, $store, $balance];
    }
}
