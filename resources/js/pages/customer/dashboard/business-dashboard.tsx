import { Link, router } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Boxes, Clock3, ShoppingCart } from 'lucide-react';
import { AppPage } from '@/components/page/app-page';
import { EmptyState } from '@/components/page/empty-state';
import { MetricItem, MetricStrip } from '@/components/page/metric-strip';
import { PageSection } from '@/components/page/page-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCompactMoney, formatMoney, formatQuantity } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { inventory } from '@/routes/operations';
import { index as posIndex } from '@/routes/pos';
import { index as reportsIndex } from '@/routes/reports';
import { CategoryBreakdown, SalesChart } from './dashboard-charts';
import type { BusinessDashboardProps, PeriodKey, Position, RevenueComparison, TopProduct } from './types';

const periodOptions: Array<{ key: PeriodKey; label: string; description: string }> = [
    { key: 'day', label: 'Daily', description: 'Today' },
    { key: 'month', label: 'Monthly', description: 'This month' },
    { key: 'quarter', label: '3 Month', description: '3 month last' },
    { key: 'semester', label: '6 Month', description: '6 month last' },
    { key: 'year', label: 'Annual', description: '12 month last' },
];

export function BusinessDashboard({
    performance,
    position,
    lowStock,
    transactions,
    salesTrend,
    period,
    comparison,
    categorySales,
    topProducts,
}: BusinessDashboardProps) {
    const activePeriod = periodOptions.find((option) => option.key === period) ?? periodOptions[1];
    const periodLabel = translate(activePeriod.description);

    return (
        <AppPage
            title={translate('Business overview')}
            description={periodLabel}
            icon={BarChart3}
            headerSurface
            actions={
                <>
                    <Select
                        value={period}
                        onValueChange={(value) =>
                            router.get(dashboard.url(), { period: value }, { preserveState: true, preserveScroll: true, replace: true })
                        }
                    >
                        <SelectTrigger className="h-11 w-full min-w-0 rounded-xl bg-background shadow-none sm:min-w-40">
                            <SelectValue placeholder={translate('Select period')} />
                        </SelectTrigger>
                        <SelectContent>
                            {periodOptions.map((option) => (
                                <SelectItem key={option.key} value={option.key}>
                                    {translate(option.label)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button asChild size="touch">
                        <Link href={posIndex.url()}>
                            <ShoppingCart />
                            {translate('Open checkout')}
                        </Link>
                    </Button>
                </>
            }
        >
            <MetricStrip>
                <MetricItem
                    label={translate('Net sales')}
                    value={formatCompactMoney(performance.net_revenue)}
                    detail={<ChangeBadge comparison={comparison} />}
                />
                <MetricItem label={translate('Gross profit')} value={formatCompactMoney(performance.gross_profit)} />
                <MetricItem label={translate('Transactions')} value={String(transactions)} />
                <MetricItem label={translate('Cash & bank')} value={formatCompactMoney(position.cash_balance)} />
            </MetricStrip>

            <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.75fr)]">
                <SalesChart data={salesTrend} periodLabel={periodLabel} />
                <LowStockPanel items={lowStock} />
            </section>

            <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
                <CategoryBreakdown categories={categorySales} />
                <div className="grid gap-5">
                    <BusinessPosition position={position} />
                    <TopProducts products={topProducts} />
                </div>
            </section>
        </AppPage>
    );
}

function ChangeBadge({ comparison }: { comparison: RevenueComparison }) {
    const Icon = comparison.direction === 'up' ? ArrowUpRight : comparison.direction === 'down' ? ArrowDownRight : Clock3;
    const label = comparison.direction === 'up' ? 'Up' : comparison.direction === 'down' ? 'Down' : 'Unchanged';
    const variant = comparison.direction === 'down' ? 'destructive' : comparison.direction === 'flat' ? 'outline' : 'secondary';

    return (
        <Badge variant={variant}>
            <Icon />
            {translate(label)}
            {comparison.percentage !== null && ` ${comparison.percentage}%`}
        </Badge>
    );
}

function BusinessPosition({ position }: { position: Position }) {
    return (
        <PageSection
            title={translate('Business Position')}
            actions={
                <Button asChild variant="ghost" size="sm">
                    <Link href={reportsIndex.url()}>
                        {translate('View report')}
                        <ArrowUpRight />
                    </Link>
                </Button>
            }
            contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
        >
            <PositionRow label="Cash & bank" value={position.cash_balance} />
            <PositionRow label="Inventory value" value={position.inventory_value} />
            <PositionRow label="Supplier debt" value={position.supplier_payable} />
        </PageSection>
    );
}

function PositionRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-border py-3 text-sm last:border-0">
            <span className="text-muted-foreground">{translate(label)}</span>
            <span className="font-medium tabular-nums">{formatMoney(value)}</span>
        </div>
    );
}

function TopProducts({ products }: { products: TopProduct[] }) {
    return (
        <PageSection title={translate('Top 3 Products')} contentClassName="p-4 sm:p-5">
            {products.length === 0 ? (
                <EmptyState icon={Boxes} title={translate('No products sold yet')} />
            ) : (
                <div className="space-y-3">
                    {products.map((product, index) => (
                        <div
                            key={`${product.product_name}-${index}`}
                            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
                        >
                            <Badge variant={index === 0 ? 'secondary' : 'outline'}>{index + 1}</Badge>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{product.product_name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {formatQuantity(product.net_quantity_sold)} {translate('sold')}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">{formatCompactMoney(product.net_revenue)}</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatCompactMoney(product.gross_profit)} {translate('profit')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PageSection>
    );
}

function LowStockPanel({ items }: { items: BusinessDashboardProps['lowStock'] }) {
    return (
        <PageSection
            title={translate('Stock Critical')}
            actions={
                <Button asChild variant="outline" size="sm">
                    <Link href={inventory.url()}>{translate('Manage stock')}</Link>
                </Button>
            }
            contentClassName="p-4 sm:p-5"
        >
            {items.length === 0 ? (
                <EmptyState icon={Boxes} title={translate('Stock levels are safe')} />
            ) : (
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={`${item.product_name}-${index}`} className="flex items-center gap-3 rounded-xl bg-secondary p-3">
                            <Boxes className="size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{item.product_name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {translate('Minimum')} {formatQuantity(item.minimum_quantity)} {item.unit_symbol}
                                </p>
                            </div>
                            <Badge variant="destructive">{formatQuantity(item.quantity)}</Badge>
                        </div>
                    ))}
                </div>
            )}
        </PageSection>
    );
}
