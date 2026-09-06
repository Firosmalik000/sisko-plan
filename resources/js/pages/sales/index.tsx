import { Head, Link, router } from '@inertiajs/react';
import {
    CalendarDays,
    ReceiptText,
    RotateCcw,
    ShoppingCart,
} from 'lucide-react';
import { ledgerDateTime, money } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';

type Sale = {
    public_id: string;
    document_number: string;
    total_amount: string;
    refund_amount: string;
    net_revenue: string;
    paid_amount: string;
    change_amount: string;
    account_name: string;
    occurred_at: string;
    net_cogs?: string;
    net_gross_profit?: string;
};

type SalesFilters = {
    period: 'today' | 'week' | 'month';
    view: 'history' | 'returns';
    from: 'pos' | null;
};

const periodOptions: Array<{ value: SalesFilters['period']; label: string }> = [
    { value: 'today', label: 'Hari ini' },
    { value: 'week', label: '7 hari terakhir' },
    { value: 'month', label: 'Bulan ini' },
];

export default function SalesIndex({
    sales,
    canViewProfit,
    canReturn,
    timezone,
    filters,
}: {
    sales: { data: Sale[]; links: PaginationLink[]; total: number };
    canViewProfit: boolean;
    canReturn: boolean;
    timezone: string;
    filters: SalesFilters;
}) {
    const returnMode = filters.view === 'returns';
    const contextQuery = new URLSearchParams({
        period: filters.period,
        view: filters.view,
        ...(filters.from ? { from: filters.from } : {}),
    }).toString();
    const updatePeriod = (period: SalesFilters['period']) => {
        router.get(
            '/sales',
            { period, view: filters.view, from: filters.from },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head
                title={returnMode ? 'Retur penjualan' : 'Riwayat penjualan'}
            />
            <div className="min-h-full bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto max-w-6xl space-y-4">
                    <header className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className={`grid size-11 shrink-0 place-items-center rounded-xl ${returnMode ? 'bg-red-50 text-red-700' : 'bg-[var(--app-soft)] text-[var(--app-primary)]'}`}
                                >
                                    {returnMode ? (
                                        <RotateCcw className="size-5" />
                                    ) : (
                                        <ReceiptText className="size-5" />
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <h1 className="text-lg leading-tight font-black tracking-[-0.03em] text-[var(--app-ink)] sm:text-2xl">
                                        {returnMode
                                            ? 'Pilih Transaksi Retur'
                                            : 'Riwayat Transaksi'}
                                    </h1>
                                    <p className="mt-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                        {sales.total} transaksi
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/pos"
                                className="hidden h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] sm:inline-flex"
                            >
                                <ShoppingCart className="size-4" />
                                Buka kasir
                            </Link>
                        </div>
                        <div className="mt-4 flex items-center gap-2 border-t border-[var(--app-ink)]/8 pt-3">
                            <CalendarDays className="size-4 shrink-0 text-[var(--app-primary)]" />
                            <label htmlFor="sales-period" className="sr-only">
                                Periode transaksi
                            </label>
                            <select
                                id="sales-period"
                                value={filters.period}
                                onChange={(event) =>
                                    updatePeriod(
                                        event.target
                                            .value as SalesFilters['period'],
                                    )
                                }
                                className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--app-ink)]/10 bg-[#fffaf7] px-3 text-sm font-bold text-[var(--app-ink)] outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary)]/15 sm:max-w-56"
                            >
                                {periodOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </header>
                    <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
                        <div className="divide-y divide-[var(--app-ink)]/8">
                            {sales.data.map((sale) => (
                                <div
                                    key={sale.public_id}
                                    className="grid gap-3 p-4 transition hover:bg-[#fffaf7] sm:p-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center"
                                >
                                    <div>
                                        <p className="font-bold text-slate-900">
                                            {sale.document_number}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {ledgerDateTime(
                                                sale.occurred_at,
                                                timezone,
                                            )}{' '}
                                            · {sale.account_name}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Pendapatan neto
                                        </p>
                                        <p className="font-black text-[var(--app-ink)]">
                                            {money(sale.net_revenue)}
                                        </p>
                                        {Number(sale.refund_amount) > 0 && (
                                            <p className="text-xs font-semibold text-red-600">
                                                Refund{' '}
                                                {money(sale.refund_amount)}
                                            </p>
                                        )}
                                    </div>
                                    {canViewProfit ? (
                                        <div>
                                            <p className="text-xs text-slate-500">
                                                HPP / laba kotor neto
                                            </p>
                                            <p className="font-semibold text-slate-800">
                                                {money(sale.net_cogs ?? 0)} /{' '}
                                                <span className="text-teal-700">
                                                    {money(
                                                        sale.net_gross_profit ??
                                                            0,
                                                    )}
                                                </span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div />
                                    )}
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                        >
                                            <Link
                                                href={`/sales/${sale.public_id}?${contextQuery}`}
                                            >
                                                Invoice
                                            </Link>
                                        </Button>
                                        {canReturn && (
                                            <Button asChild size="sm">
                                                <Link
                                                    href={`/sales/${sale.public_id}/returns/create?${contextQuery}`}
                                                >
                                                    {returnMode
                                                        ? 'Pilih'
                                                        : 'Retur'}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {sales.data.length === 0 && (
                            <div className="px-5 py-14 text-center">
                                <p className="text-lg font-black text-[var(--app-ink)]">
                                    Tidak ada transaksi pada periode ini
                                </p>
                                <Link
                                    href="/pos"
                                    className="mt-3 inline-block text-sm font-bold text-orange-700"
                                >
                                    Mulai transaksi pertama
                                </Link>
                            </div>
                        )}
                        <div className="border-t border-[var(--app-ink)]/8 p-4">
                            <Pagination links={sales.links} />
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
