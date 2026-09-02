<?php

namespace App\Http\Controllers;

use App\Enums\MembershipStatus;
use App\Enums\StoreStatus;
use App\Models\Store;
use App\Services\Reporting\BusinessMetrics;
use App\Support\CurrentStore;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, CurrentStore $currentStore, BusinessMetrics $metrics): Response
    {
        $store = $currentStore->get();
        Gate::authorize('view', $store);
        $canViewBusinessPosition = Gate::allows('viewReports', $store);
        $payload = [
            'canViewBusinessPosition' => $canViewBusinessPosition,
            'timezone' => $store->settings()->value('timezone') ?? 'Asia/Jakarta',
        ];
        if ($canViewBusinessPosition) {
            $timezone = (string) $payload['timezone'];
            $today = CarbonImmutable::now($timezone);
            $periodKey = in_array($request->string('period')->toString(), ['day', 'month', 'quarter', 'semester', 'year'], true)
                ? $request->string('period')->toString()
                : 'month';
            $dashboardPeriod = $this->dashboardPeriod($today, $periodKey);
            $payload['monthLabel'] = $dashboardPeriod['label'];
            $payload['period'] = ['key' => $periodKey, 'label' => $dashboardPeriod['label']];

            $reportableStores = Store::query()
                ->with('settings')
                ->where('status', StoreStatus::Active->value)
                ->whereHas('users', fn ($membership) => $membership
                    ->where('users.id', $request->user()->id)
                    ->where('store_user.status', MembershipStatus::Active->value))
                ->orderBy('name')
                ->get()
                ->filter(fn (Store $candidate): bool => Gate::forUser($request->user())->allows('viewReports', $candidate));

            $performance = $this->emptyPerformance();
            $previousPerformance = $this->emptyPerformance();
            $position = $this->emptyPosition();
            $transactions = 0;
            $lowStock = [];
            $storePerformance = [];
            $topProducts = [];
            $categorySales = [];
            $trend = [];

            $cursor = $dashboardPeriod['start'];
            while ($cursor->lte($dashboardPeriod['end'])) {
                $date = $cursor->format('Y-m-d');
                $trend[$date] = ['date' => $date, 'net_revenue' => '0.0000', 'transactions' => 0];
                $cursor = $cursor->addDay();
            }

            foreach ($reportableStores as $reportableStore) {
                $storeTimezone = (string) $reportableStore->settings->timezone;
                $storeToday = CarbonImmutable::now($storeTimezone);
                $storeDashboardPeriod = $this->dashboardPeriod($storeToday, $periodKey);
                $selectedPeriod = $metrics->period($reportableStore, $storeDashboardPeriod['start']->format('Y-m-d'), $storeDashboardPeriod['end']->format('Y-m-d'));
                $comparisonPeriod = $metrics->period($reportableStore, $storeDashboardPeriod['previous_start']->format('Y-m-d'), $storeDashboardPeriod['previous_end']->format('Y-m-d'));
                $storeMetrics = $metrics->performance($reportableStore->id, $selectedPeriod['start'], $selectedPeriod['end']);
                $storePreviousMetrics = $metrics->performance($reportableStore->id, $comparisonPeriod['start'], $comparisonPeriod['end']);
                $storePosition = $metrics->position($reportableStore->id);
                $storeTransactions = $metrics->transactionCount($reportableStore->id, $selectedPeriod['start'], $selectedPeriod['end']);

                $performance = $this->addPerformance($performance, $storeMetrics);
                $previousPerformance = $this->addPerformance($previousPerformance, $storePreviousMetrics);
                $position = $this->addPosition($position, $storePosition);
                $transactions += $storeTransactions;

                $storePerformance[] = [
                    'public_id' => $reportableStore->public_id,
                    'name' => $reportableStore->name,
                    'net_revenue' => $storeMetrics['net_revenue'],
                    'estimated_profit' => $storeMetrics['estimated_profit'],
                    'transactions' => $storeTransactions,
                    'low_stock_count' => $storePosition['low_stock_count'],
                ];

                foreach ($metrics->lowStock($reportableStore->id, 3) as $item) {
                    $lowStock[] = [...$item, 'store_name' => $reportableStore->name];
                }

                foreach ($metrics->products($reportableStore->id, $selectedPeriod['start'], $selectedPeriod['end']) as $product) {
                    $topProducts[] = [...$product, 'store_name' => $reportableStore->name];
                }
                foreach ($metrics->categories($reportableStore->id, $selectedPeriod['start'], $selectedPeriod['end']) as $category) {
                    $name = $category['category_name'];
                    $categorySales[$name] ??= ['category_name' => $name, 'net_revenue' => '0.0000', 'quantity_sold' => '0.000000'];
                    $categorySales[$name]['net_revenue'] = Decimal::add($categorySales[$name]['net_revenue'], $category['net_revenue'], Decimal::MONEY_SCALE);
                    $categorySales[$name]['quantity_sold'] = Decimal::add($categorySales[$name]['quantity_sold'], $category['quantity_sold'], Decimal::QUANTITY_SCALE);
                }

                $countsByDate = [];
                foreach (DB::table('sales')
                    ->where('store_id', $reportableStore->id)
                    ->whereBetween('occurred_at', [$selectedPeriod['start'], $selectedPeriod['end']])
                    ->get(['occurred_at']) as $sale) {
                    $date = CarbonImmutable::parse((string) $sale->occurred_at)->setTimezone($storeTimezone)->format('Y-m-d');
                    $countsByDate[$date] = ($countsByDate[$date] ?? 0) + 1;
                }
                foreach ($metrics->daily($reportableStore, $selectedPeriod['start'], $selectedPeriod['end']) as $day) {
                    if (! isset($trend[$day['date']])) {
                        continue;
                    }
                    $trend[$day['date']]['net_revenue'] = Decimal::add($trend[$day['date']]['net_revenue'], $day['net_revenue'], Decimal::MONEY_SCALE);
                    $trend[$day['date']]['transactions'] += $countsByDate[$day['date']] ?? 0;
                }
            }

            usort($storePerformance, fn (array $left, array $right): int => Decimal::compare($right['net_revenue'], $left['net_revenue'], Decimal::MONEY_SCALE));
            usort($topProducts, fn (array $left, array $right): int => Decimal::compare($right['net_revenue'], $left['net_revenue'], Decimal::MONEY_SCALE));
            usort($categorySales, fn (array $left, array $right): int => Decimal::compare($right['net_revenue'], $left['net_revenue'], Decimal::MONEY_SCALE));

            $payload['performance'] = $performance;
            $payload['comparison'] = ['previous_net_revenue' => $previousPerformance['net_revenue']];
            $payload['position'] = $position;
            $payload['lowStock'] = array_slice($lowStock, 0, 6);
            $payload['transactions'] = $transactions;
            $payload['storeCount'] = $reportableStores->count();
            $payload['salesTrend'] = array_values($trend);
            $payload['storePerformance'] = $storePerformance;
            $payload['topProducts'] = array_slice($topProducts, 0, 3);
            $payload['categorySales'] = $categorySales;
        }

        return Inertia::render('dashboard', $payload);
    }

    /** @return array{start:CarbonImmutable,end:CarbonImmutable,previous_start:CarbonImmutable,previous_end:CarbonImmutable,label:string} */
    private function dashboardPeriod(CarbonImmutable $today, string $period): array
    {
        $end = $today->startOfDay();
        $start = match ($period) {
            'day' => $end,
            'month' => $end->startOfMonth(),
            'quarter' => $end->subMonths(3)->addDay(),
            'semester' => $end->subMonths(6)->addDay(),
            'year' => $end->subYear()->addDay(),
            default => $end->startOfMonth(),
        };
        $previousEnd = $start->subDay();
        $days = (int) $start->diffInDays($end);
        $previousStart = $previousEnd->subDays($days);
        $labels = [
            'day' => 'Hari ini',
            'month' => 'Bulan ini',
            'quarter' => '3 bulan terakhir',
            'semester' => '6 bulan terakhir',
            'year' => '12 bulan terakhir',
        ];

        return [
            'start' => $start,
            'end' => $end,
            'previous_start' => $previousStart,
            'previous_end' => $previousEnd,
            'label' => __($labels[$period] ?? $labels['month']),
        ];
    }

    /** @return array{net_revenue:string,net_cogs:string,gross_profit:string,expenses:string,estimated_profit:string} */
    private function emptyPerformance(): array
    {
        return array_fill_keys(['net_revenue', 'net_cogs', 'gross_profit', 'expenses', 'estimated_profit'], '0.0000');
    }

    /** @param array{net_revenue:string,net_cogs:string,gross_profit:string,expenses:string,estimated_profit:string} $total
     * @param  array{net_revenue:string,net_cogs:string,gross_profit:string,expenses:string,estimated_profit:string}  $value
     * @return array{net_revenue:string,net_cogs:string,gross_profit:string,expenses:string,estimated_profit:string}
     */
    private function addPerformance(array $total, array $value): array
    {
        foreach (array_keys($total) as $key) {
            $total[$key] = Decimal::add($total[$key], $value[$key], Decimal::MONEY_SCALE);
        }

        return $total;
    }

    /** @return array{cash_balance:string,inventory_value:string,supplier_payable:string,low_stock_count:int} */
    private function emptyPosition(): array
    {
        return ['cash_balance' => '0.0000', 'inventory_value' => '0.0000', 'supplier_payable' => '0.0000', 'low_stock_count' => 0];
    }

    /** @param array{cash_balance:string,inventory_value:string,supplier_payable:string,low_stock_count:int} $total
     * @param  array{cash_balance:string,inventory_value:string,supplier_payable:string,low_stock_count:int}  $value
     * @return array{cash_balance:string,inventory_value:string,supplier_payable:string,low_stock_count:int}
     */
    private function addPosition(array $total, array $value): array
    {
        foreach (['cash_balance', 'inventory_value', 'supplier_payable'] as $key) {
            $total[$key] = Decimal::add($total[$key], $value[$key], Decimal::MONEY_SCALE);
        }
        $total['low_stock_count'] += $value['low_stock_count'];

        return $total;
    }
}
