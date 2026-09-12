import { router } from '@inertiajs/react';
import { AlertTriangle, Camera, Check, ClipboardCheck, PackageCheck, RotateCcw, Save, Search, Send, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { fieldClass, OperationsShell } from '@/components/operations-shell';
import { Button } from '@/components/ui/button';
import { prepareScannerTone } from '@/components/widgets/product-scanner/scanner-feedback';
import type { ScannerApplyResult, ScannerSelection } from '@/components/widgets/product-scanner/types';
import { useConfirmation } from '@/hooks/use-confirmation';
import { formatCompactMoney, formatMoney as money, formatQuantity as quantity, localeTag } from '@/lib/currency';
import { ledgerDateTime } from '@/lib/date-time';
import { decimalInput } from '@/lib/decimal-input';
import { translate } from '@/lib/i18n';
import {
    cancel as cancelStockOpname,
    complete as completeStockOpname,
    index as stockOpnamesIndex,
    post as postStockOpname,
    reopen as reopenStockOpname,
    update as updateStockOpname,
} from '@/routes/operations/stock-opnames';

type Item = {
    product_id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    variant_name: string | null;
    parent_name: string | null;
    unit: string;
    system_quantity: string;
    counted_quantity: string | null;
    difference_quantity: string | null;
    snapshot_unit_cost: string;
    current_quantity: string;
};

type StockCount = {
    public_id: string;
    document_number: string;
    status: 'draft' | 'counted' | 'posted' | 'cancelled';
    snapshot_at: string;
    completed_at: string | null;
    posted_at: string | null;
    notes: string | null;
    created_by: string;
    completed_by: string | null;
    posted_by: string | null;
    items: Item[];
};

const statusLabels = {
    draft: 'Sedang dihitung',
    counted: 'Menunggu posting',
    posted: 'Diposting',
    cancelled: 'Dibatalkan',
};
const ProductScanner = lazy(() => import('@/components/widgets/product-scanner/product-scanner'));

export default function StockOpnameShow({
    stockCount,
    canCount,
    canManage,
    timezone,
}: {
    stockCount: StockCount;
    canCount: boolean;
    canManage: boolean;
    timezone: string;
}) {
    const confirm = useConfirmation();
    const [values, setValues] = useState<Record<string, string>>(() =>
        Object.fromEntries(stockCount.items.map((item) => [item.product_id, decimalInput(item.counted_quantity)])),
    );
    const [dirty, setDirty] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'difference'>('all');
    const [processing, setProcessing] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(
        () =>
            stockCount.status === 'draft' &&
            canCount &&
            typeof window !== 'undefined' &&
            new URL(window.location.href).searchParams.get('scan') === '1',
    );
    const [scannerMessage, setScannerMessage] = useState('');

    const stats = useMemo(() => {
        let counted = 0;
        let differences = 0;
        let estimatedLoss = 0;
        stockCount.items.forEach((item) => {
            const value = values[item.product_id];

            if (value !== '') {
                counted += 1;

                if (Number(value) !== Number(item.system_quantity)) {
                    differences += 1;
                }

                const difference = Number(value) - Number(item.system_quantity);

                if (difference < 0) {
                    estimatedLoss += Math.abs(difference) * Number(item.snapshot_unit_cost);
                }
            }
        });

        return {
            counted,
            differences,
            estimatedLoss,
            remaining: stockCount.items.length - counted,
        };
    }, [stockCount.items, values]);

    const visibleItems = stockCount.items.filter((item) => {
        const query = search.trim().toLocaleLowerCase(localeTag());
        const matchesSearch =
            query === '' ||
            [item.parent_name, item.name, item.variant_name, item.sku, item.barcode].some((value) =>
                value?.toLocaleLowerCase(localeTag()).includes(query),
            );
        const value = values[item.product_id];
        const matchesFilter =
            filter === 'all' ||
            (filter === 'pending' && value === '') ||
            (filter === 'difference' && value !== '' && Number(value) !== Number(item.system_quantity));

        return matchesSearch && matchesFilter;
    });

    const editable = stockCount.status === 'draft' && canCount;

    useEffect(() => {
        const url = new URL(window.location.href);

        if (!scannerOpen || url.searchParams.get('scan') !== '1') {
            return;
        }

        url.searchParams.delete('scan');
        window.history.replaceState({}, '', url);
    }, [scannerOpen]);

    const useScannerSelections = (selections: ScannerSelection[]): ScannerApplyResult => {
        const result: ScannerApplyResult = { applied: [], failures: [] };
        let changed = 0;
        let missing = 0;
        const nextValues = { ...values };
        const nextDirty = new Set(dirty);
        selections.forEach((selection) => {
            const item = stockCount.items.find((candidate) => candidate.product_id === selection.productId);

            if (!item) {
                missing++;
                result.failures.push({
                    captureId: selection.captureId,
                    itemIndex: selection.itemIndex,
                    message: 'Produk tidak ada dalam sesi opname ini.',
                });

                return;
            }

            nextValues[item.product_id] = String(Number(nextValues[item.product_id] || 0) + selection.quantity);
            nextDirty.add(item.product_id);
            changed++;
            result.applied.push({ captureId: selection.captureId, itemIndex: selection.itemIndex });
        });
        setValues(nextValues);
        setDirty(nextDirty);
        setScannerMessage(
            missing
                ? `${changed} ${translate('hitungan diperbarui.')} ${missing} ${translate('produk tidak ada dalam sesi opname ini.')}`
                : `${changed} ${translate('hitungan diperbarui.')} ${translate('Periksa lalu simpan saat siap.')}`,
        );

        return result;
    };

    const save = () => {
        if (dirty.size === 0) {
            return;
        }

        setProcessing(true);
        router.patch(
            updateStockOpname.url(stockCount.public_id),
            {
                items: stockCount.items
                    .filter((item) => dirty.has(item.product_id))
                    .map((item) => ({
                        product_id: item.product_id,
                        counted_quantity: values[item.product_id] === '' ? null : values[item.product_id],
                    })),
            },
            {
                preserveScroll: true,
                onSuccess: () => setDirty(new Set()),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const workflow = async (action: 'complete' | 'reopen' | 'post' | 'cancel', confirmation?: string) => {
        if (
            confirmation &&
            !(await confirm({
                title: confirmation,
                confirmLabel: action === 'cancel' ? 'Batalkan opname' : 'Lanjutkan',
                variant: action === 'cancel' ? 'destructive' : 'default',
            }))
        ) {
            return;
        }

        const routes = {
            complete: completeStockOpname,
            reopen: reopenStockOpname,
            post: postStockOpname,
            cancel: cancelStockOpname,
        };
        setProcessing(true);
        router.post(
            routes[action].url(stockCount.public_id),
            {},
            {
                preserveScroll: action !== 'cancel',
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <OperationsShell
                active={stockOpnamesIndex.url()}
                title={stockCount.document_number}
                icon={ClipboardCheck}
                back={{ href: stockOpnamesIndex.url(), label: translate('Kembali ke daftar stock opname') }}
            >
                <section className="overflow-hidden rounded-2xl border border-[var(--app-ink)]/10 bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b border-[var(--app-ink)]/8 px-3 py-2.5 sm:px-4">
                        <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                            <p className="truncate font-bold text-foreground">{ledgerDateTime(stockCount.snapshot_at, timezone)}</p>
                            <p className="truncate">
                                {stockCount.created_by}
                                {stockCount.notes && ` · ${stockCount.notes}`}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-[var(--app-soft)] px-2 py-1.5 text-[10px] font-bold text-[var(--app-primary)] ring-1 ring-[var(--app-primary)]/15 sm:text-xs">
                            {translate(statusLabels[stockCount.status])}
                        </span>
                    </div>

                    <div className="grid grid-cols-4 divide-x divide-[var(--app-ink)]/8 py-2.5">
                        <Summary label="Dihitung" value={`${stats.counted}/${stockCount.items.length}`} />
                        <Summary label="Belum" value={stats.remaining} danger={stats.remaining > 0} />
                        <Summary label="Selisih" value={stats.differences} danger={stats.differences > 0} />
                        <Summary label="Estimasi rugi" value={compactMoney(stats.estimatedLoss)} danger={stats.estimatedLoss > 0} />
                    </div>

                    <div className="h-1.5 bg-muted">
                        <div
                            className="h-full bg-primary transition-[width]"
                            style={{
                                width: `${stockCount.items.length === 0 ? 0 : (stats.counted / stockCount.items.length) * 100}%`,
                            }}
                        />
                    </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-2.5 shadow-sm sm:p-3">
                    <div className="flex flex-wrap gap-2">
                        <label className="relative flex-1">
                            <span className="sr-only">Cari produk</span>
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className={`${fieldClass} pl-9`}
                                placeholder="Cari produk, SKU, atau barcode"
                            />
                        </label>
                        <select
                            value={filter}
                            onChange={(event) => setFilter(event.target.value as typeof filter)}
                            aria-label="Filter produk opname"
                            className={`${fieldClass} w-32 shrink-0 px-2 text-xs font-bold sm:w-44 sm:px-3 sm:text-sm`}
                        >
                            <option value="all">Semua produk</option>
                            <option value="pending">Belum dihitung</option>
                            <option value="difference">Ada selisih</option>
                        </select>
                        {editable && (
                            <Button
                                type="button"
                                size="touch"
                                onClick={() => {
                                    prepareScannerTone();
                                    setScannerOpen(true);
                                }}
                            >
                                <Camera className="size-4" /> Scan produk
                            </Button>
                        )}
                    </div>
                    {scannerMessage && (
                        <p
                            role="status"
                            className="mt-2 rounded-xl bg-[var(--app-soft)] px-3 py-2 text-xs font-bold text-[var(--app-primary)]"
                        >
                            {scannerMessage}
                        </p>
                    )}

                    <div className="mt-2 space-y-1.5">
                        {visibleItems.map((item) => {
                            const value = values[item.product_id];
                            const difference = value === '' ? null : Number(value) - Number(item.system_quantity);
                            const moved = Number(item.current_quantity) !== Number(item.system_quantity);
                            const estimatedLoss =
                                difference !== null && difference < 0 ? Math.abs(difference) * Number(item.snapshot_unit_cost) : 0;

                            return (
                                <article
                                    key={item.product_id}
                                    className={`rounded-xl border p-2.5 transition sm:p-3 ${difference !== null && difference < 0 ? 'border-destructive/20 bg-destructive/10' : difference !== null && difference > 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-border bg-card'}`}
                                >
                                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_9rem_7rem] sm:items-center">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-foreground">{item.variant_name ?? item.name}</p>
                                            {item.parent_name && (
                                                <p className="truncate text-xs font-bold text-[var(--app-primary)]">{item.parent_name}</p>
                                            )}
                                            <p className="text-[10px] text-muted-foreground">
                                                {item.sku || item.barcode || 'Tanpa SKU'} · {item.unit}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5 sm:contents">
                                            <div className="rounded-lg bg-white/70 px-2 py-1.5 text-right sm:bg-transparent sm:p-0">
                                                <span className="block text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
                                                    Sistem
                                                </span>
                                                <p className="text-sm font-bold text-foreground tabular-nums">
                                                    {quantity(item.system_quantity)}
                                                </p>
                                            </div>
                                            <label>
                                                <span className="block text-right text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
                                                    Fisik
                                                </span>
                                                <input
                                                    value={value}
                                                    disabled={!editable}
                                                    inputMode="decimal"
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    onChange={(event) => {
                                                        setValues((current) => ({
                                                            ...current,
                                                            [item.product_id]: event.target.value,
                                                        }));
                                                        setDirty((current) => new Set(current).add(item.product_id));
                                                    }}
                                                    className="mt-0.5 h-9 w-full rounded-lg border border-input bg-card px-2 text-right text-sm font-bold tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-ring/15 disabled:bg-muted"
                                                    placeholder="—"
                                                />
                                            </label>
                                            <div className="rounded-lg bg-white/70 px-2 py-1.5 text-right sm:bg-transparent sm:p-0">
                                                <span className="block text-[9px] font-bold tracking-wide text-muted-foreground uppercase">
                                                    Selisih
                                                </span>
                                                <p
                                                    className={`text-sm font-bold tabular-nums ${difference === null || difference === 0 ? 'text-muted-foreground' : difference > 0 ? 'text-emerald-700' : 'text-destructive'}`}
                                                >
                                                    {difference === null ? '—' : `${difference > 0 ? '+' : ''}${quantity(difference)}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {(estimatedLoss > 0 || moved) && (
                                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t border-current/5 pt-1.5 text-[10px] font-bold">
                                            {moved ? (
                                                <span className="flex items-center gap-1 text-sky-700">
                                                    <AlertTriangle className="size-3" /> Stok kini {quantity(item.current_quantity)}{' '}
                                                    {item.unit}
                                                </span>
                                            ) : (
                                                <span />
                                            )}
                                            {estimatedLoss > 0 && (
                                                <span className="font-bold text-destructive">Rugi {money(estimatedLoss)}</span>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                        {visibleItems.length === 0 && (
                            <div className="py-8 text-center text-sm font-bold text-muted-foreground">Produk tidak ditemukan</div>
                        )}
                    </div>
                </section>

                <div className="sticky bottom-20 z-20 rounded-xl border border-[var(--app-ink)]/10 bg-white/95 p-2.5 shadow-xl backdrop-blur md:bottom-4">
                    {stockCount.status === 'draft' && editable && (
                        <div>
                            <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground sm:text-right sm:text-xs">
                                Simpan untuk lanjut nanti · Selesai menghitung mengunci hasil
                            </p>
                            <div className={`grid gap-1.5 ${canManage ? 'grid-cols-3' : 'grid-cols-2'} sm:flex sm:justify-end`}>
                                {canManage && (
                                    <Button
                                        type="button"
                                        size="touch"
                                        variant="destructive"
                                        disabled={processing}
                                        onClick={() => workflow('cancel', 'Batalkan sesi stock opname ini?')}
                                        className="px-2 text-xs sm:px-4 sm:text-sm"
                                    >
                                        <X className="hidden size-4 sm:block" /> Batal
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    size="touch"
                                    variant="secondary"
                                    disabled={processing || dirty.size === 0}
                                    onClick={save}
                                    className="px-2 text-xs sm:px-4 sm:text-sm"
                                >
                                    <Save className="hidden size-4 sm:block" /> Simpan
                                    {dirty.size > 0 && ` (${dirty.size})`}
                                </Button>
                                <Button
                                    type="button"
                                    size="touch"
                                    disabled={processing || dirty.size > 0 || stats.remaining > 0}
                                    onClick={() => workflow('complete', 'Selesaikan penghitungan dan kunci hasil untuk diperiksa?')}
                                    className="px-2 text-xs sm:px-4 sm:text-sm"
                                >
                                    <ClipboardCheck className="hidden size-4 sm:block" /> Selesai hitung
                                </Button>
                            </div>
                        </div>
                    )}
                    {stockCount.status === 'counted' && canManage && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                size="touch"
                                variant="secondary"
                                disabled={processing}
                                onClick={() => workflow('reopen', 'Buka kembali hasil agar dapat dihitung ulang?')}
                            >
                                <RotateCcw className="size-4" /> Buka kembali
                            </Button>
                            <Button
                                type="button"
                                size="touch"
                                disabled={processing}
                                onClick={() => workflow('post', `Posting ${stats.differences} selisih ke persediaan?`)}
                            >
                                <Send className="size-4" /> Posting hasil
                            </Button>
                        </div>
                    )}
                    {stockCount.status === 'counted' && !canManage && (
                        <p className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-sky-700">
                            <Check className="size-4" /> Menunggu owner/admin memposting hasil
                        </p>
                    )}
                    {stockCount.status === 'posted' && (
                        <p className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-emerald-700">
                            <PackageCheck className="size-4" /> Hasil sudah masuk ke persediaan
                        </p>
                    )}
                    {stockCount.status === 'cancelled' && (
                        <p className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-muted-foreground">
                            <X className="size-4" /> Sesi dibatalkan
                        </p>
                    )}
                </div>
            </OperationsShell>
            <Suspense
                fallback={
                    <div role="status" className="fixed inset-0 z-[90] grid place-items-center bg-black/80 text-white">
                        Membuka kamera…
                    </div>
                }
            >
                <ProductScanner
                    purpose="stock_count"
                    title="Scan produk untuk opname"
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onConfirm={useScannerSelections}
                    onManualSearch={() => setScannerOpen(false)}
                />
            </Suspense>
        </>
    );
}

function Summary({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
    return (
        <div className="min-w-0 px-1.5 text-center sm:px-3">
            <p className="truncate text-[8px] font-bold tracking-wide text-[var(--muted-foreground)] uppercase sm:text-[10px]">
                {translate(label)}
            </p>
            <p
                className={`mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base ${danger ? 'text-destructive' : 'text-[var(--app-ink)]'}`}
            >
                {value}
            </p>
        </div>
    );
}

function compactMoney(value: number) {
    return formatCompactMoney(value);
}
