import { router } from '@inertiajs/react';
import { BarChart3, LineChart, PackageSearch } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { FormInput } from '@/components/forms';
import { AppPage } from '@/components/page/app-page';
import { EmptyState } from '@/components/page/empty-state';
import { MetricItem, MetricStrip } from '@/components/page/metric-strip';
import { PageSection } from '@/components/page/page-section';
import { Button } from '@/components/ui/button';
import { formatCompactMoney, formatMoney as money, formatQuantity as quantity, localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import reports from '@/routes/reports';

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
        router.get(reports.index.url(), { start_date: startDate, end_date: endDate }, { preserveState: true, replace: true });
    };
    const selectedPeriod = `${dateLabel(period.start_date)} – ${dateLabel(period.end_date, true)}`;

    return (
        <AppPage
            title={translate('Reports usaha')}
            description={selectedPeriod}
            icon={BarChart3}
            size="wide"
            headerSurface
            actions={
                <form onSubmit={submit} className="col-span-full grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[10rem_10rem_auto]">
                    <FormInput
                        id="report-start-date"
                        name="start_date"
                        label={translate('Start')}
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                    />
                    <FormInput
                        id="report-end-date"
                        name="end_date"
                        label={translate('To')}
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                    />
                    <Button type="submit" size="touch" className="col-span-2 self-end sm:col-span-1">
                        {translate('Show')}
                    </Button>
                </form>
            }
        >
            <MetricStrip className="[&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
                <MetricItem label={translate('Net sales')} value={compactMoney(performance.net_revenue)} />
                <MetricItem label={translate('HPP clean')} value={compactMoney(performance.net_cogs)} />
                <MetricItem label={translate('Gross profit')} value={compactMoney(performance.gross_profit)} />
                <MetricItem label={translate('Expense store')} value={compactMoney(performance.expenses)} />
                <MetricItem label={translate('Estimated profit usaha')} value={compactMoney(performance.estimated_profit)} />
            </MetricStrip>

            <PageSection title={translate('Business position')}>
                <MetricStrip className="rounded-none bg-card">
                    <MetricItem label={translate('Cash & bank')} value={compactMoney(position.cash_balance)} />
                    <MetricItem label={translate('Inventory value')} value={compactMoney(position.inventory_value)} />
                    <MetricItem label={translate('Supplier debt')} value={compactMoney(position.supplier_payable)} />
                    <MetricItem label={translate('Stock running low')} value={`${position.low_stock_count} ${translate('products')}`} />
                </MetricStrip>
            </PageSection>

            <TrendChart data={daily} period={selectedPeriod} />
            <ProductPerformance products={products} />
        </AppPage>
    );
}

