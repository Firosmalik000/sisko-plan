import { Link, router } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Boxes, Clock3, Globe, ShoppingCart, Store } from 'lucide-react';
import { AppPage } from '@/components/page/app-page';
import { EmptyState } from '@/components/page/empty-state';
import { MetricItem, MetricStrip } from '@/components/page/metric-strip';
import { PageSection } from '@/components/page/page-section';
import { PromotionCarousel } from '@/components/promotion-carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCompactMoney, formatMoney, formatQuantity } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { inventory } from '@/routes/operations';
import { index as posIndex } from '@/routes/pos';
import { index as reportsIndex } from '@/routes/reports';
import { index as salesIndex } from '@/routes/sales';
import { CategoryBreakdown, SalesChart } from './dashboard-charts';
import type { BusinessDashboardProps, ChannelMetric, ChannelsData, PeriodKey, Position, RevenueComparison, TopProduct } from './types';

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
    channels,
    lowStock,
    transactions,
    salesTrend,
    period,
    comparison,
    categorySales,
    topProducts,
    promotions,
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
            <PromotionCarousel promotions={promotions} />
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

            {channels && (
                <section className="grid items-stretch gap-5 md:grid-cols-2">
                    <InStoreChannelCard channel={channels.in_store} />
                    <MarketplaceChannelCard channel={channels.marketplace} />
                </section>
            )}

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

function InStoreChannelCard({ channel }: { channel: ChannelMetric }) {
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(100, Math.max(0, channel.share_percentage)) / 100) * circumference;

    return (
        <PageSection
            title={
                <span className="flex items-center gap-2">
                    <Store className="size-4 text-primary" />
                    {translate('In-store sales')}
                </span>
            }
            actions={
                <Button asChild variant="ghost" size="sm">
                    <Link href={salesIndex.url({ query: { sales_channel: 'in_store' } })}>
                        {translate('Sales')}
                        <ArrowUpRight className="size-4" />
                    </Link>
                </Button>
            }
            contentClassName="p-5"
        >
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div className="space-y-3">
                    <div>
                        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{translate('Net sales')}</span>
                        <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {formatCompactMoney(channel.net_revenue)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                            {channel.transactions} {translate('transactions')}
                        </span>
                        <span>•</span>
                        <span>
                            {translate('Average order')}:{' '}
                            <strong className="font-medium text-foreground">{formatCompactMoney(channel.aov)}</strong>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-center sm:self-auto">
                    <div className="relative flex size-24 shrink-0 items-center justify-center">
                        <svg className="size-full -rotate-90" viewBox="0 0 88 88" aria-hidden="true">
                            <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--secondary)" strokeWidth="7" />
                            <circle
                                cx="44"
                                cy="44"
                                r={radius}
                                fill="none"
                                stroke="var(--primary)"
                                strokeWidth="7"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-lg leading-none font-bold text-foreground tabular-nums">{channel.share_percentage}%</span>
                            <span className="mt-0.5 text-[9px] font-medium tracking-tight text-muted-foreground">
                                {translate('Contribution')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </PageSection>
    );
}

function MarketplaceChannelCard({ channel }: { channel: ChannelsData['marketplace'] }) {
    const hasPlatforms = channel.platforms.length > 0;

    return (
        <PageSection
            title={
                <span className="flex items-center gap-2">
                    <Globe className="size-4 text-primary" />
                    {translate('Marketplace sales')}
                </span>
            }
            actions={
                <Button asChild variant="ghost" size="sm">
                    <Link href={salesIndex.url({ query: { sales_channel: 'marketplace' } })}>
                        {translate('Sales')}
                        <ArrowUpRight className="size-4" />
                    </Link>
                </Button>
            }
            contentClassName="p-5"
        >
            <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                    <div>
                        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{translate('Net sales')}</span>
                        <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                            {formatCompactMoney(channel.net_revenue)}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="font-semibold">
                            {channel.share_percentage}% {translate('Contribution')}
                        </Badge>
                        <span>
                            {channel.transactions} {translate('orders')}
                        </span>
                        <span>•</span>
                        <span>
                            {translate('Average order')}:{' '}
                            <strong className="font-medium text-foreground">{formatCompactMoney(channel.aov)}</strong>
                        </span>
                    </div>
                </div>

                {hasPlatforms ? (
                    <div className="space-y-2.5 pt-1">
                        <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary">
                            {channel.platforms.map((platform, idx) => {
                                const palette = ['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
                                const barColor = palette[idx % palette.length] || 'bg-primary';

                                return (
                                    <div
                                        key={platform.code}
                                        style={{ width: `${Math.max(4, platform.share_percentage)}%` }}
                                        className={`h-full ${barColor} transition-all duration-500`}
                                        title={`${platform.label}: ${platform.share_percentage}%`}
                                    />
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                            {channel.platforms.slice(0, 4).map((platform, idx) => {
                                const palette = ['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
                                const dotColor = palette[idx % palette.length] || 'bg-primary';

                                return (
                                    <div
                                        key={platform.code}
                                        className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-2.5 py-1.5 text-xs"
                                    >
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className={`size-2 shrink-0 rounded-full ${dotColor}`} />
                                            <span className="truncate font-medium">{platform.label}</span>
                                            <span className="text-[11px] text-muted-foreground">({platform.transactions})</span>
                                        </div>
                                        <span className="shrink-0 font-semibold tabular-nums">
                                            {formatCompactMoney(platform.net_revenue)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-border py-4 text-center">
                        <p className="text-xs text-muted-foreground">{translate('No marketplace sales yet')}</p>
                    </div>
                )}
            </div>
        </PageSection>
    );
}
