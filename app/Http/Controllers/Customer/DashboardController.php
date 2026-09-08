<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Services\Reporting\BusinessMetrics;
use App\Support\CurrentStore;
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

            $selectedPeriod = $metrics->period($store, $dashboardPeriod['start']->format('Y-m-d'), $dashboardPeriod['end']->format('Y-m-d'));
            $comparisonPeriod = $metrics->period($store, $dashboardPeriod['previous_start']->format('Y-m-d'), $dashboardPeriod['previous_end']->format('Y-m-d'));
            $performance = $metrics->performance($store->id, $selectedPeriod['start'], $selectedPeriod['end']);
            $previousPerformance = $metrics->performance($store->id, $comparisonPeriod['start'], $comparisonPeriod['end']);
            $position = $metrics->position($store->id);
            $transactions = $metrics->transactionCount($store->id, $selectedPeriod['start'], $selectedPeriod['end']);
            $trend = [];

            $cursor = $dashboardPeriod['start'];
            while ($cursor->lte($dashboardPeriod['end'])) {
                $date = $cursor->format('Y-m-d');
                $trend[$date] = ['date' => $date, 'net_revenue' => '0.0000', 'transactions' => 0];
                $cursor = $cursor->addDay();
            }

            $countsByDate = [];
            foreach (DB::table('sales')
                ->where('store_id', $store->id)
                ->whereBetween('occurred_at', [$selectedPeriod['start'], $selectedPeriod['end']])
                ->get(['occurred_at']) as $sale) {
                $date = CarbonImmutable::parse((string) $sale->occurred_at)->setTimezone($timezone)->format('Y-m-d');
                $countsByDate[$date] = ($countsByDate[$date] ?? 0) + 1;
            }
            foreach ($metrics->daily($store, $selectedPeriod['start'], $selectedPeriod['end']) as $day) {
                if (isset($trend[$day['date']])) {
                    $trend[$day['date']] = [...$day, 'transactions' => $countsByDate[$day['date']] ?? 0];
                }
            }

            $payload['performance'] = $performance;
            $payload['comparison'] = ['previous_net_revenue' => $previousPerformance['net_revenue']];
            $payload['position'] = $position;
            $payload['lowStock'] = $metrics->lowStock($store->id, 6);
            $payload['transactions'] = $transactions;
            $payload['salesTrend'] = array_values($trend);
            $payload['topProducts'] = array_slice($metrics->products($store->id, $selectedPeriod['start'], $selectedPeriod['end']), 0, 3);
            $payload['categorySales'] = $metrics->categories($store->id, $selectedPeriod['start'], $selectedPeriod['end']);
        }

        return Inertia::render('customer/dashboard', $payload);
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
}
