import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/page/empty-state';
import { PageSection } from '@/components/page/page-section';
import { formatCompactMoney, formatMoney, formatQuantity, localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import type { CategorySale, SalesTrend } from './types';

export function SalesChart({ data, periodLabel }: { data: SalesTrend[]; periodLabel: string }) {
    const values = data.map((item) => Number(item.net_revenue));
    const maxValue = Math.max(...values, 1);
    const chartWidth = 720;
    const top = 18;
    const bottom = 178;
    const points = data.map((item, index) => ({
        ...item,
        x: data.length > 1 ? (index / (data.length - 1)) * chartWidth : 0,
        y: bottom - (Number(item.net_revenue) / maxValue) * (bottom - top),
    }));
    const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    const total = values.reduce((sum, value) => sum + value, 0);
    const transactions = data.reduce((sum, item) => sum + item.transactions, 0);

    return (
        <PageSection
            title={translate('Tren Penjualan')}
            description={periodLabel}
            actions={
                <div className="text-right">
                    <p className="text-base font-semibold text-foreground sm:text-lg">{formatCompactMoney(total)}</p>
                    <p className="text-xs text-muted-foreground">
                        {transactions} {translate('transaksi')}
                    </p>
                </div>
            }
            contentClassName="px-4 pb-4 sm:px-6 sm:pb-6"
        >
            {data.length === 0 ? (
                <EmptyState icon={BarChart3} title={translate('Belum ada transaksi pada periode ini')} />
            ) : (
                <>
                    <div className="h-48 w-full sm:h-56">
                        <svg
                            viewBox={`0 0 ${chartWidth} 214`}
                            preserveAspectRatio="none"
                            className="h-full w-full overflow-visible"
                            role="img"
                            aria-label={`${translate('Tren Penjualan')} — ${periodLabel}`}
                        >
                            {[top, (top + bottom) / 2, bottom].map((y) => (
                                <line key={y} x1="0" x2={chartWidth} y1={y} y2={y} stroke="var(--border)" strokeDasharray="5 8" />
                            ))}
                            {linePath && (
                                <path
                                    d={linePath}
                                    fill="none"
                                    stroke="var(--primary)"
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
                                        stroke="var(--primary)"
                                        strokeWidth="3"
                                        vectorEffect="non-scaling-stroke"
                                    >
                                        <title>{`${dateLabel(point.date)}: ${formatMoney(point.net_revenue)} (${point.transactions} ${translate('transaksi')})`}</title>
                                    </circle>
                                ))}
                        </svg>
                    </div>
                    <div className="-mt-4 flex justify-between text-[11px] text-muted-foreground">
                        <span>{dateLabel(data[0].date)}</span>
                        <span>{dateLabel(data[Math.floor(data.length / 2)].date)}</span>
                        <span>{dateLabel(data.at(-1)!.date)}</span>
                    </div>
                </>
            )}
        </PageSection>
    );
}

export function CategoryBreakdown({ categories }: { categories: CategorySale[] }) {
    const total = categories.reduce((sum, item) => sum + Math.max(0, Number(item.net_revenue)), 0);

    return (
        <PageSection title={translate('Komposisi Kategori')} contentClassName="p-4 sm:p-5">
            {categories.length === 0 ? (
                <EmptyState icon={BarChart3} title={translate('Belum ada penjualan kategori')} />
            ) : (
                <div className="space-y-4">
                    {categories.map((category) => {
                        const percentage = total > 0 ? Math.max(0, Math.round((Number(category.net_revenue) / total) * 100)) : 0;

                        return (
                            <div key={category.category_name}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{category.category_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatQuantity(category.quantity_sold)} {translate('item')}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-medium">{formatCompactMoney(category.net_revenue)}</p>
                                        <p className="text-xs text-muted-foreground">{percentage}%</p>
                                    </div>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </PageSection>
    );
}

function dateLabel(value: string) {
    return new Intl.DateTimeFormat(localeTag(), {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
}
