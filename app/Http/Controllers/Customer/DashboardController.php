<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Services\Reporting\BusinessMetrics;
use App\Support\CurrentStore;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
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
            $payload['period'] = ['key' => $periodKey];

            $selectedPeriod = $metrics->period($store, $dashboardPeriod['start']->format('Y-m-d'), $dashboardPeriod['end']->format('Y-m-d'));
            $comparisonPeriod = $metrics->period($store, $dashboardPeriod['previous_start']->format('Y-m-d'), $dashboardPeriod['previous_end']->format('Y-m-d'));
            $performance = $metrics->performance($store->id, $selectedPeriod['start'], $selectedPeriod['end']);
            $previousPerformance = $metrics->performance($store->id, $comparisonPeriod['start'], $comparisonPeriod['end']);
            $position = $metrics->position($store->id);
            $daily = $metrics->daily($store, $selectedPeriod['start'], $selectedPeriod['end']);

            $payload['performance'] = $performance;
            $payload['comparison'] = $this->comparison($performance['net_revenue'], $previousPerformance['net_revenue']);
            $payload['position'] = $position;
            $payload['lowStock'] = $metrics->lowStock($store->id, 6);
            $payload['transactions'] = array_sum(array_column($daily, 'transactions'));
            $payload['salesTrend'] = array_map(fn (array $day): array => [
                'date' => $day['date'],
                'net_revenue' => $day['net_revenue'],
                'transactions' => $day['transactions'],
            ], $daily);
            $payload['topProducts'] = array_slice($metrics->products($store->id, $selectedPeriod['start'], $selectedPeriod['end']), 0, 3);
            $payload['categorySales'] = $metrics->categories($store->id, $selectedPeriod['start'], $selectedPeriod['end']);
        }

        return Inertia::render('customer/dashboard/index', $payload);
    }

    /** @return array{start:CarbonImmutable,end:CarbonImmutable,previous_start:CarbonImmutable,previous_end:CarbonImmutable} */
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

        return [
            'start' => $start,
            'end' => $end,
            'previous_start' => $previousStart,
            'previous_end' => $previousEnd,
        ];
    }

    /** @return array{direction:'up'|'down'|'flat',percentage:int|null} */
    private function comparison(string $current, string $previous): array
    {
        $comparison = Decimal::compare($current, $previous, Decimal::MONEY_SCALE);
        $direction = $comparison > 0 ? 'up' : ($comparison < 0 ? 'down' : 'flat');

        if (Decimal::compare($previous, '0', Decimal::MONEY_SCALE) === 0) {
            return ['direction' => $direction, 'percentage' => $comparison === 0 ? 0 : null];
        }

        $difference = Decimal::absolute(Decimal::subtract($current, $previous, Decimal::MONEY_SCALE), Decimal::MONEY_SCALE);
        $ratio = Decimal::divide($difference, Decimal::absolute($previous, Decimal::MONEY_SCALE), 6);

        return [
            'direction' => $direction,
            'percentage' => (int) round((float) Decimal::multiply($ratio, '100', 2)),
        ];
    }
}
