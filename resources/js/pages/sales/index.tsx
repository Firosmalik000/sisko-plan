import { Head, Link } from '@inertiajs/react';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { ledgerDateTime, money } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';

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
    timezone,
}: {
    sales: { data: Sale[]; links: PaginationLink[]; total: number };
    canViewProfit: boolean;
    timezone: string;
}) {
    return (
        <>
            <Head title="Riwayat penjualan" />
            <div className="min-h-full bg-[linear-gradient(145deg,#f4f8f6,#fff9f1)] p-4 md:p-8">
                <div className="mx-auto max-w-6xl space-y-6">
                    <header className="rounded-[2rem] bg-[#173c39] p-7 text-white md:p-10">
                        <p className="text-xs font-bold tracking-[0.24em] text-orange-300 uppercase">
                            Buku 05 / Sales
                        </p>
                        <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
                            <div>
                                <h1 className="font-serif text-3xl md:text-5xl">
                                    Riwayat penjualan
                                </h1>
                                <p className="mt-2 text-sm text-teal-50/70">
                                    Pendapatan neto memperhitungkan refund yang
                                    sudah diposting.
                                </p>
                            </div>
                            <Link
                                href="/pos"
                                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white"
                            >
                                <ShoppingCart className="size-4" />
                                Buka kasir
                            </Link>
                        </div>
                    </header>
                    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-sm md:p-7">
                        <div className="space-y-3">
                            {sales.data.map((sale) => (
                                <Link
                                    key={sale.public_id}
                                    href={`/sales/${sale.public_id}`}
                                    className="group grid gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-orange-300 hover:shadow-sm md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center"
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
                                    <ArrowRight className="size-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-orange-600" />
                                </Link>
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
