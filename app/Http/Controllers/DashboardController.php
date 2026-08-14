<?php

namespace App\Http\Controllers;

use App\Services\Reporting\BusinessMetrics;
use App\Support\CurrentStore;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(CurrentStore $currentStore, BusinessMetrics $metrics): Response
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
            $period = $metrics->period($store, $today->startOfMonth()->format('Y-m-d'), $today->format('Y-m-d'));
            $monthNames = [1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            $payload['monthLabel'] = $monthNames[(int) $today->format('n')].' '.$today->format('Y');
            $payload['performance'] = $metrics->performance($store->id, $period['start'], $period['end']);
            $payload['position'] = $metrics->position($store->id);
            $payload['lowStock'] = $metrics->lowStock($store->id);
        }

        return Inertia::render('dashboard', $payload);
    }
}
