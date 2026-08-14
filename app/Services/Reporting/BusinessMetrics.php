<?php

namespace App\Services\Reporting;

use App\Models\Store;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class BusinessMetrics
{
    /** @return array{start:CarbonImmutable,end:CarbonImmutable,start_date:string,end_date:string} */
    public function period(Store $store, string $startDate, string $endDate): array
    {
        $timezone = (string) ($store->settings()->value('timezone') ?? 'Asia/Jakarta');
        $start = CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$startDate} 00:00:00", $timezone)->utc();
        $end = CarbonImmutable::createFromFormat('Y-m-d H:i:s', "{$endDate} 23:59:59", $timezone)->utc();

        return ['start' => $start, 'end' => $end, 'start_date' => $startDate, 'end_date' => $endDate];
    }

    /** @return array{net_revenue:string,net_cogs:string,gross_profit:string,expenses:string,estimated_profit:string} */
    public function performance(int $storeId, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $revenue = (string) DB::table('sales')->where('store_id', $storeId)->whereBetween('occurred_at', [$start, $end])->sum('total_amount');
        $cogs = (string) DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sale_items.store_id', $storeId)->whereBetween('sales.occurred_at', [$start, $end])->sum('sale_items.cogs_amount');
        $refund = (string) DB::table('sale_returns')->where('store_id', $storeId)->whereBetween('occurred_at', [$start, $end])->sum('refund_amount');
        $cogsReversed = (string) DB::table('sale_returns')->where('store_id', $storeId)->whereBetween('occurred_at', [$start, $end])->sum('cogs_reversed');
        $expenses = (string) DB::table('expenses')->where('store_id', $storeId)->whereBetween('occurred_at', [$start, $end])->sum('amount');
        $netRevenue = Decimal::subtract($revenue, $refund, Decimal::MONEY_SCALE);
        $netCogs = Decimal::subtract($cogs, $cogsReversed, Decimal::MONEY_SCALE);
        $grossProfit = Decimal::subtract($netRevenue, $netCogs, Decimal::MONEY_SCALE);

        return [
            'net_revenue' => $netRevenue,
            'net_cogs' => $netCogs,
            'gross_profit' => $grossProfit,
            'expenses' => Decimal::add('0', $expenses, Decimal::MONEY_SCALE),
            'estimated_profit' => Decimal::subtract($grossProfit, $expenses, Decimal::MONEY_SCALE),
        ];
    }

    /** @return array{cash_balance:string,inventory_value:string,supplier_payable:string,low_stock_count:int} */
    public function position(int $storeId): array
    {
        return [
            'cash_balance' => Decimal::add('0', (string) DB::table('financial_account_balances')->where('store_id', $storeId)->sum('balance'), Decimal::MONEY_SCALE),
            'inventory_value' => Decimal::add('0', (string) DB::table('inventory_balances')->where('store_id', $storeId)->sum('inventory_value'), Decimal::MONEY_SCALE),
            'supplier_payable' => Decimal::add('0', (string) DB::table('supplier_payable_balances')->where('store_id', $storeId)->sum('balance'), Decimal::MONEY_SCALE),
            'low_stock_count' => DB::table('inventory_balances')->where('store_id', $storeId)->where('minimum_quantity', '>', 0)->whereColumn('quantity', '<=', 'minimum_quantity')->count(),
        ];
    }

    /** @return list<array{product_name:string,unit_symbol:string,quantity:string,minimum_quantity:string}> */
    public function lowStock(int $storeId, int $limit = 6): array
    {
        $rows = DB::table('inventory_balances')->join('products', 'products.id', '=', 'inventory_balances.product_id')
            ->join('units', 'units.id', '=', 'products.base_unit_id')
            ->where('inventory_balances.store_id', $storeId)->where('inventory_balances.minimum_quantity', '>', 0)
            ->whereColumn('inventory_balances.quantity', '<=', 'inventory_balances.minimum_quantity')
            ->orderBy('inventory_balances.quantity')->limit($limit)
            ->get(['products.name as product_name', 'units.symbol as unit_symbol', 'inventory_balances.quantity', 'inventory_balances.minimum_quantity'])
            ->map(fn (object $row): array => [
                'product_name' => (string) $row->product_name, 'unit_symbol' => (string) $row->unit_symbol,
                'quantity' => (string) $row->quantity, 'minimum_quantity' => (string) $row->minimum_quantity,
            ])->all();

        return array_values($rows);
    }

    /** @return list<array{date:string,net_revenue:string,gross_profit:string,expenses:string,estimated_profit:string}> */
    public function daily(Store $store, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $timezone = (string) ($store->settings()->value('timezone') ?? 'Asia/Jakarta');
        $dates = [];
        $revenueByDate = [];
        $cogsByDate = [];
        $expensesByDate = [];
        $cursor = $start->setTimezone($timezone)->startOfDay();
        $last = $end->setTimezone($timezone)->startOfDay();
        while ($cursor->lte($last)) {
            $dates[] = $cursor->format('Y-m-d');
            $cursor = $cursor->addDay();
        }
        foreach (DB::table('sales')->where('store_id', $store->id)->whereBetween('occurred_at', [$start, $end])->cursor() as $row) {
            $date = CarbonImmutable::parse((string) $row->occurred_at)->setTimezone($timezone)->format('Y-m-d');
            $revenueByDate[$date] = Decimal::add($revenueByDate[$date] ?? '0.0000', (string) $row->total_amount, Decimal::MONEY_SCALE);
        }
        foreach (DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')->where('sale_items.store_id', $store->id)->whereBetween('sales.occurred_at', [$start, $end])->cursor() as $row) {
            $date = CarbonImmutable::parse((string) $row->occurred_at)->setTimezone($timezone)->format('Y-m-d');
            $cogsByDate[$date] = Decimal::add($cogsByDate[$date] ?? '0.0000', (string) $row->cogs_amount, Decimal::MONEY_SCALE);
        }
        foreach (DB::table('sale_returns')->where('store_id', $store->id)->whereBetween('occurred_at', [$start, $end])->cursor() as $row) {
            $date = CarbonImmutable::parse((string) $row->occurred_at)->setTimezone($timezone)->format('Y-m-d');
            $revenueByDate[$date] = Decimal::subtract($revenueByDate[$date] ?? '0.0000', (string) $row->refund_amount, Decimal::MONEY_SCALE);
            $cogsByDate[$date] = Decimal::subtract($cogsByDate[$date] ?? '0.0000', (string) $row->cogs_reversed, Decimal::MONEY_SCALE);
        }
        foreach (DB::table('expenses')->where('store_id', $store->id)->whereBetween('occurred_at', [$start, $end])->cursor() as $row) {
            $date = CarbonImmutable::parse((string) $row->occurred_at)->setTimezone($timezone)->format('Y-m-d');
            $expensesByDate[$date] = Decimal::add($expensesByDate[$date] ?? '0.0000', (string) $row->amount, Decimal::MONEY_SCALE);
        }

        return array_map(function (string $date) use ($revenueByDate, $cogsByDate, $expensesByDate): array {
            $revenue = $revenueByDate[$date] ?? '0.0000';
            $expenses = $expensesByDate[$date] ?? '0.0000';
            $grossProfit = Decimal::subtract($revenue, $cogsByDate[$date] ?? '0.0000', Decimal::MONEY_SCALE);

            return ['date' => $date, 'net_revenue' => $revenue, 'gross_profit' => $grossProfit, 'expenses' => $expenses, 'estimated_profit' => Decimal::subtract($grossProfit, $expenses, Decimal::MONEY_SCALE)];
        }, $dates);
    }

    /** @return list<array{product_name:string,quantity_sold:string,quantity_returned:string,net_revenue:string,net_cogs:string,gross_profit:string}> */
    public function products(int $storeId, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $sold = DB::table('sale_items')->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sale_items.store_id', $storeId)->whereBetween('sales.occurred_at', [$start, $end])->groupBy('sale_items.product_id')
            ->get(['sale_items.product_id', DB::raw('MAX(sale_items.id) as snapshot_sale_item_id'), DB::raw('SUM(sale_items.quantity) as quantity_sold'), DB::raw('SUM(sale_items.net_total) as revenue'), DB::raw('SUM(sale_items.cogs_amount) as cogs')])->keyBy('product_id');
        $returned = DB::table('sale_return_items')->join('sale_returns', 'sale_returns.id', '=', 'sale_return_items.sale_return_id')
            ->where('sale_return_items.store_id', $storeId)->whereBetween('sale_returns.occurred_at', [$start, $end])->groupBy('sale_return_items.product_id')
            ->get(['sale_return_items.product_id', DB::raw('MAX(sale_return_items.sale_item_id) as snapshot_sale_item_id'), DB::raw('SUM(sale_return_items.quantity) as quantity_returned'), DB::raw('SUM(sale_return_items.refund_amount) as refund'), DB::raw('SUM(sale_return_items.cogs_reversed) as cogs_reversed')])->keyBy('product_id');

        $snapshotNames = DB::table('sale_items')
            ->whereIn('id', $sold->pluck('snapshot_sale_item_id')->merge($returned->pluck('snapshot_sale_item_id'))->filter()->unique())
            ->pluck('product_name', 'id');

        $products = $sold->keys()->merge($returned->keys())->unique()->map(function (int|string $productId) use ($sold, $returned, $snapshotNames): array {
            $sale = $sold->get($productId);
            $return = $returned->get($productId);
            $snapshotId = $sale->snapshot_sale_item_id ?? $return->snapshot_sale_item_id;
            $netRevenue = Decimal::subtract((string) ($sale->revenue ?? '0'), (string) ($return->refund ?? '0'), Decimal::MONEY_SCALE);
            $netCogs = Decimal::subtract((string) ($sale->cogs ?? '0'), (string) ($return->cogs_reversed ?? '0'), Decimal::MONEY_SCALE);

            return [
                'product_name' => (string) $snapshotNames->get($snapshotId),
                'quantity_sold' => Decimal::add('0', (string) ($sale->quantity_sold ?? '0'), Decimal::QUANTITY_SCALE),
                'quantity_returned' => Decimal::add('0', (string) ($return->quantity_returned ?? '0'), Decimal::QUANTITY_SCALE),
                'net_revenue' => $netRevenue, 'net_cogs' => $netCogs,
                'gross_profit' => Decimal::subtract($netRevenue, $netCogs, Decimal::MONEY_SCALE),
            ];
        })->sort(fn (array $left, array $right): int => Decimal::compare($right['net_revenue'], $left['net_revenue'], Decimal::MONEY_SCALE))->take(20)->values()->all();

        return array_values($products);
    }
}
