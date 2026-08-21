import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    ClipboardCheck,
    PackageCheck,
    RotateCcw,
    Save,
    Search,
    Send,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    ledgerDateTime,
    money,
    OperationsShell,
    quantity,
} from '@/components/operations-shell';
import { decimalInput } from '@/lib/decimal-input';

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
    const [values, setValues] = useState<Record<string, string>>(() =>
        Object.fromEntries(
            stockCount.items.map((item) => [
                item.product_id,
                decimalInput(item.counted_quantity),
            ]),
        ),
    );
    const [dirty, setDirty] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'difference'>(
        'all',
    );
    const [processing, setProcessing] = useState(false);

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
                    estimatedLoss +=
                        Math.abs(difference) * Number(item.snapshot_unit_cost);
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
        const query = search.trim().toLocaleLowerCase('id-ID');
        const matchesSearch =
            query === '' ||
            [
                item.parent_name,
                item.name,
                item.variant_name,
                item.sku,
                item.barcode,
            ].some((value) =>
                value?.toLocaleLowerCase('id-ID').includes(query),
            );
        const value = values[item.product_id];
        const matchesFilter =
            filter === 'all' ||
            (filter === 'pending' && value === '') ||
            (filter === 'difference' &&
                value !== '' &&
                Number(value) !== Number(item.system_quantity));

        return matchesSearch && matchesFilter;
    });

    const base = `/operations/stock-opnames/${stockCount.public_id}`;
    const editable = stockCount.status === 'draft' && canCount;

    const save = () => {
        if (dirty.size === 0) {
            return;
        }

        setProcessing(true);
        router.patch(
            base,
            {
                items: stockCount.items
                    .filter((item) => dirty.has(item.product_id))
                    .map((item) => ({
                        product_id: item.product_id,
                        counted_quantity:
                            values[item.product_id] === ''
                                ? null
                                : values[item.product_id],
                    })),
            },
            {
                preserveScroll: true,
                onSuccess: () => setDirty(new Set()),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const workflow = (
        action: 'complete' | 'reopen' | 'post' | 'cancel',
        confirmation?: string,
    ) => {
        if (confirmation && !window.confirm(confirmation)) {
            return;
        }

        setProcessing(true);
        router.post(
            `${base}/${action}`,
            {},
            {
                preserveScroll: action !== 'cancel',
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <>
            <Head title={stockCount.document_number} />
            <OperationsShell
                active="/operations/stock-opnames"
                eyebrow="Stock opname"
                title={stockCount.document_number}
                description=""
            >
                <section className="overflow-hidden rounded-[1.2rem] border border-[#173c35]/10 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-[#173c35]/8 px-3 py-2.5 sm:px-4">
                        <Link
                            href="/operations/stock-opnames"
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#eef3ef] px-2.5 text-xs font-black text-[#365f53]"
                        >
                            <ArrowLeft className="size-3.5" /> Kembali
                        </Link>
                        <div className="min-w-0 flex-1 text-xs text-stone-500">
                            <p className="truncate font-bold text-stone-700">
                                {ledgerDateTime(
                                    stockCount.snapshot_at,
                                    timezone,
                                )}
                            </p>
                            <p className="truncate">
                                {stockCount.created_by}
                                {stockCount.notes && ` · ${stockCount.notes}`}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-[#e7f1ec] px-2 py-1.5 text-[10px] font-black text-[#286451] ring-1 ring-[#286451]/15 sm:text-xs">
                            {statusLabels[stockCount.status]}
                        </span>
                    </div>

                    <div className="grid grid-cols-4 divide-x divide-[#173c35]/8 py-2.5">
                        <Summary
                            label="Dihitung"
                            value={`${stats.counted}/${stockCount.items.length}`}
                        />
                        <Summary
                            label="Belum"
                            value={stats.remaining}
                            danger={stats.remaining > 0}
                        />
                        <Summary
                            label="Selisih"
                            value={stats.differences}
                            danger={stats.differences > 0}
                        />
                        <Summary
                            label="Estimasi rugi"
                            value={compactMoney(stats.estimatedLoss)}
                            danger={stats.estimatedLoss > 0}
                        />
                    </div>

                    <div className="h-1.5 bg-stone-100">
                        <div
                            className="h-full bg-teal-600 transition-[width]"
                            style={{
                                width: `${stockCount.items.length === 0 ? 0 : (stats.counted / stockCount.items.length) * 100}%`,
                            }}
                        />
                    </div>
                </section>

                <section className="rounded-[1.2rem] border border-stone-200 bg-white p-2.5 shadow-sm sm:p-3">
                    <div className="flex gap-2">
                        <label className="relative flex-1">
                            <span className="sr-only">Cari produk</span>
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className="h-10 w-full rounded-xl border border-stone-300 bg-white pr-3 pl-9 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
                                placeholder="Cari produk, SKU, atau barcode"
                            />
                        </label>
                        <select
                            value={filter}
                            onChange={(event) =>
                                setFilter(event.target.value as typeof filter)
                            }
                            aria-label="Filter produk opname"
                            className="h-10 w-32 shrink-0 rounded-xl border border-stone-300 bg-white px-2 text-xs font-bold text-stone-700 outline-none sm:w-44 sm:px-3 sm:text-sm"
                        >
                            <option value="all">Semua produk</option>
                            <option value="pending">Belum dihitung</option>
                            <option value="difference">Ada selisih</option>
                        </select>
                    </div>

                    <div className="mt-2 space-y-1.5">
                        {visibleItems.map((item) => {
                            const value = values[item.product_id];
                            const difference =
                                value === ''
                                    ? null
                                    : Number(value) -
                                      Number(item.system_quantity);
                            const moved =
                                Number(item.current_quantity) !==
                                Number(item.system_quantity);
                            const estimatedLoss =
                                difference !== null && difference < 0
                                    ? Math.abs(difference) *
                                      Number(item.snapshot_unit_cost)
                                    : 0;

                            return (
                                <article
                                    key={item.product_id}
                                    className={`rounded-xl border p-2.5 transition sm:p-3 ${difference !== null && difference < 0 ? 'border-red-200 bg-red-50/50' : difference !== null && difference > 0 ? 'border-emerald-200 bg-emerald-50/40' : 'border-stone-200 bg-white'}`}
                                >
                                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_9rem_7rem] sm:items-center">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-stone-900">
                                                {item.variant_name ?? item.name}
                                            </p>
                                            {item.parent_name && (
                                                <p className="truncate text-xs font-bold text-[#477065]">
                                                    {item.parent_name}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-stone-500">
                                                {item.sku ||
                                                    item.barcode ||
                                                    'Tanpa SKU'}{' '}
                                                · {item.unit}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5 sm:contents">
                                            <div className="rounded-lg bg-white/70 px-2 py-1.5 text-right sm:bg-transparent sm:p-0">
                                                <span className="block text-[9px] font-bold tracking-wide text-stone-500 uppercase">
                                                    Sistem
                                                </span>
                                                <p className="text-sm font-black text-stone-700 tabular-nums">
                                                    {quantity(
                                                        item.system_quantity,
                                                    )}
                                                </p>
                                            </div>
                                            <label>
                                                <span className="block text-right text-[9px] font-bold tracking-wide text-stone-500 uppercase">
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
                                                        setValues(
                                                            (current) => ({
                                                                ...current,
                                                                [item.product_id]:
                                                                    event.target
                                                                        .value,
                                                            }),
                                                        );
                                                        setDirty((current) =>
                                                            new Set(
                                                                current,
                                                            ).add(
                                                                item.product_id,
                                                            ),
                                                        );
                                                    }}
                                                    className="mt-0.5 h-9 w-full rounded-lg border border-stone-300 bg-white px-2 text-right text-sm font-black tabular-nums outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 disabled:bg-stone-50"
                                                    placeholder="—"
                                                />
                                            </label>
                                            <div className="rounded-lg bg-white/70 px-2 py-1.5 text-right sm:bg-transparent sm:p-0">
                                                <span className="block text-[9px] font-bold tracking-wide text-stone-500 uppercase">
                                                    Selisih
                                                </span>
                                                <p
                                                    className={`text-sm font-black tabular-nums ${difference === null || difference === 0 ? 'text-stone-500' : difference > 0 ? 'text-emerald-700' : 'text-red-700'}`}
                                                >
                                                    {difference === null
                                                        ? '—'
                                                        : `${difference > 0 ? '+' : ''}${quantity(difference)}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {(estimatedLoss > 0 || moved) && (
                                        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 border-t border-current/5 pt-1.5 text-[10px] font-bold">
                                            {moved ? (
                                                <span className="flex items-center gap-1 text-sky-700">
                                                    <AlertTriangle className="size-3" />{' '}
                                                    Stok kini{' '}
                                                    {quantity(
                                                        item.current_quantity,
                                                    )}{' '}
                                                    {item.unit}
                                                </span>
                                            ) : (
                                                <span />
                                            )}
                                            {estimatedLoss > 0 && (
                                                <span className="font-black text-red-700">
                                                    Rugi {money(estimatedLoss)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                        {visibleItems.length === 0 && (
                            <div className="py-8 text-center text-sm font-bold text-stone-500">
                                Produk tidak ditemukan
                            </div>
                        )}
                    </div>
                </section>

                <div className="sticky bottom-20 z-20 rounded-xl border border-[#173c35]/10 bg-white/95 p-2.5 shadow-xl backdrop-blur md:bottom-4">
                    {stockCount.status === 'draft' && editable && (
                        <div>
                            <p className="mb-1.5 text-[10px] font-semibold text-stone-500 sm:text-right sm:text-xs">
                                Simpan untuk lanjut nanti · Selesai menghitung
                                mengunci hasil
                            </p>
                            <div
                                className={`grid gap-1.5 ${canManage ? 'grid-cols-3' : 'grid-cols-2'} sm:flex sm:justify-end`}
                            >
                                {canManage && (
                                    <button
                                        type="button"
                                        disabled={processing}
                                        onClick={() =>
                                            workflow(
                                                'cancel',
                                                'Batalkan sesi stock opname ini?',
                                            )
                                        }
                                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-black text-red-700 ring-1 ring-red-200 sm:px-4 sm:text-sm"
                                    >
                                        <X className="hidden size-4 sm:block" />{' '}
                                        Batal
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={processing || dirty.size === 0}
                                    onClick={save}
                                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-[#e7f1ec] px-2 text-xs font-black text-[#286451] disabled:opacity-50 sm:px-4 sm:text-sm"
                                >
                                    <Save className="hidden size-4 sm:block" />{' '}
                                    Simpan
                                    {dirty.size > 0 && ` (${dirty.size})`}
                                </button>
                                <button
                                    type="button"
                                    disabled={
                                        processing ||
                                        dirty.size > 0 ||
                                        stats.remaining > 0
                                    }
                                    onClick={() =>
                                        workflow(
                                            'complete',
                                            'Selesaikan penghitungan dan kunci hasil untuk diperiksa?',
                                        )
                                    }
                                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-2 text-xs font-black text-white disabled:opacity-50 sm:px-4 sm:text-sm"
                                >
                                    <ClipboardCheck className="hidden size-4 sm:block" />{' '}
                                    Selesai hitung
                                </button>
                            </div>
                        </div>
                    )}
                    {stockCount.status === 'counted' && canManage && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={processing}
                                onClick={() => workflow('reopen')}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-100 px-4 text-sm font-black text-stone-700"
                            >
                                <RotateCcw className="size-4" /> Buka kembali
                            </button>
                            <button
                                type="button"
                                disabled={processing}
                                onClick={() =>
                                    workflow(
                                        'post',
                                        `Posting ${stats.differences} selisih ke persediaan?`,
                                    )
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-black text-white disabled:opacity-50"
                            >
                                <Send className="size-4" /> Posting hasil
                            </button>
                        </div>
                    )}
                    {stockCount.status === 'counted' && !canManage && (
                        <p className="flex items-center justify-center gap-2 py-2 text-sm font-black text-sky-700">
                            <Check className="size-4" /> Menunggu owner/admin
                            memposting hasil
                        </p>
                    )}
                    {stockCount.status === 'posted' && (
                        <p className="flex items-center justify-center gap-2 py-2 text-sm font-black text-emerald-700">
                            <PackageCheck className="size-4" /> Hasil sudah
                            masuk ke persediaan
                        </p>
                    )}
                    {stockCount.status === 'cancelled' && (
                        <p className="flex items-center justify-center gap-2 py-2 text-sm font-black text-stone-600">
                            <X className="size-4" /> Sesi dibatalkan
                        </p>
                    )}
                </div>
            </OperationsShell>
        </>
    );
}

function Summary({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: string | number;
    danger?: boolean;
}) {
    return (
        <div className="min-w-0 px-1.5 text-center sm:px-3">
            <p className="truncate text-[8px] font-bold tracking-wide text-[#72837d] uppercase sm:text-[10px]">
                {label}
            </p>
            <p
                className={`mt-0.5 truncate text-sm font-black tabular-nums sm:text-base ${danger ? 'text-red-700' : 'text-[#173c35]'}`}
            >
                {value}
            </p>
        </div>
    );
}

function compactMoney(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(value);
}
