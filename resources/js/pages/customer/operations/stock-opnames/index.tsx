import { Form, Link, router } from '@inertiajs/react';
import { ArrowRight, ClipboardList, PackageCheck, Plus } from 'lucide-react';
import { useState } from 'react';
import { fieldClass, LedgerCard, OperationsShell } from '@/components/operations-shell';
import { ResponsiveDialog } from '@/components/overlays/responsive-dialog';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { ledgerDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { index as stockOpnamesIndex, store as storeStockOpname } from '@/routes/operations/stock-opnames';

type StockCount = {
    public_id: string;
    document_number: string;
    status: 'draft' | 'counted' | 'posted' | 'cancelled';
    frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null;
    snapshot_at: string;
    created_at: string;
    created_by: string;
    items_count: number;
    counted_items_count: number;
    discrepancy_items_count: number;
};

const statuses = {
    draft: {
        label: 'Counting',
        className: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
    counted: {
        label: 'Waiting post',
        className: 'bg-sky-50 text-sky-700 ring-sky-200',
    },
    posted: {
        label: 'Posted',
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    cancelled: {
        label: 'Cancelled',
        className: 'bg-muted text-muted-foreground ring-border',
    },
};

const frequencies = {
    monthly: { label: 'Monthly', className: 'bg-violet-50 text-violet-700 ring-violet-200' },
    quarterly: { label: 'Quarterly', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
    semi_annual: { label: 'Semi-annual', className: 'bg-teal-50 text-teal-700 ring-teal-200' },
    annual: { label: 'Annual', className: 'bg-orange-50 text-orange-700 ring-orange-200' },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function StockOpnameIndex({
    counts,
    canManage,
    timezone,
    filters,
    availableYears,
}: {
    counts: { data: StockCount[]; links: PaginationLink[]; total: number };
    canManage: boolean;
    timezone: string;
    filters: { frequency: string | null; month: string | null; year: string | null };
    availableYears: number[];
}) {
    const [createOpen, setCreateOpen] = useState(false);
    const currentYear = new Date().getFullYear();
    const years = availableYears.length > 0 ? availableYears : [currentYear];

    function applyFilter(patch: Partial<typeof filters>) {
        const next = { ...filters, ...patch };
        const params = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== null && v !== '' && v !== undefined));
        router.get(stockOpnamesIndex.url(), params, { preserveState: true, replace: true });
    }

    const hasActiveFilters = Boolean(filters.frequency || filters.month || filters.year);

    return (
        <OperationsShell active={stockOpnamesIndex.url()} title={translate('Stock count')} icon={ClipboardList}>
            <LedgerCard
                title={`${translate('Stock count history')} (${counts.total.toLocaleString()})`}
                actions={
                    canManage ? (
                        <Button type="button" size="touch" onClick={() => setCreateOpen(true)} className="gap-1.5">
                            <Plus className="size-4" />
                            {translate('Start stock count')}
                        </Button>
                    ) : undefined
                }
            >
                {/* Filter Toolbar embedded directly inside history card */}
                <div className="mb-4 flex flex-wrap items-end gap-2.5 rounded-xl border border-border/60 bg-secondary/35 p-3">
                    <label className="flex min-w-[8.5rem] flex-1 flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                            {translate('Frequency')}
                        </span>
                        <select
                            value={filters.frequency ?? ''}
                            onChange={(e) => applyFilter({ frequency: e.target.value || null, month: null, year: null })}
                            className={`${fieldClass} text-xs`}
                        >
                            <option value="">{translate('All frequencies')}</option>
                            <option value="monthly">{translate('Monthly')}</option>
                            <option value="quarterly">{translate('Quarterly')}</option>
                            <option value="semi_annual">{translate('Semi-annual')}</option>
                            <option value="annual">{translate('Annual')}</option>
                        </select>
                    </label>

                    <label className="flex min-w-[8.5rem] flex-1 flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">{translate('Month')}</span>
                        <select
                            value={filters.month ?? ''}
                            onChange={(e) => applyFilter({ month: e.target.value || null })}
                            className={`${fieldClass} text-xs`}
                        >
                            <option value="">{translate('All months')}</option>
                            {MONTHS.map((m, i) => (
                                <option key={i + 1} value={String(i + 1)}>
                                    {translate(m)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex min-w-[7rem] flex-1 flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">{translate('Year')}</span>
                        <select
                            value={filters.year ?? ''}
                            onChange={(e) => applyFilter({ year: e.target.value || null })}
                            className={`${fieldClass} text-xs`}
                        >
                            <option value="">{translate('All years')}</option>
                            {years.map((y) => (
                                <option key={y} value={String(y)}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </label>

                    {hasActiveFilters && (
                        <Button
                            type="button"
                            variant="secondary"
                            size="touch"
                            onClick={() => applyFilter({ frequency: null, month: null, year: null })}
                            className="text-xs"
                        >
                            {translate('Reset')}
                        </Button>
                    )}
                </div>

                {counts.data.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {counts.data.map((count) => {
                            const status = statuses[count.status];
                            const freq = count.frequency ? frequencies[count.frequency] : null;
                            const progress =
                                count.items_count === 0 ? 0 : Math.round((count.counted_items_count / count.items_count) * 100);

                            return (
                                <Link
                                    key={count.public_id}
                                    href={`/operations/stock-opnames/${count.public_id}`}
                                    className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/25 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                                                <ClipboardList className="size-5" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate font-bold text-[var(--app-ink)]">{count.document_number}</p>
                                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                    {ledgerDateTime(count.snapshot_at, timezone)} · {count.created_by}
                                                </p>
                                                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                                    {translate('Created at')}: {ledgerDateTime(count.created_at, timezone)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                                            <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ${status.className}`}>
                                                {translate(status.label)}
                                            </span>
                                            {freq && (
                                                <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ${freq.className}`}>
                                                    {translate(freq.label)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <Metric label="Product" value={count.items_count} />
                                        <Metric label="Counted" value={`${count.counted_items_count}/${count.items_count}`} />
                                        <Metric
                                            label="Difference"
                                            value={count.discrepancy_items_count}
                                            danger={count.discrepancy_items_count > 0}
                                        />
                                    </div>

                                    {count.status === 'draft' && (
                                        <div className="mt-3">
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-primary">
                                        {translate('Open')} <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex min-h-48 flex-col items-center justify-center text-center">
                        <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                            <PackageCheck className="size-6" />
                        </span>
                        <p className="mt-3 font-bold text-foreground">{translate('No stock counts yet')}</p>
                    </div>
                )}
                <div className="mt-4">
                    <Pagination links={counts.links} />
                </div>
            </LedgerCard>

            {/* Modal Dialog for starting stock count session */}
            {canManage && (
                <ResponsiveDialog open={createOpen} onOpenChange={setCreateOpen} title={translate('Start stock count')} size="sm">
                    <Form action={storeStockOpname.url()} method="post" className="space-y-4 pt-1" onSuccess={() => setCreateOpen(false)}>
                        {({ processing, errors }) => (
                            <>
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold text-muted-foreground">{translate('Frequency')}</span>
                                    <select name="frequency" className={`${fieldClass} w-full`} defaultValue="">
                                        <option value="">{translate('Ad-hoc')}</option>
                                        <option value="monthly">{translate('Monthly')}</option>
                                        <option value="quarterly">{translate('Quarterly')}</option>
                                        <option value="semi_annual">{translate('Semi-annual')}</option>
                                        <option value="annual">{translate('Annual')}</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-bold text-muted-foreground">{translate('Notes')}</span>
                                    <textarea
                                        name="notes"
                                        rows={3}
                                        maxLength={500}
                                        className="w-full rounded-xl border border-input bg-background p-3 text-base text-foreground transition outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
                                        placeholder={translate('Sample: Stock count ending month')}
                                    />
                                    {errors.notes && (
                                        <span className="mt-1 block text-xs font-semibold text-destructive">{errors.notes}</span>
                                    )}
                                    {errors.stock_count && (
                                        <span className="mt-1 block text-xs font-semibold text-destructive">{errors.stock_count}</span>
                                    )}
                                </label>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="secondary" size="touch" onClick={() => setCreateOpen(false)}>
                                        {translate('Cancel')}
                                    </Button>
                                    <Button type="submit" size="touch" disabled={processing} className="gap-1.5">
                                        <Plus className="size-4" />
                                        {translate('Start stock count')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </ResponsiveDialog>
            )}
        </OperationsShell>
    );
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
    return (
        <div className={`rounded-xl px-3 py-2 ${danger ? 'bg-orange-50' : 'bg-secondary'}`}>
            <p className="text-[9px] font-bold tracking-wide text-muted-foreground uppercase">{translate(label)}</p>
            <p className={`mt-0.5 text-sm font-bold tabular-nums ${danger ? 'text-orange-700' : 'text-[var(--app-ink)]'}`}>{value}</p>
        </div>
    );
}
