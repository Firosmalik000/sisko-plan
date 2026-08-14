import { Head, Link, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Boxes,
    CircleDollarSign,
    HandCoins,
    ReceiptText,
    ShoppingCart,
    TrendingUp,
} from 'lucide-react';
import { money, quantity } from '@/components/operations-shell';
import type { StoreSummary } from '@/types';

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
type LowStock = {
    product_name: string;
    unit_symbol: string;
    quantity: string;
    minimum_quantity: string;
};

export default function Dashboard({
    canViewBusinessPosition,
    monthLabel,
    performance,
    position,
    lowStock,
}: {
    canViewBusinessPosition: boolean;
    monthLabel?: string;
    performance?: Performance;
    position?: Position;
    lowStock?: LowStock[];
}) {
    const { activeStore } = usePage<{ activeStore: StoreSummary }>().props;

    if (!canViewBusinessPosition || !performance || !position) {
        return (
            <>
                <Head title="Dashboard" />
                <main className="min-h-full bg-[#f6f7f2] p-4 md:p-8">
                    <section className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-[#173f35] px-6 py-9 text-white md:px-10 md:py-12">
                        <p className="text-xs font-bold tracking-[0.24em] text-emerald-200 uppercase">
                            Toko aktif
                        </p>
                        <h1 className="mt-3 font-serif text-4xl md:text-5xl">
                            {activeStore.name}
                        </h1>
                        <p className="mt-4 max-w-xl text-emerald-50/75">
                            Siap melayani transaksi. Ringkasan biaya, HPP, dan
                            laba hanya tersedia untuk owner atau admin toko.
                        </p>
                        <Link
                            href="/pos"
                            className="mt-7 inline-flex items-center gap-2 rounded-full bg-amber-300 px-5 py-3 font-bold text-stone-950"
                        >
                            Buka kasir <ArrowRight className="size-4" />
                        </Link>
                    </section>
                </main>
            </>
        );
    }

    const positive = Number(performance.estimated_profit) >= 0;

    return (
        <>
            <Head title="Dashboard" />
            <main className="min-h-full bg-[radial-gradient(circle_at_82%_4%,rgba(245,158,11,.15),transparent_28%),linear-gradient(140deg,#fffdf7,#f2f8f4_58%,#edf8f4)] p-4 md:p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <section className="relative overflow-hidden rounded-[2rem] bg-[#123a34] px-6 py-8 text-white shadow-xl shadow-emerald-950/15 md:px-10 md:py-10">
                        <div className="absolute top-0 right-0 h-full w-2/5 bg-[linear-gradient(135deg,transparent,rgba(251,191,36,.16))]" />
                        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div>
                                <p className="text-xs font-bold tracking-[0.24em] text-amber-300 uppercase">
                                    Posisi usaha / {monthLabel}
                                </p>
                                <h1 className="mt-3 font-serif text-4xl tracking-tight md:text-6xl">
                                    {activeStore.name}
                                </h1>
                                <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50/75 md:text-base">
                                    Angka operasional dari transaksi posted,
                                    bukan laporan akuntansi audited. Gunakan ini
                                    untuk membaca arah usaha dengan cepat.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href="/expenses"
                                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                                >
                                    Catat biaya
                                </Link>
                                <Link
                                    href="/reports"
                                    className="rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-stone-950"
                                >
                                    Buka laporan
                                </Link>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            icon={CircleDollarSign}
                            label="Saldo Kas dan Bank"
                            value={money(position.cash_balance)}
                            tone="teal"
                        />
                        <MetricCard
                            icon={Boxes}
                            label="Nilai Persediaan"
                            value={money(position.inventory_value)}
                            tone="amber"
                        />
                        <MetricCard
                            icon={HandCoins}
                            label="Utang Supplier"
                            value={money(position.supplier_payable)}
                            tone="rose"
                        />
                        <MetricCard
                            icon={AlertTriangle}
                            label="Produk Stok Menipis"
                            value={`${position.low_stock_count} produk`}
                            tone="stone"
                        />
                    </section>

                    <section className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
                        <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm md:p-8">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold tracking-[0.2em] text-teal-700 uppercase">
                                        Performa bulan berjalan
                                    </p>
                                    <h2 className="mt-1 font-serif text-3xl">
                                        Dari omzet menuju laba usaha
                                    </h2>
                                </div>
                                <TrendingUp className="size-6 text-teal-700" />
                            </div>
                            <div className="mt-7 space-y-4">
                                <ResultRow
                                    label="Penjualan bersih"
                                    value={performance.net_revenue}
                                />
                                <ResultRow
                                    label="HPP bersih"
                                    value={performance.net_cogs}
                                    negative
                                />
                                <ResultRow
                                    label="Laba kotor"
                                    value={performance.gross_profit}
                                    strong
                                />
                                <ResultRow
                                    label="Biaya toko"
                                    value={performance.expenses}
                                    negative
                                />
                                <div
                                    className={`mt-2 rounded-2xl p-5 ${positive ? 'bg-emerald-950 text-white' : 'bg-rose-950 text-white'}`}
                                >
                                    <p className="text-xs font-bold tracking-[0.18em] uppercase opacity-70">
                                        Estimasi Laba Usaha
                                    </p>
                                    <p className="mt-2 font-serif text-4xl">
                                        {money(performance.estimated_profit)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-stone-200 bg-white/90 p-6 shadow-sm md:p-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold tracking-[0.2em] text-amber-700 uppercase">
                                        Perlu perhatian
                                    </p>
                                    <h2 className="mt-1 font-serif text-3xl">
                                        Stok menipis
                                    </h2>
                                </div>
                                <Boxes className="size-6 text-amber-700" />
                            </div>
                            <div className="mt-6 space-y-3">
                                {(lowStock ?? []).map((item) => (
                                    <div
                                        key={item.product_name}
                                        className="flex items-center justify-between gap-4 rounded-2xl bg-stone-50 p-4"
                                    >
                                        <div>
                                            <p className="font-semibold">
                                                {item.product_name}
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                Batas{' '}
                                                {quantity(
                                                    item.minimum_quantity,
                                                )}{' '}
                                                {item.unit_symbol}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-900">
                                            {quantity(item.quantity)}
                                        </span>
                                    </div>
                                ))}
                                {(lowStock ?? []).length === 0 && (
                                    <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-stone-500">
                                        Tidak ada produk di bawah batas minimum.
                                    </p>
                                )}
                            </div>
                            <Link
                                href="/operations/inventory"
                                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-800"
                            >
                                Lihat persediaan{' '}
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    </section>

                    <section className="grid gap-3 sm:grid-cols-3">
                        <QuickLink
                            href="/pos"
                            icon={ShoppingCart}
                            title="Buka POS"
                            description="Mulai transaksi penjualan"
                        />
                        <QuickLink
                            href="/sales"
                            icon={ReceiptText}
                            title="Riwayat Penjualan"
                            description="Periksa dokumen dan retur"
                        />
                        <QuickLink
                            href="/expenses"
                            icon={CircleDollarSign}
                            title="Biaya Toko"
                            description="Posting pengeluaran operasional"
                        />
                    </section>
                </div>
            </main>
        </>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Boxes;
    label: string;
    value: string;
    tone: 'teal' | 'amber' | 'rose' | 'stone';
}) {
    const colors = {
        teal: 'bg-teal-100 text-teal-800',
        amber: 'bg-amber-100 text-amber-800',
        rose: 'bg-rose-100 text-rose-800',
        stone: 'bg-stone-200 text-stone-700',
    };

    return (
        <div className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm">
            <div className={`w-fit rounded-2xl p-3 ${colors[tone]}`}>
                <Icon className="size-5" />
            </div>
            <p className="mt-5 text-sm font-medium text-stone-500">{label}</p>
            <p className="mt-1 font-serif text-2xl text-stone-950">{value}</p>
        </div>
    );
}

function ResultRow({
    label,
    value,
    negative = false,
    strong = false,
}: {
    label: string;
    value: string;
    negative?: boolean;
    strong?: boolean;
}) {
    return (
        <div
            className={`flex items-center justify-between gap-4 border-b border-stone-100 pb-4 ${strong ? 'font-bold' : ''}`}
        >
            <span className="text-stone-600">{label}</span>
            <span className={negative ? 'text-rose-700' : 'text-stone-950'}>
                {negative ? '- ' : ''}
                {money(value)}
            </span>
        </div>
    );
}

function QuickLink({
    href,
    icon: Icon,
    title,
    description,
}: {
    href: string;
    icon: typeof Boxes;
    title: string;
    description: string;
}) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white/75 p-4 transition hover:-translate-y-0.5 hover:bg-white"
        >
            <div className="rounded-xl bg-stone-950 p-3 text-white">
                <Icon className="size-5" />
            </div>
            <div>
                <p className="font-bold">{title}</p>
                <p className="text-xs text-stone-500">{description}</p>
            </div>
            <ArrowRight className="ml-auto size-4 transition group-hover:translate-x-1" />
        </Link>
    );
}
