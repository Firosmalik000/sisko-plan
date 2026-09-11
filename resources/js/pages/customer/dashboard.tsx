import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    BarChart3,
    Boxes,
    CircleDollarSign,
    Clock3,
    CreditCard,
    ReceiptText,
    ShoppingCart,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { money, quantity } from '@/components/operations-shell';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCompactMoney, localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';
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
type SalesTrend = {
    date: string;
    net_revenue: string;
    transactions: number;
};
type CategorySale = {
    category_name: string;
    net_revenue: string;
    quantity_sold: string;
};
type TopProduct = {
    product_name: string;
    quantity_sold: string;
    quantity_returned: string;
    net_revenue: string;
    gross_profit: string;
};
type DashboardProps = {
    canViewBusinessPosition: boolean;
    monthLabel?: string;
    performance?: Performance;
    position?: Position;
    lowStock?: LowStock[];
    transactions?: number;
    salesTrend?: SalesTrend[];
    period?: { key: PeriodKey; label: string };
    comparison?: { previous_net_revenue: string };
    categorySales?: CategorySale[];
    topProducts?: TopProduct[];
};

type PeriodKey = 'day' | 'month' | 'quarter' | 'semester' | 'year';

const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: 'day', label: 'Harian' },
    { key: 'month', label: 'Bulanan' },
    { key: 'quarter', label: '3 Bulan' },
    { key: 'semester', label: '6 Bulan' },
    { key: 'year', label: 'Tahunan' },
];

const compactMoney = formatCompactMoney;

export default function Dashboard(props: DashboardProps) {
    const { activeStore } = usePage<{ activeStore: StoreSummary }>().props;

    if (!props.canViewBusinessPosition || !props.performance || !props.position) {
        return <OperationalDashboard activeStore={activeStore} />;
    }

    const {
        performance,
        position,
        monthLabel,
        lowStock = [],
        transactions = 0,
        salesTrend = [],
        period = { key: 'month', label: monthLabel ?? 'Bulan ini' },
        comparison = { previous_net_revenue: '0' },
        categorySales = [],
        topProducts = [],
    } = props;
    const revenueChange = comparisonChange(performance.net_revenue, comparison.previous_net_revenue);

    return (
        <>
            <Head title="Beranda" />
            <main className="min-h-full px-4 py-6 text-foreground sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <PageHeader title={translate('Ringkasan Bisnis')} />

                    <CashflowHighlight period={period} performance={performance} transactions={transactions} change={revenueChange} />

                    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.75fr)]">
                        <SalesChart data={salesTrend} label={translate(period.label)} />
                        <BusinessPosition position={position} />
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
                        <CategoryChart categories={categorySales} />
                        <TopProducts products={topProducts} />
                    </section>

                    <section>
                        <LowStockPanel items={lowStock} />
                    </section>
                </div>
            </main>
        </>
    );
}

