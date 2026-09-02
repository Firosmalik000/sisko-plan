<?php

namespace App\Services\Notifications;

use App\Models\InventoryBalance;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Facades\DB;

class StockAlertNotifications
{
    /**
     * @return array{count: int, unread_count: int, items: array<int, array<string, mixed>>}
     */
    public function summary(User $user, Store $store): array
    {
        $query = $this->criticalBalances($store)
            ->leftJoin('stock_alert_reads', function (JoinClause $join) use ($store, $user): void {
                $join->on('stock_alert_reads.inventory_balance_id', '=', 'inventory_balances.id')
                    ->where('stock_alert_reads.user_id', $user->id)
                    ->where('stock_alert_reads.store_id', $store->id);
            });

        $count = (clone $query)->count('inventory_balances.id');
        $unreadCount = (clone $query)->where($this->unreadCondition())->count('inventory_balances.id');
        $items = (clone $query)
            ->select([
                'inventory_balances.id',
                'products.name',
                'product_variants.name as variant_name',
                'units.symbol as unit',
                'inventory_balances.quantity',
                'inventory_balances.minimum_quantity',
            ])
            ->selectRaw($this->unreadSql().' as is_unread')
            ->orderByDesc('is_unread')
            ->orderBy('inventory_balances.quantity')
            ->orderBy('products.name')
            ->limit(8)
            ->get()
            ->map(fn (InventoryBalance $alert) => [
                'id' => $alert->id,
                'name' => $alert->name ?? 'Produk',
                'variant_name' => $alert->variant_name,
                'unit' => $alert->unit,
                'quantity' => (string) $alert->quantity,
                'minimum_quantity' => (string) $alert->minimum_quantity,
                'unread' => (bool) $alert->is_unread,
            ])
            ->values()
            ->all();

        return [
            'count' => $count,
            'unread_count' => $unreadCount,
            'items' => $items,
        ];
    }

    public function markCurrentAsRead(User $user, Store $store): void
    {
        $now = now();
        $rows = $this->criticalBalances($store)
            ->get([
                'inventory_balances.id',
                'inventory_balances.quantity',
                'inventory_balances.minimum_quantity',
                'inventory_balances.updated_at',
            ])
            ->map(fn (InventoryBalance $balance) => [
                'user_id' => $user->id,
                'store_id' => $store->id,
                'inventory_balance_id' => $balance->id,
                'quantity' => $balance->quantity,
                'minimum_quantity' => $balance->minimum_quantity,
                'balance_updated_at' => $balance->updated_at,
                'read_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->all();

        if ($rows === []) {
            return;
        }

        DB::table('stock_alert_reads')->upsert(
            $rows,
            ['user_id', 'inventory_balance_id'],
            ['store_id', 'quantity', 'minimum_quantity', 'balance_updated_at', 'read_at', 'updated_at'],
        );
    }

    private function criticalBalances(Store $store): Builder
    {
        return InventoryBalance::query()
            ->join('products', 'products.id', '=', 'inventory_balances.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'inventory_balances.product_variant_id')
            ->join('units', 'units.id', '=', 'products.base_unit_id')
            ->where('inventory_balances.store_id', $store->id)
            ->whereColumn('inventory_balances.quantity', '<=', 'inventory_balances.minimum_quantity')
            ->where('products.is_active', true)
            ->where(fn (Builder $query) => $query
                ->whereNull('inventory_balances.product_variant_id')
                ->orWhere('product_variants.is_active', true));
    }

    private function unreadCondition(): \Closure
    {
        return fn (Builder $query) => $query
            ->whereNull('stock_alert_reads.id')
            ->orWhereColumn('stock_alert_reads.quantity', '<>', 'inventory_balances.quantity')
            ->orWhereColumn('stock_alert_reads.minimum_quantity', '<>', 'inventory_balances.minimum_quantity')
            ->orWhereColumn('inventory_balances.updated_at', '>', 'stock_alert_reads.balance_updated_at');
    }

    private function unreadSql(): string
    {
        return 'CASE WHEN stock_alert_reads.id IS NULL'
            .' OR stock_alert_reads.quantity <> inventory_balances.quantity'
            .' OR stock_alert_reads.minimum_quantity <> inventory_balances.minimum_quantity'
            .' OR inventory_balances.updated_at > stock_alert_reads.balance_updated_at'
            .' THEN 1 ELSE 0 END';
    }
}
