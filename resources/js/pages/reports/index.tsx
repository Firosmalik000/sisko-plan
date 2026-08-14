import { Head, router } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    Boxes,
    CircleDollarSign,
    HandCoins,
    LineChart,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { fieldClass, money, quantity } from '@/components/operations-shell';

type Performance = {
    net_revenue: string;
    net_cogs: string;
    gross_profit: string;
    expenses: string;
    estimated_profit: string;
};
type Position = {
    cash_balance: string;
    inventory_value: string;
    supplier_payable: string;
    low_stock_count: number;
};
type Daily = {
    date: string;
    net_revenue: string;
    gross_profit: string;
    expenses: string;
    estimated_profit: string;
};
type Product = {
    product_name: string;
    quantity_sold: string;
    quantity_returned: string;
    net_revenue: string;
    net_cogs: string;
    gross_profit: string;
};

export default function ReportsPage({
    period,
    performance,
    position,
    daily,
    products,
}: {
    period: { start_date: string; end_date: string };
    performance: Performance;
    position: Position;
    daily: Daily[];
    products: Product[];
    timezone: string;
}) {
    const [startDate, setStartDate] = useState(period.start_date);
    const [endDate, setEndDate] = useState(period.end_date);
    const maxBar = Math.max(
        1,
        ...daily.map((item) =>
            Math.max(
                Math.abs(Number(item.net_revenue)),
                Math.abs(Number(item.estimated_profit)),
            ),
        ),
    );
    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/reports',
            { start_date: startDate, end_date: endDate },
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Laporan Usaha" />
            <main className="min-h-full bg-[linear-gradient(145deg,#f7f4ea_0%,#f8faf7_46%,#eaf6f2_100%)] p-4 md:p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header className="rounded-[2rem] border border-stone-800 bg-stone-950 px-6 py-8 text-stone-50 shadow-xl md:px-10 md:py-10">
                        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div>
                                <p className="text-xs font-bold tracking-[0.24em] text-amber-400 uppercase">
                                    Laporan operasional
                                </p>
                                <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-tight md:text-6xl">
                                    Angka yang membantu mengambil keputusan.
                                </h1>
                                <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-400">
                                    Penjualan, HPP, retur, dan biaya dihitung
                                    dari dokumen posted. Ini estimasi usaha,
                                    bukan laporan keuangan audited.
                                </p>
                            </div>
                            <form
                                onSubmit={submit}
                                className="grid gap-3 rounded-2xl bg-white/5 p-4 sm:grid-cols-[1fr_1fr_auto]"
                            >
                                <label className="space-y-1 text-xs font-bold text-stone-300">
                                    Mulai
                                    <input
                                        type="date"
                                        className={`${fieldClass} border-white/15 bg-white text-stone-950`}
                                        value={startDate}
                                        onChange={(event) =>
                                            setStartDate(event.target.value)
                                        }
                                    />
                                </label>
                                <label className="space-y-1 text-xs font-bold text-stone-300">
                                    Sampai
                                    <input
                                        type="date"
                                        className={`${fieldClass} border-white/15 bg-white text-stone-950`}
                                        value={endDate}
                                        onChange={(event) =>
                                            setEndDate(event.target.value)
                                        }
                                    />
                                </label>
                                <button className="h-11 self-end rounded-xl bg-amber-400 px-5 text-sm font-bold text-stone-950 hover:bg-amber-300">
                                    Tampilkan
                                </button>
                            </form>
                        </div>
                    </header>

                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <SummaryCard
                            label="Penjualan Bersih"
                            value={performance.net_revenue}
                        />
                        <SummaryCard
                            label="HPP Bersih"
                            value={performance.net_cogs}
                            negative
                        />
                        <SummaryCard
                            label="Laba Kotor"
                            value={performance.gross_profit}
                        />
                        <SummaryCard
                            label="Biaya Toko"
                            value={performance.expenses}
                            negative
                        />
                        <SummaryCard
                            label="Estimasi Laba Usaha"
                            value={performance.estimated_profit}
                            featured
                        />
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <PositionCard
                            icon={CircleDollarSign}
                            label="Saldo Kas dan Bank"
                            value={money(position.cash_balance)}
                        />
                        <PositionCard
                            icon={Boxes}
                            label="Nilai Persediaan"
                            value={money(position.inventory_value)}
                        />
                        <PositionCard
                            icon={HandCoins}
                            label="Utang Supplier"
                            value={money(position.supplier_payable)}
                        />
                        <PositionCard
                            icon={LineChart}
                            label="Stok Menipis"
                            value={`${position.low_stock_count} produk`}
                        />
                    </section>

                    <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm md:p-7">
                        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-xs font-bold tracking-[0.2em] text-teal-700 uppercase">
                                    Tren harian
                                </p>
                                <h2 className="mt-1 font-serif text-3xl">
                                    Ritme omzet dan laba
                                </h2>
                            </div>
                            <p className="text-xs text-stone-500">
                                Bar hijau: penjualan bersih · garis angka:
                                estimasi laba
                            </p>
                        </div>
                        <div className="mt-6 space-y-3">
                            {daily.map((item) => {
                                const width = Math.max(
                                    1,
                                    (Math.abs(Number(item.net_revenue)) /
                                        maxBar) *
                                        100,
                                );
                                const profitPositive =
                                    Number(item.estimated_profit) >= 0;

                                return (
                                    <div
                                        key={item.date}
                                        className="grid gap-2 rounded-2xl bg-stone-50 p-3 sm:grid-cols-[100px_1fr_160px] sm:items-center"
                                    >
                                        <span className="font-mono text-xs font-bold text-stone-600">
                                            {new Intl.DateTimeFormat('id-ID', {
                                                day: '2-digit',
                                                month: 'short',
                                                timeZone: 'UTC',
                                            }).format(
                                                new Date(
                                                    `${item.date}T00:00:00Z`,
                                                ),
                                            )}
                                        </span>
                                        <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                                            <div
                                                className="h-full rounded-full bg-teal-600"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 text-sm font-bold sm:justify-end">
                                            {profitPositive ? (
                                                <ArrowUpRight className="size-4 text-emerald-700" />
                                            ) : (
                                                <ArrowDownRight className="size-4 text-rose-700" />
                                            )}
                                            <span
                                                className={
                                                    profitPositive
                                                        ? 'text-emerald-800'
                                                        : 'text-rose-800'
                                                }
                                            >
                                                {money(item.estimated_profit)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm md:p-7">
                        <div>
                            <p className="text-xs font-bold tracking-[0.2em] text-amber-700 uppercase">
                                Maksimal 20 produk
                            </p>
                            <h2 className="mt-1 font-serif text-3xl">
                                Performa produk
                            </h2>
                        </div>
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[820px] text-left text-sm">
                                <thead className="border-b text-xs tracking-wide text-stone-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-3">Produk</th>
                                        <th className="px-3 py-3 text-right">
                                            Terjual
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Diretur
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Penjualan bersih
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            HPP
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Laba kotor
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {products.map((item) => (
                                        <tr key={item.product_name}>
                                            <td className="px-3 py-4 font-semibold">
                                                {item.product_name}
                                            </td>
                                            <td className="px-3 py-4 text-right">
                                                {quantity(item.quantity_sold)}
                                            </td>
                                            <td className="px-3 py-4 text-right text-rose-700">
                                                {quantity(
                                                    item.quantity_returned,
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-right">
                                                {money(item.net_revenue)}
                                            </td>
                                            <td className="px-3 py-4 text-right">
                                                {money(item.net_cogs)}
                                            </td>
                                            <td className="px-3 py-4 text-right font-bold text-teal-800">
                                                {money(item.gross_profit)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {products.length === 0 && (
                                <p className="py-12 text-center text-sm text-stone-500">
                                    Belum ada aktivitas produk pada periode ini.
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

function SummaryCard({
    label,
    value,
    negative = false,
    featured = false,
}: {
    label: string;
    value: string;
    negative?: boolean;
    featured?: boolean;
}) {
    return (
        <div
            className={`rounded-3xl border p-5 shadow-sm ${featured ? 'border-teal-900 bg-teal-950 text-white' : 'border-stone-200 bg-white/90'}`}
        >
            <p
                className={`text-xs font-bold tracking-wide uppercase ${featured ? 'text-teal-200' : 'text-stone-500'}`}
            >
                {label}
            </p>
            <p
                className={`mt-3 font-serif text-2xl ${negative && !featured ? 'text-rose-700' : ''}`}
            >
                {negative ? '- ' : ''}
                {money(value)}
            </p>
        </div>
    );
}

function PositionCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Boxes;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white/70 p-4">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-800">
                <Icon className="size-5" />
            </div>
            <div>
                <p className="text-xs text-stone-500">{label}</p>
                <p className="font-bold text-stone-900">{value}</p>
            </div>
        </div>
    );
}
