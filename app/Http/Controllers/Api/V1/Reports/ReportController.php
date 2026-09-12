<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Requests\Api\V1\Reports\ReportRangeRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Services\Reporting\BusinessMetrics;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Laporan bisnis store-scoped (Req 20): penjualan, laba, stok, kas. REUSE
 * `BusinessMetrics` (agregasi decimal scale 4, zona waktu toko) — tidak ada
 * duplikasi query bisnis. Baca `store.read`. Penjualan dipartisi per kasir & per
 * periode; total agregat = jumlah partisi per kasir (invarian dijaga eksplisit).
 */
class ReportController
{
    public function __construct(private BusinessMetrics $metrics) {}

    public function sales(ReportRangeRequest $request, Store $store): JsonResponse
    {
        $this->assertRead($request);
        $period = $this->metrics->period($store, $request->validated()['start_date'], $request->validated()['end_date']);

        $byCashier = $this->salesByCashier($store->id, $period['start'], $period['end']);
        $aggregate = array_reduce(
            $byCashier,
            fn (string $carry, array $row): string => Decimal::add($carry, $row['net_revenue'], Decimal::MONEY_SCALE),
            '0.0000',
        );

        return ApiResponse::success([
            'range' => ['start_date' => $period['start_date'], 'end_date' => $period['end_date']],
            'net_revenue' => $aggregate,
            'transaction_count' => $this->metrics->transactionCount($store->id, $period['start'], $period['end']),
            'by_cashier' => $byCashier,
            'by_period' => $this->metrics->daily($store, $period['start'], $period['end']),
        ]);
    }

    public function profit(ReportRangeRequest $request, Store $store): JsonResponse
    {
        $this->assertRead($request);
        $period = $this->metrics->period($store, $request->validated()['start_date'], $request->validated()['end_date']);

        return ApiResponse::success([
            'range' => ['start_date' => $period['start_date'], 'end_date' => $period['end_date']],
            'performance' => $this->metrics->performance($store->id, $period['start'], $period['end']),
            'categories' => $this->metrics->categories($store->id, $period['start'], $period['end']),
            'products' => $this->metrics->products($store->id, $period['start'], $period['end']),
        ]);
    }

    public function stock(Request $request, Store $store): JsonResponse
    {
        $this->assertRead($request);
        $position = $this->metrics->position($store->id);

        return ApiResponse::success([
            'inventory_value' => $position['inventory_value'],
            'low_stock_count' => $position['low_stock_count'],
            'low_stock' => $this->metrics->lowStock($store->id, 50),
        ]);
    }

    public function cash(Request $request, Store $store): JsonResponse
    {
        $this->assertRead($request);
        $position = $this->metrics->position($store->id);

        return ApiResponse::success([
            'cash_balance' => $position['cash_balance'],
            'supplier_payable' => $position['supplier_payable'],
            'accounts' => $this->accountBalances($store->id),
        ]);
    }

    /**
     * Partisi penjualan bersih per kasir: (Σ total penjualan) − (Σ refund retur),
     * dikelompokkan `created_by_user_id`. Nama kasir di-join dari `users`. Nilai
     * string decimal scale 4 sehingga total agregat = jumlah baris.
     *
     * @return list<array{cashier_name:string,net_revenue:string,transaction_count:int}>
     */
    private function salesByCashier(int $storeId, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $sold = DB::table('sales')
            ->leftJoin('users', 'users.id', '=', 'sales.created_by_user_id')
            ->where('sales.store_id', $storeId)
            ->whereBetween('sales.occurred_at', [$start, $end])
            ->groupBy('sales.created_by_user_id', 'users.name')
            ->get([
                'sales.created_by_user_id',
                DB::raw("COALESCE(users.name, 'Tidak diketahui') as cashier_name"),
                DB::raw('SUM(sales.total_amount) as revenue'),
                DB::raw('COUNT(sales.id) as transaction_count'),
            ])
            ->keyBy('created_by_user_id');

        $refunded = DB::table('sale_returns')
            ->where('store_id', $storeId)
            ->whereBetween('occurred_at', [$start, $end])
            ->groupBy('created_by_user_id')
            ->get(['created_by_user_id', DB::raw('SUM(refund_amount) as refund')])
            ->keyBy('created_by_user_id');

        $rows = $sold->map(function (object $row) use ($refunded): array {
            $refund = $refunded->get($row->created_by_user_id);

            return [
                'cashier_name' => (string) $row->cashier_name,
                'net_revenue' => Decimal::subtract((string) $row->revenue, (string) ($refund->refund ?? '0'), Decimal::MONEY_SCALE),
                'transaction_count' => (int) $row->transaction_count,
            ];
        })->values()->all();

        return array_values($rows);
    }

    /**
     * Saldo per akun keuangan (string decimal scale 4) untuk laporan kas.
     *
     * @return list<array{name:string,balance:string}>
     */
    private function accountBalances(int $storeId): array
    {
        return DB::table('financial_accounts')
            ->leftJoin('financial_account_balances', function ($join) use ($storeId): void {
                $join->on('financial_account_balances.financial_account_id', '=', 'financial_accounts.id')
                    ->where('financial_account_balances.store_id', $storeId);
            })
            ->where('financial_accounts.store_id', $storeId)
            ->orderBy('financial_accounts.name')
            ->get(['financial_accounts.name', DB::raw('COALESCE(financial_account_balances.balance, 0) as balance')])
            ->map(fn (object $row): array => [
                'name' => (string) $row->name,
                'balance' => Decimal::add('0', (string) $row->balance, Decimal::MONEY_SCALE),
            ])->all();
    }

    private function assertRead(Request $request): void
    {
        if (! $request->user()->tokenCan('store.read')) {
            throw new AccessDeniedHttpException('Ability store.read diperlukan.');
        }
    }
}