function CashflowHighlight({
    period,
    performance,
    transactions,
    change,
}: {
    period: { key: PeriodKey; label: string };
    performance: Performance;
    transactions: number;
    change: { direction: 'up' | 'down' | 'flat'; percentage: number };
}) {
    const cards = [
        {
            label: 'Laba kotor',
            value: compactMoney(performance.gross_profit),
        },
        { label: 'Transaksi', value: String(transactions) },
        {
            label: 'Potensi profit',
            value: compactMoney(performance.estimated_profit),
        },
    ];

    return (
        <section className="overflow-hidden rounded-2xl bg-secondary lg:grid lg:grid-cols-[1.15fr_.85fr] lg:items-stretch">
            <div className="relative overflow-hidden bg-accent p-4 text-[var(--app-ink)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">Uang Masuk</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <ChangeBadge change={change} />
                        <Select
                            value={period.key}
                            onValueChange={(value) =>
                                router.get(
                                    '/dashboard',
                                    { period: value },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    },
                                )
                            }
                        >
                            <SelectTrigger className="h-9 w-[9.5rem] rounded-xl border-[var(--app-ink)]/10 bg-card px-3 text-xs font-bold text-[var(--app-ink)] shadow-none focus:ring-[var(--app-primary)]/20">
                                <SelectValue placeholder="Pilih periode" />
                            </SelectTrigger>
                            <SelectContent>
                                {periodOptions.map((option) => (
                                    <SelectItem key={option.key} value={option.key}>
                                        {translate(option.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <p className="mt-5 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">{money(performance.net_revenue)}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-[var(--muted-foreground)]">
                    <CircleDollarSign className="size-4" />
                    Penjualan bersih
                </div>
            </div>
            <div className="mt-3 grid grid-cols-3 divide-x divide-[var(--app-ink)]/10 rounded-[1.1rem] bg-secondary px-1 py-3 text-[var(--app-ink)] lg:mt-0 lg:items-center lg:px-2">
                {cards.map((card) => (
                    <div key={card.label} className="min-w-0 px-2 text-center sm:px-4 lg:text-left">
                        <p className="truncate text-[9px] font-bold tracking-wide text-[var(--muted-foreground)] uppercase sm:text-[10px]">
                            {translate(card.label)}
                        </p>
                        <p className="mt-1.5 truncate text-sm font-semibold tracking-[-0.035em] sm:text-lg">{card.value}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function ChangeBadge({ change }: { change: { direction: 'up' | 'down' | 'flat'; percentage: number } }) {
    const Icon = change.direction === 'up' ? ArrowUpRight : change.direction === 'down' ? ArrowDownRight : Clock3;
    const label = change.direction === 'up' ? translate('Naik') : change.direction === 'down' ? translate('Turun') : translate('Tetap');

    return (
        <span
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold ${change.direction === 'down' ? 'bg-[#f6e4da] text-[#9b5535]' : 'bg-card text-[var(--app-primary)]'}`}
        >
            <Icon className="size-3" /> {translate(label)} {change.percentage}%
        </span>
    );
}

function SalesChart({ data, label }: { data: SalesTrend[]; label: string }) {
    const values = data.map((item) => Number(item.net_revenue));
    const maxValue = Math.max(...values, 1);
    const chartWidth = 720;
    const top = 18;
    const bottom = 178;
    const usableHeight = bottom - top;
    const points = data.map((item, index) => ({
        ...item,
        x: data.length > 1 ? (index / (data.length - 1)) * chartWidth : 0,
        y: bottom - (Number(item.net_revenue) / maxValue) * usableHeight,
    }));
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    const areaPath = points.length ? `${linePath} L ${chartWidth} ${bottom} L 0 ${bottom} Z` : '';
    const total = values.reduce((sum, value) => sum + value, 0);
    const totalTransactions = data.reduce((sum, item) => sum + item.transactions, 0);

    return (
        <Card className="gap-0 overflow-hidden rounded-2xl border-0 p-4 shadow-none sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">{translate(label)}</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] sm:text-xl">Tren Penjualan</h2>
                </div>
                <div className="text-right">
                    <p className="text-base font-semibold text-[var(--app-primary)] sm:text-lg">{compactMoney(total)}</p>
                    <p className="text-[11px] font-semibold text-[var(--muted-foreground)]">{totalTransactions} transaksi</p>
                </div>
            </div>

            <div className="mt-4 h-52 w-full sm:h-60">
                <svg
                    viewBox={`0 0 ${chartWidth} 214`}
                    preserveAspectRatio="none"
                    className="h-full w-full overflow-visible"
                    role="img"
                    aria-label="Grafik penjualan 14 hari terakhir"
                >
                    <defs>
                        <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--app-primary)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--app-primary)" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>
                    {[top, top + usableHeight / 2, bottom].map((y) => (
                        <line key={y} x1="0" x2={chartWidth} y1={y} y2={y} stroke="var(--app-soft-strong)" strokeDasharray="5 8" />
                    ))}
                    {areaPath && <path d={areaPath} fill="url(#sales-area)" />}
                    {linePath && (
                        <path
                            d={linePath}
                            fill="none"
                            stroke="var(--app-primary)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    )}
                    {points.length <= 31 &&
                        points.map((point) => (
                            <circle
                                key={point.date}
                                cx={point.x}
                                cy={point.y}
                                r="4"
                                fill="var(--card)"
                                stroke="var(--app-primary)"
                                strokeWidth="3"
                                vectorEffect="non-scaling-stroke"
                            >
                                <title>{`${dateLabel(point.date)}: ${money(point.net_revenue)} (${point.transactions} ${translate('transaksi')})`}</title>
                            </circle>
                        ))}
                </svg>
            </div>
            <div className="mt-[-1rem] flex justify-between text-[10px] font-bold text-[var(--muted-foreground)] sm:text-[11px]">
                <span>{data[0] ? dateLabel(data[0].date) : '-'}</span>
                <span>{data.length ? dateLabel(data[Math.floor(data.length / 2)].date) : '-'}</span>
                <span>{data.at(-1) ? dateLabel(data.at(-1)!.date) : '-'}</span>
            </div>
        </Card>
    );
}

function BusinessPosition({ position }: { position: Position }) {
    return (
        <Card className="gap-0 rounded-2xl border-0 p-4 shadow-none sm:p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">Operasional Terkini</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Posisi Usaha</h2>
                </div>
                <BarChart3 className="size-5 text-[var(--app-primary)]" />
            </div>
            <div className="mt-5 space-y-1">
                <PositionRow label="Kas & bank" value={position.cash_balance} />
                <PositionRow label="Nilai persediaan" value={position.inventory_value} />
                <PositionRow label="Utang supplier" value={position.supplier_payable} />
            </div>
            <div className="mt-4 rounded-2xl bg-[var(--app-soft)] p-4">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-[var(--muted-foreground)]">Stok kritis</span>
                    <span className="text-lg font-semibold tracking-[-0.04em] text-[var(--app-ink)]">
                        {position.low_stock_count} {translate('produk')}
                    </span>
                </div>
            </div>
            <Link
                href="/reports"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[var(--app-primary)]/12 px-4 py-2.5 text-xs font-bold text-[var(--app-primary)] transition hover:bg-[var(--app-soft)]"
            >
                Laporan lengkap <ArrowUpRight className="size-3.5" />
            </Link>
        </Card>
    );
}

function PositionRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-[var(--app-ink)]/6 py-2.5 text-xs">
            <span className="font-semibold text-[var(--muted-foreground)]">{translate(label)}</span>
            <span className="font-semibold text-[var(--app-ink)]">{money(value)}</span>
        </div>
    );
}

function CategoryChart({ categories }: { categories: CategorySale[] }) {
    const colors = [
        'var(--app-primary)',
        'var(--workspace-500)',
        'var(--workspace-400)',
        'var(--workspace-300)',
        'var(--workspace-200)',
        '#c47a4b',
    ];
    const total = categories.reduce((sum, item) => sum + Math.max(0, Number(item.net_revenue)), 0);
    let progress = 0;
    const stops = categories.map((item, index) => {
        const start = progress;
        progress += total > 0 ? (Math.max(0, Number(item.net_revenue)) / total) * 100 : 0;

        return `${colors[index % colors.length]} ${start}% ${progress}%`;
    });
    const background = total > 0 ? `conic-gradient(${stops.join(',')})` : 'var(--app-soft)';

    return (
        <Card className="gap-0 rounded-2xl border-0 p-4 shadow-none sm:p-6">
            <div>
                <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">Penjualan per Kategori</p>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Komposisi Kategori</h2>
            </div>
            <div className="mt-5 grid gap-6 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
                <div
                    className="relative mx-auto size-40 rounded-full"
                    style={{ background }}
                    role="img"
                    aria-label="Diagram penjualan per kategori"
                >
                    <div className="absolute inset-[1.15rem] flex flex-col items-center justify-center rounded-full bg-card text-center shadow-inner">
                        <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase">Total</span>
                        <span className="mt-1 text-lg font-semibold tracking-[-0.04em]">{compactMoney(total)}</span>
                    </div>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {categories.map((category, index) => (
                        <div
                            key={category.category_name}
                            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary px-3 py-2.5"
                        >
                            <span
                                className="size-2.5 rounded-full"
                                style={{
                                    backgroundColor: colors[index % colors.length],
                                }}
                            />
                            <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{category.category_name}</p>
                                <p className="text-[10px] font-semibold text-[var(--muted-foreground)]">
                                    {quantity(category.quantity_sold)} item
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold">{compactMoney(category.net_revenue)}</p>
                                <p className="text-[10px] font-bold text-[var(--muted-foreground)]">
                                    {total > 0 ? Math.round((Number(category.net_revenue) / total) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                    ))}
                    {categories.length === 0 && <EmptyState icon={BarChart3} label="Belum ada penjualan kategori" />}
                </div>
            </div>
        </Card>
    );
}

function TopProducts({ products }: { products: TopProduct[] }) {
    return (
        <Card className="gap-0 rounded-2xl border-0 p-4 shadow-none sm:p-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">Produk Terlaris</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Top 3 Produk</h2>
                </div>
                <Boxes className="size-5 text-[var(--app-primary)]" />
            </div>
            <div className="mt-5 space-y-3">
                {products.map((product, index) => (
                    <div
                        key={`${product.product_name}-${index}`}
                        className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-[var(--app-ink)]/6 p-3"
                    >
                        <span
                            className={`flex size-9 items-center justify-center rounded-xl text-sm font-semibold ${index === 0 ? 'bg-[var(--app-primary)] text-[var(--app-primary-foreground)]' : 'bg-[var(--app-soft)] text-[var(--app-primary)]'}`}
                        >
                            {index + 1}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{product.product_name}</p>
                            <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--muted-foreground)]">
                                {quantity(Number(product.quantity_sold) - Number(product.quantity_returned))} terjual
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-semibold">{compactMoney(product.net_revenue)}</p>
                            <p className="mt-0.5 text-[10px] font-bold text-[var(--app-primary)]">
                                {compactMoney(product.gross_profit)} laba
                            </p>
                        </div>
                    </div>
                ))}
                {products.length === 0 && <EmptyState icon={Boxes} label="Belum ada produk terjual" />}
            </div>
        </Card>
    );
}

function LowStockPanel({ items }: { items: LowStock[] }) {
    return (
        <Card className="gap-0 rounded-2xl border-0 p-4 shadow-none sm:p-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--muted-foreground)] uppercase">Persediaan</p>
                    <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Stok Kritis</h2>
                </div>
                <AlertTriangle className="size-5 text-[#c56d3e]" />
            </div>
            <div className="mt-4 space-y-2">
                {items.map((item, index) => (
                    <div key={`${item.product_name}-${index}`} className="flex items-center gap-3 rounded-2xl bg-secondary p-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-[#a75d39] shadow-sm">
                            <Boxes className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{item.product_name}</p>
                            <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--muted-foreground)]">
                                Min. {quantity(item.minimum_quantity)} {item.unit_symbol}
                            </p>
                        </div>
                        <span className="rounded-lg bg-[#f7e8de] px-2 py-1 text-xs font-semibold text-[#9b5535]">
                            {quantity(item.quantity)}
                        </span>
                    </div>
                ))}
                {items.length === 0 && <EmptyState icon={Boxes} label="Stok dalam kondisi aman" />}
            </div>
            <Link
                href="/operations/inventory"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 py-2.5 text-xs font-bold text-[var(--app-primary-foreground)] transition hover:bg-[var(--workspace-700)]"
            >
                Kelola stok <ArrowUpRight className="size-3.5" />
            </Link>
        </Card>
    );
}

function OperationalDashboard({ activeStore }: { activeStore: StoreSummary }) {
    const shortcuts = [
        { href: '/pos', label: 'Buka Kasir', icon: ShoppingCart },
        { href: '/sales', label: 'Penjualan', icon: ReceiptText },
        { href: '/operations/inventory', label: 'Persediaan', icon: Boxes },
        { href: '/operations/cash', label: 'Kas & Bank', icon: CreditCard },
    ];

    return (
        <>
            <Head title="Beranda" />
            <main className="min-h-full px-4 py-6 text-foreground sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <PageHeader
                        title={activeStore.name}
                        actions={
                            <Link
                                href="/pos"
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                            >
                                {translate('Transaksi baru')} <ArrowUpRight className="size-4" />
                            </Link>
                        }
                    />
                    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {shortcuts.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-2xl bg-card p-4 transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--app-soft-strong)] text-[var(--app-primary)]">
                                    <item.icon className="size-4" />
                                </span>
                                <p className="mt-5 text-sm font-semibold">{translate(item.label)}</p>
                            </Link>
                        ))}
                    </section>
                </div>
            </main>
        </>
    );
}

function EmptyState({ icon: Icon, label }: { icon: IconType; label: string }) {
    return (
        <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-ink)]/12 text-center">
            <Icon className="size-5 text-[var(--muted-foreground)]" />
            <p className="mt-2 text-xs font-bold text-[var(--muted-foreground)]">{translate(label)}</p>
        </div>
    );
}

function comparisonChange(current: string, previous: string) {
    const currentValue = Number(current);
    const previousValue = Number(previous);
    const difference = currentValue - previousValue;
    const percentage =
        previousValue === 0 ? (currentValue === 0 ? 0 : 100) : Math.round((Math.abs(difference) / Math.abs(previousValue)) * 100);

    return {
        direction: difference > 0 ? ('up' as const) : difference < 0 ? ('down' as const) : ('flat' as const),
        percentage,
    };
}

function dateLabel(value: string) {
    return new Intl.DateTimeFormat(localeTag(), {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
}

type IconType = ComponentType<SVGProps<SVGSVGElement>>;
