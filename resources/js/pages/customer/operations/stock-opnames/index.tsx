import { Form, Link } from '@inertiajs/react';
import { ArrowRight, ClipboardList, PackageCheck, Plus } from 'lucide-react';
import { fieldClass, LedgerCard, OperationsShell } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { ledgerDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { index as stockOpnamesIndex, show as showStockOpname, store as storeStockOpname } from '@/routes/operations/stock-opnames';

type StockCount = {
    public_id: string;
    document_number: string;
    status: 'draft' | 'counted' | 'posted' | 'cancelled';
    snapshot_at: string;
    created_by: string;
    items_count: number;
    counted_items_count: number;
    discrepancy_items_count: number;
};

const statuses = {
    draft: {
        label: 'Sedang dihitung',
        className: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
    counted: {
        label: 'Menunggu posting',
        className: 'bg-sky-50 text-sky-700 ring-sky-200',
    },
    posted: {
        label: 'Diposting',
        className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    cancelled: {
        label: 'Dibatalkan',
        className: 'bg-muted text-muted-foreground ring-border',
    },
};

export default function StockOpnameIndex({
    counts,
    canManage,
    timezone,
}: {
    counts: { data: StockCount[]; links: PaginationLink[]; total: number };
    canManage: boolean;
    timezone: string;
}) {
    return (
        <OperationsShell active={stockOpnamesIndex.url()} title="Stock Opname" icon={ClipboardList}>
            {canManage && (
                <LedgerCard title="Mulai Opname">
                    <Form action={storeStockOpname.url()} method="post" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        {({ processing, errors }) => (
                            <>
                                <label className="min-w-0 flex-1">
                                    <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Catatan</span>
                                    <input name="notes" maxLength={500} className={fieldClass} placeholder="Contoh: Opname akhir bulan" />
                                    {errors.notes && (
                                        <span className="mt-1 block text-xs font-semibold text-destructive">{errors.notes}</span>
                                    )}
                                    {errors.stock_count && (
                                        <span className="mt-1 block text-xs font-semibold text-destructive">{errors.stock_count}</span>
                                    )}
                                </label>
                                <Button type="submit" size="touch" disabled={processing}>
                                    <Plus className="size-4" />
                                    Mulai opname
                                </Button>
                            </>
                        )}
                    </Form>
                </LedgerCard>
            )}

            <LedgerCard title={`${translate('Riwayat Opname')} (${counts.total.toLocaleString()})`}>
                {counts.data.length > 0 ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                        {counts.data.map((count) => {
                            const status = statuses[count.status];
                            const progress =
                                count.items_count === 0 ? 0 : Math.round((count.counted_items_count / count.items_count) * 100);

                            return (
                                <Link
                                    key={count.public_id}
                                    href={showStockOpname.url(count.public_id)}
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
                                            </div>
                                        </div>
                                        <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ring-1 ${status.className}`}>
                                            {translate(status.label)}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        <Metric label="Produk" value={count.items_count} />
                                        <Metric label="Dihitung" value={`${count.counted_items_count}/${count.items_count}`} />
                                        <Metric
                                            label="Selisih"
                                            value={count.discrepancy_items_count}
                                            danger={count.discrepancy_items_count > 0}
                                        />
                                    </div>

                                    {count.status === 'draft' && (
                                        <div className="mt-3">
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary"
                                                    style={{
                                                        width: `${progress}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-3 flex items-center justify-end gap-1 text-xs font-bold text-primary">
                                        Buka <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
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
                        <p className="mt-3 font-bold text-foreground">Belum ada stock opname</p>
                    </div>
                )}
                <div className="mt-4">
                    <Pagination links={counts.links} />
                </div>
            </LedgerCard>
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
