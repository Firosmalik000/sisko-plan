import { Head, router } from '@inertiajs/react';
import {
    Boxes,
    CalendarDays,
    CircleDollarSign,
    HandCoins,
    LineChart,
    PackageSearch,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { fieldClass, money, quantity } from '@/components/operations-shell';
import { formatCompactMoney, localeTag } from '@/lib/currency';

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

const compactMoney = formatCompactMoney;

const dateLabel = (date: string, includeYear = false) =>
    new Intl.DateTimeFormat(localeTag(), {
        day: 'numeric',
        month: 'short',
        year: includeYear ? 'numeric' : undefined,
        timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00Z`));

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
    const submit = (event: FormEvent) => {
        event.preventDefault();
        router.get(
            '/reports',
            { start_date: startDate, end_date: endDate },
            { preserveState: true, replace: true },
        );
    };
    const selectedPeriod = `${dateLabel(period.start_date)} – ${dateLabel(period.end_date, true)}`;

    return (
        <>
            <Head title="Laporan Usaha" />
            <main className="min-h-full bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] px-3 py-4 text-[var(--app-ink)] sm:px-5 sm:py-5 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-4">
                    <header className="rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white px-4 py-4 shadow-sm sm:px-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="min-w-0">
                                <h1 className="text-2xl font-black tracking-[-0.04em]">
                                    Laporan Usaha
                                </h1>
                                <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                    <CalendarDays className="size-3.5" />
                                    <span>{selectedPeriod}</span>
                                </div>
                            </div>
                            <form
                                onSubmit={submit}
                                className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                            >
                                <label className="space-y-1 text-xs font-bold text-[var(--muted-foreground)]">
                                    Mulai
                                    <input
                                        type="date"
                                        className={fieldClass}
                                        value={startDate}
                                        onChange={(event) =>
                                            setStartDate(event.target.value)
                                        }
                                    />
                                </label>
                                <label className="space-y-1 text-xs font-bold text-[var(--muted-foreground)]">
                                    Sampai
                                    <input
                                        type="date"
                                        className={fieldClass}
                                        value={endDate}
                                        onChange={(event) =>
                                            setEndDate(event.target.value)
                                        }
                                    />
                                </label>
                                <button className="h-10 self-end rounded-xl bg-[var(--app-primary)] px-4 text-sm font-bold text-[var(--app-primary-foreground)] transition hover:bg-[var(--app-primary)]">
                                    Tampilkan
                                </button>
                            </form>
                        </div>
                    </header>

                    <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
                        <SummaryCard
                            label="Penjualan Bersih"
                            value={performance.net_revenue}
                        />
                        <SummaryCard
                            label="HPP Bersih"
                            value={performance.net_cogs}
                            tone="expense"
                        />
                        <SummaryCard
                            label="Laba Kotor"
                            value={performance.gross_profit}
                        />
                        <SummaryCard
                            label="Biaya Toko"
                            value={performance.expenses}
                            tone="expense"
                        />
                        <SummaryCard
                            label="Estimasi Laba Usaha"
                            value={performance.estimated_profit}
                            featured
                        />
                    </section>

                    <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                        <PositionCard
                            icon={CircleDollarSign}
                            label="Kas & Bank"
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

                    <TrendChart data={daily} period={selectedPeriod} />
                    <ProductPerformance products={products} />
                </div>
            </main>
        </>
    );
}

function SummaryCard({
    label,
    value,
    tone = 'default',
    featured = false,
}: {
    label: string;
    value: string;
    tone?: 'default' | 'expense';
    featured?: boolean;
}) {
    const negative = Number(value) < 0;

    return (
        <article
            className={`min-w-0 rounded-[1.15rem] border p-3 shadow-sm sm:p-4 ${featured ? 'col-span-2 border-[var(--app-ink)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)] lg:col-span-1' : 'border-[var(--app-ink)]/8 bg-white'}`}
        >
            <p
                className={`truncate text-[10px] font-black tracking-wide uppercase ${featured ? 'text-[var(--app-soft-strong)]' : 'text-[var(--muted-foreground)]'}`}
                title={label}
            >
                {label}
            </p>
            <p
                className={`mt-1.5 truncate text-base font-black tracking-[-0.035em] sm:text-xl ${!featured && (tone === 'expense' || negative) ? 'text-[#a5533b]' : ''}`}
                title={money(value)}
            >
                {money(value)}
            </p>
        </article>
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
        <article className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[var(--app-ink)]/8 bg-white p-3 shadow-sm">
            <div className="shrink-0 rounded-lg bg-[var(--app-soft)] p-2 text-[var(--app-primary)]">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0">
                <p className="truncate text-[10px] font-bold text-[var(--muted-foreground)] sm:text-xs">
                    {label}
                </p>
                <p
                    className="truncate text-xs font-black text-[var(--app-ink)] sm:text-sm"
                    title={value}
                >
                    {value}
                </p>
            </div>
        </article>
    );
}

function TrendChart({ data, period }: { data: Daily[]; period: string }) {
    const values = data.flatMap((item) => [
        Number(item.net_revenue),
        Number(item.estimated_profit),
    ]);
    const hasActivity = values.some((value) => value !== 0);
    const chartWidth = 900;
    const top = 18;
    const bottom = 182;
    const minimum = Math.min(0, ...values);
    const maximum = Math.max(1, ...values);
    const range = Math.max(1, maximum - minimum);
    const y = (value: number) =>
        bottom - ((value - minimum) / range) * (bottom - top);
    const points = (key: 'net_revenue' | 'estimated_profit') =>
        data.map((item, index) => ({
            ...item,
            x: data.length > 1 ? (index / (data.length - 1)) * chartWidth : 0,
            y: y(Number(item[key])),
        }));
    const revenuePoints = points('net_revenue');
    const profitPoints = points('estimated_profit');
    const path = (items: ReturnType<typeof points>) =>
        items
            .map(
                (item, index) =>
                    `${index === 0 ? 'M' : 'L'} ${item.x.toFixed(2)} ${item.y.toFixed(2)}`,
            )
            .join(' ');

    return (
        <article className="overflow-hidden rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
                        Tren Kinerja
                    </p>
                    <h2 className="mt-1 text-lg font-black tracking-[-0.03em] sm:text-xl">
                        Penjualan dan estimasi laba
                    </h2>
                    <p className="mt-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                        {period}
                    </p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--muted-foreground)] sm:text-xs">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[var(--app-primary)]" />
                        Penjualan
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[#c1714d]" />
                        Estimasi laba
                    </span>
                </div>
            </div>

            {hasActivity ? (
                <>
                    <div className="mt-4 h-48 w-full sm:h-56">
                        <svg
                            viewBox={`0 0 ${chartWidth} 210`}
                            preserveAspectRatio="none"
                            className="h-full w-full overflow-visible"
                            role="img"
                            aria-label="Grafik penjualan bersih dan estimasi laba"
                        >
                            {[top, (top + bottom) / 2, bottom].map((lineY) => (
                                <line
                                    key={lineY}
                                    x1="0"
                                    x2={chartWidth}
                                    y1={lineY}
                                    y2={lineY}
                                    stroke="var(--app-soft-strong)"
                                    strokeDasharray="5 8"
                                />
                            ))}
                            {minimum < 0 && (
                                <line
                                    x1="0"
                                    x2={chartWidth}
                                    y1={y(0)}
                                    y2={y(0)}
                                    stroke="var(--muted-foreground)"
                                    strokeWidth="1.5"
                                />
                            )}
                            <path
                                d={path(revenuePoints)}
                                fill="none"
                                stroke="var(--app-primary)"
                                strokeWidth="4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                            <path
                                d={path(profitPoints)}
                                fill="none"
                                stroke="#c1714d"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                            {data.length <= 31 &&
                                revenuePoints.map((point) => (
                                    <circle
                                        key={point.date}
                                        cx={point.x}
                                        cy={point.y}
                                        r="3.5"
                                        fill="#fff"
                                        stroke="var(--app-primary)"
                                        strokeWidth="2.5"
                                        vectorEffect="non-scaling-stroke"
                                    >
                                        <title>{`${dateLabel(point.date)}: penjualan ${money(point.net_revenue)}, estimasi laba ${money(point.estimated_profit)}`}</title>
                                    </circle>
                                ))}
                        </svg>
                    </div>
                    <div className="mt-[-0.5rem] flex justify-between text-[10px] font-bold text-[var(--muted-foreground)] sm:text-[11px]">
                        <span>{data[0] ? dateLabel(data[0].date) : '-'}</span>
                        <span>
                            {data.length
                                ? dateLabel(
                                      data[Math.floor(data.length / 2)].date,
                                  )
                                : '-'}
                        </span>
                        <span>
                            {data.at(-1) ? dateLabel(data.at(-1)!.date) : '-'}
                        </span>
                    </div>
                </>
            ) : (
                <div className="mt-4 flex min-h-40 flex-col items-center justify-center rounded-xl bg-[#fff3ef] px-4 text-center">
                    <LineChart className="size-6 text-[var(--muted-foreground)]" />
                    <p className="mt-2 text-sm font-bold text-[var(--muted-foreground)]">
                        Belum ada transaksi pada periode ini
                    </p>
                </div>
            )}
        </article>
    );
}

function ProductPerformance({ products }: { products: Product[] }) {
    return (
        <article className="overflow-hidden rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--app-ink)]/8 px-4 py-4 sm:px-5">
                <div>
                    <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">
                        Performa Produk
                    </p>
                    <h2 className="mt-1 text-lg font-black tracking-[-0.03em] sm:text-xl">
                        Produk terlaris
                    </h2>
                </div>
                <span className="rounded-lg bg-[var(--app-soft)] px-2.5 py-1.5 text-[10px] font-black text-[var(--muted-foreground)]">
                    Maks. 20
                </span>
            </div>

            {products.length > 0 ? (
                <>
                    <div className="divide-y divide-[var(--app-ink)]/6 md:hidden">
                        {products.map((item) => (
                            <div key={item.product_name} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 truncate text-sm font-black text-[var(--app-ink)]">
                                        {item.product_name}
                                    </p>
                                    <p className="shrink-0 text-sm font-black text-[var(--app-primary)]">
                                        {money(item.gross_profit)}
                                    </p>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                    <ProductStat
                                        label="Terjual"
                                        value={quantity(item.quantity_sold)}
                                    />
                                    <ProductStat
                                        label="Retur"
                                        value={quantity(item.quantity_returned)}
                                        danger
                                    />
                                    <ProductStat
                                        label="Penjualan"
                                        value={compactMoney(item.net_revenue)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-[#fffaf7] text-[10px] tracking-wide text-[var(--muted-foreground)] uppercase">
                                <tr>
                                    <th className="px-5 py-3">Produk</th>
                                    <th className="px-3 py-3 text-right">
                                        Terjual
                                    </th>
                                    <th className="px-3 py-3 text-right">
                                        Retur
                                    </th>
                                    <th className="px-3 py-3 text-right">
                                        Penjualan Bersih
                                    </th>
                                    <th className="px-3 py-3 text-right">
                                        HPP
                                    </th>
                                    <th className="px-5 py-3 text-right">
                                        Laba Kotor
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--app-ink)]/6">
                                {products.map((item) => (
                                    <tr
                                        key={item.product_name}
                                        className="hover:bg-[#fffdfc]"
                                    >
                                        <td className="px-5 py-3 font-bold text-[var(--app-ink)]">
                                            {item.product_name}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold">
                                            {quantity(item.quantity_sold)}
                                        </td>
                                        <td className="px-3 py-3 text-right font-semibold text-[#a5533b]">
                                            {quantity(item.quantity_returned)}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {money(item.net_revenue)}
                                        </td>
                                        <td className="px-3 py-3 text-right text-[var(--muted-foreground)]">
                                            {money(item.net_cogs)}
                                        </td>
                                        <td className="px-5 py-3 text-right font-black text-[var(--app-primary)]">
                                            {money(item.gross_profit)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <div className="flex min-h-36 flex-col items-center justify-center px-4 text-center">
                    <PackageSearch className="size-6 text-[var(--muted-foreground)]" />
                    <p className="mt-2 text-sm font-bold text-[var(--muted-foreground)]">
                        Belum ada produk terjual pada periode ini
                    </p>
                </div>
            )}
        </article>
    );
}

function ProductStat({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: string;
    danger?: boolean;
}) {
    return (
        <div className="min-w-0 rounded-lg bg-[#fff3ef] px-2.5 py-2">
            <p className="truncate text-[9px] font-bold tracking-wide text-[var(--muted-foreground)] uppercase">
                {label}
            </p>
            <p
                className={`mt-0.5 truncate font-black ${danger ? 'text-[#a5533b]' : 'text-[var(--app-ink)]'}`}
                title={value}
            >
                {value}
            </p>
        </div>
    );
}