function TrendChart({ data, period }: { data: Daily[]; period: string }) {
    const values = data.flatMap((item) => [Number(item.net_revenue), Number(item.estimated_profit)]);
    const hasActivity = values.some((value) => value !== 0);
    const chartWidth = 900;
    const top = 18;
    const bottom = 182;
    const minimum = Math.min(0, ...values);
    const maximum = Math.max(1, ...values);
    const range = Math.max(1, maximum - minimum);
    const y = (value: number) => bottom - ((value - minimum) / range) * (bottom - top);
    const points = (key: 'net_revenue' | 'estimated_profit') =>
        data.map((item, index) => ({
            ...item,
            x: data.length > 1 ? (index / (data.length - 1)) * chartWidth : 0,
            y: y(Number(item[key])),
        }));
    const revenuePoints = points('net_revenue');
    const profitPoints = points('estimated_profit');
    const path = (items: ReturnType<typeof points>) =>
        items.map((item, index) => `${index === 0 ? 'M' : 'L'} ${item.x.toFixed(2)} ${item.y.toFixed(2)}`).join(' ');

    return (
        <PageSection
            title={translate('Sales and estimated profit')}
            description={period}
            actions={
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-primary" />
                        {translate('Sales')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-muted-foreground" />
                        {translate('Estimated profit')}
                    </span>
                </div>
            }
            contentClassName="p-4 sm:p-5"
        >
            {hasActivity ? (
                <>
                    <div className="mt-4 h-48 w-full sm:h-56">
                        <svg
                            viewBox={`0 0 ${chartWidth} 210`}
                            preserveAspectRatio="none"
                            className="h-full w-full overflow-visible"
                            role="img"
                            aria-label="Net sales and estimated profit chart"
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
                                <line x1="0" x2={chartWidth} y1={y(0)} y2={y(0)} stroke="var(--muted-foreground)" strokeWidth="1.5" />
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
                                stroke="var(--muted-foreground)"
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
                                        <title>{`${dateLabel(point.date)}: ${translate('sales')} ${money(point.net_revenue)}, ${translate('estimated profit')} ${money(point.estimated_profit)}`}</title>
                                    </circle>
                                ))}
                        </svg>
                    </div>
                    <div className="mt-[-0.5rem] flex justify-between text-xs font-semibold text-muted-foreground">
                        <span>{data[0] ? dateLabel(data[0].date) : '-'}</span>
                        <span>{data.length ? dateLabel(data[Math.floor(data.length / 2)].date) : '-'}</span>
                        <span>{data.at(-1) ? dateLabel(data.at(-1)!.date) : '-'}</span>
                    </div>
                </>
            ) : (
                <EmptyState icon={LineChart} title={translate('No transactions in this period')} />
            )}
        </PageSection>
    );
}

function ProductPerformance({ products }: { products: Product[] }) {
    return (
        <PageSection title={translate('Best-selling products')} description={translate('Maks. 20 product')}>
            {products.length > 0 ? (
                <>
                    <div className="divide-y divide-[var(--app-ink)]/6 md:hidden">
                        {products.map((item) => (
                            <div key={item.product_name} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="min-w-0 truncate text-sm font-black text-[var(--app-ink)]">{item.product_name}</p>
                                    <p className="shrink-0 text-sm font-black text-[var(--app-primary)]">{money(item.gross_profit)}</p>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                    <ProductStat label="Sold" value={quantity(item.quantity_sold)} />
                                    <ProductStat label="Return" value={quantity(item.quantity_returned)} danger />
                                    <ProductStat label="Sales" value={compactMoney(item.net_revenue)} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="bg-secondary/45 text-xs font-semibold text-muted-foreground">
                                <tr>
                                    <th className="px-5 py-3">Product</th>
                                    <th className="px-3 py-3 text-right">Sold</th>
                                    <th className="px-3 py-3 text-right">Return</th>
                                    <th className="px-3 py-3 text-right">Net Sales</th>
                                    <th className="px-3 py-3 text-right">HPP</th>
                                    <th className="px-5 py-3 text-right">Profit Gross</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--app-ink)]/6">
                                {products.map((item) => (
                                    <tr key={item.product_name} className="hover:bg-accent/30">
                                        <td className="px-5 py-3 font-bold text-[var(--app-ink)]">{item.product_name}</td>
                                        <td className="px-3 py-3 text-right font-semibold">{quantity(item.quantity_sold)}</td>
                                        <td className="px-3 py-3 text-right font-semibold text-destructive">
                                            {quantity(item.quantity_returned)}
                                        </td>
                                        <td className="px-3 py-3 text-right">{money(item.net_revenue)}</td>
                                        <td className="px-3 py-3 text-right text-[var(--muted-foreground)]">{money(item.net_cogs)}</td>
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
                <EmptyState icon={PackageSearch} title={translate('No products were sold in this period')} />
            )}
        </PageSection>
    );
}

function ProductStat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
    return (
        <div className="min-w-0 rounded-lg bg-secondary px-2.5 py-2">
            <p className="truncate text-xs font-medium text-muted-foreground">{translate(label)}</p>
            <p className={`mt-0.5 truncate font-black ${danger ? 'text-destructive' : 'text-foreground'}`} title={value}>
                {value}
            </p>
        </div>
    );
}
