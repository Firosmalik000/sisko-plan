import { Head, Link } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
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

export default function SalesIndex({
    sales,
    canViewProfit,
    canReturn,
    timezone,
}: {
    sales: { data: Sale[]; links: PaginationLink[]; total: number };
    canViewProfit: boolean;
    canReturn: boolean;
    timezone: string;
}) {
    return (
        <>
            <Head title="Transaksi penjualan" />
            <div className="min-h-full bg-[linear-gradient(180deg,#f8faf6_0%,#f2f5f0_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto max-w-6xl space-y-4">
                    <header className="rounded-[1.35rem] border border-[#173c35]/8 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h1 className="text-2xl font-black tracking-[-0.04em] text-[#173c35]">
                                Transaksi
                            </h1>
                            <Link
                                href="/pos"
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#173f35] px-4 text-sm font-black text-white"
                            >
                                <ShoppingCart className="size-4" />
                                Buka kasir
                            </Link>
                        </div>
                    </header>
                    <section className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="space-y-3">
                            {sales.data.map((sale) => (
                                <div
                                    key={sale.public_id}
                                    className="grid gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-orange-300 hover:shadow-sm md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center"
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
                                        <p className="font-black text-[#173c39]">
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
                                                href={`/sales/${sale.public_id}`}
                                            >
                                                Invoice
                                            </Link>
                                        </Button>
                                        {canReturn && (
                                            <Button asChild size="sm">
                                                <Link
                                                    href={`/sales/${sale.public_id}/returns/create`}
                                                >
                                                    Retur
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {sales.data.length === 0 && (
                            <div className="py-14 text-center">
                                <p className="font-serif text-2xl text-slate-700">
                                    Belum ada penjualan
                                </p>
                                <Link
                                    href="/pos"
                                    className="mt-3 inline-block text-sm font-bold text-orange-700"
                                >
                                    Mulai transaksi pertama
                                </Link>
                            </div>
                        )}
                        <div className="mt-6">
                            <Pagination links={sales.links} />
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
