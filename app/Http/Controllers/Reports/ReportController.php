<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Services\Reporting\BusinessMetrics;
use App\Support\CurrentStore;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request, CurrentStore $currentStore, BusinessMetrics $metrics): Response
    {
        $store = $currentStore->get();
        Gate::authorize('viewReports', $store);
        $timezone = (string) ($store->settings()->value('timezone') ?? 'Asia/Jakarta');
        $today = CarbonImmutable::now($timezone);
        $validated = $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ]);
        $startDate = (string) ($validated['start_date'] ?? $today->startOfMonth()->format('Y-m-d'));
        $endDate = (string) ($validated['end_date'] ?? $today->format('Y-m-d'));
        $localStart = CarbonImmutable::parse($startDate, $timezone);
        $localEnd = CarbonImmutable::parse($endDate, $timezone);
        if ($localStart->gt($localEnd)) {
            throw ValidationException::withMessages(['end_date' => 'Tanggal akhir tidak boleh mendahului tanggal awal.']);
        }
        if ($localStart->diffInDays($localEnd) > 365) {
            throw ValidationException::withMessages(['end_date' => 'Rentang laporan maksimal 366 hari.']);
        }
        $period = $metrics->period($store, $startDate, $endDate);

        return Inertia::render('reports/index', [
            'period' => ['start_date' => $startDate, 'end_date' => $endDate],
            'performance' => $metrics->performance($store->id, $period['start'], $period['end']),
            'position' => $metrics->position($store->id),
            'daily' => $metrics->daily($store, $period['start'], $period['end']),
            'products' => $metrics->products($store->id, $period['start'], $period['end']),
            'timezone' => $timezone,
        ]);
    }
}
