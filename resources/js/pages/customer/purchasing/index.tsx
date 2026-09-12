import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Building2,
    Camera,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    PackagePlus,
    Plus,
    ReceiptText,
    Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { buttonClass, fieldClass } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { prepareScannerTone } from '@/features/product-scanner/scanner-feedback';
import type { ScannerApplyResult, ScannerSelection } from '@/features/product-scanner/types';
import { formatMoney as money, formatQuantity as quantity } from '@/lib/currency';
import { currentDateTime, ledgerDateTime } from '@/lib/date-time';
import { decimalInput } from '@/lib/decimal-input';
import { useTranslation } from '@/lib/i18n';
import { postingToken } from '@/lib/posting-token';

type Supplier = {
    public_id: string;
    name: string;
    is_active: boolean;
    payable_balance: string;
};
type ProductOption = {
    product_id: string;
    product_name: string;
    sku: string | null;
    unit_id: string;
    unit_name: string;
    unit_symbol: string;
    conversion_factor: string;
    purchase_price: string;
};
type Account = { public_id: string; name: string };
type PurchaseItem = {
    product_name: string;
    unit_symbol: string;
    quantity: string;
    base_quantity: string;
    unit_price: string;
    landed_total: string;
};
type Purchase = {
    public_id: string;
    document_number: string;
    supplier_invoice_number: string | null;
    supplier_name: string;
    total_amount: string;
    paid_amount: string;
    outstanding_amount: string;
    occurred_at: string;
    notes: string | null;
    items: PurchaseItem[];
};
type PayableTransaction = {
    public_id: string;
    supplier_name: string;
    direction: 'increase' | 'decrease';
    reason: string;
    amount: string;
    balance_after: string;
    occurred_at: string;
};
type Page<T> = { data: T[]; links: PaginationLink[]; total: number };

const cardClass = 'rounded-2xl bg-white shadow-[0_14px_40px_-32px_rgba(63,31,22,0.55)]';
const labelClass = 'space-y-1 text-sm font-semibold text-stone-700';
const defaultItem = (product?: ProductOption) => ({
    product_id: product?.product_id ?? '',
    unit_id: product?.unit_id ?? '',
    quantity: '1',
    unit_price: decimalInput(product?.purchase_price ?? '0'),
});
const ProductScanner = lazy(() => import('@/features/product-scanner/ProductScanner'));

type PurchasingView = 'purchases' | 'payables';

const linksForView = (links: PaginationLink[], view: PurchasingView): PaginationLink[] =>
    links.map((link) => {
        if (!link.url) {
            return link;
        }

        const url = new URL(link.url, 'https://pagination.local');
        url.searchParams.set('view', view);

        return { ...link, url: `${url.pathname}${url.search}${url.hash}` };
    });

export default function PurchasingPage({
    purchases,
    suppliers,
    products,
    accounts,
    payableTransactions,
    totalPayable,
    timezone,
    canManage,
}: {
    purchases: Page<Purchase>;
    suppliers: Supplier[];
    products: ProductOption[];
    accounts: Account[];
    payableTransactions: Page<PayableTransaction>;
    totalPayable: string | number;
    timezone: string;
    canManage: boolean;
}) {
    const [scannerOpen, setScannerOpen] = useState(
        () => canManage && typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('scan') === '1',
    );
    const { t } = useTranslation();
    const [scannerSummary, setScannerSummary] = useState<{ added: number; skipped: number } | null>(null);
    const [purchaseOpen, setPurchaseOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [activeView, setActiveView] = useState<PurchasingView>(() => {
        if (typeof window === 'undefined') {
            return 'purchases';
        }

        const params = new URL(window.location.href).searchParams;

        return params.get('view') === 'payables' || params.has('payables_page') ? 'payables' : 'purchases';
    });
    const activeSuppliers = suppliers.filter((supplier) => supplier.is_active);
    const purchase = useForm({
        supplier_id: activeSuppliers[0]?.public_id ?? '',
        supplier_invoice_number: '',
        discount_amount: '0',
        additional_cost: '0',
        paid_amount: '0',
        account_id: accounts[0]?.public_id ?? '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
        items: [defaultItem(products[0])],
    });
    const unpaidPurchases = purchases.data.filter((entry) => Number(entry.outstanding_amount) > 0);
    const payment = useForm({
        purchase_id: unpaidPurchases[0]?.public_id ?? '',
        account_id: accounts[0]?.public_id ?? '',
        amount: decimalInput(unpaidPurchases[0]?.outstanding_amount ?? ''),
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const subtotal = purchase.data.items.reduce((total, item) => total + Number(item.quantity) * Number(item.unit_price), 0);
    const grandTotal = subtotal - Number(purchase.data.discount_amount || 0) + Number(purchase.data.additional_cost || 0);

    useEffect(() => {
        const url = new URL(window.location.href);

        if (!scannerOpen || url.searchParams.get('scan') !== '1') {
            return;
        }

        url.searchParams.delete('scan');
        window.history.replaceState({}, '', url);
    }, [scannerOpen]);

    const addScannerSelections = (selections: ScannerSelection[]): ScannerApplyResult => {
        const result: ScannerApplyResult = { applied: [], failures: [] };
        const items = purchase.data.items.filter((item) => item.product_id !== '' && item.unit_id !== '');

        for (const selection of selections) {
            const identity = { captureId: selection.captureId, itemIndex: selection.itemIndex };
            const option = products.find((product) => product.product_id === selection.productId && product.unit_id === selection.unitId);

            if (!option || !Number.isFinite(selection.quantity) || selection.quantity <= 0) {
                result.failures.push({ ...identity, message: 'Produk atau jumlah tidak tersedia untuk pembelian.' });
                continue;
            }

            const index = items.findIndex((item) => item.product_id === option.product_id && item.unit_id === option.unit_id);

            if (index >= 0) {
                items[index] = { ...items[index], quantity: String(Number(items[index].quantity) + selection.quantity) };
            } else {
                items.push({ ...defaultItem(option), quantity: String(selection.quantity) });
            }

            result.applied.push(identity);
        }

        purchase.setData('items', items);
        setScannerSummary({ added: result.applied.length, skipped: result.failures.length });
        setPurchaseOpen(true);

        return result;
    };

    const chooseProduct = (index: number, composite: string) => {
        const [productId, unitId] = composite.split(':');
        const selected = products.find((option) => option.product_id === productId && option.unit_id === unitId);
        purchase.setData(
            'items',
            purchase.data.items.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                          ...item,
                          product_id: productId,
                          unit_id: unitId,
                          unit_price: decimalInput(selected?.purchase_price ?? item.unit_price),
                      }
                    : item,
            ),
        );
    };
    const updateItem = (index: number, field: 'quantity' | 'unit_price', value: string) => {
        purchase.setData(
            'items',
            purchase.data.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
        );
    };
    const submitPurchase = (event: FormEvent) => {
        event.preventDefault();
        purchase.post('/purchasing', {
            preserveScroll: true,
            onSuccess: () => {
                setPurchaseOpen(false);
                purchase.reset('supplier_invoice_number', 'notes', 'discount_amount', 'additional_cost', 'paid_amount');
                purchase.setData('idempotency_key', postingToken());
            },
        });
    };
    const submitPayment = (event: FormEvent) => {
        event.preventDefault();

        if (!payment.data.purchase_id) {
            return;
        }

        payment.post(`/purchasing/${payment.data.purchase_id}/payments`, {
            preserveScroll: true,
            onSuccess: () => {
                setPaymentOpen(false);
                payment.setData({
                    ...payment.data,
                    purchase_id: '',
                    amount: '',
                    notes: '',
                    idempotency_key: postingToken(),
                });
            },
        });
    };

    return (
        <>
            <Head title="Pembelian dan utang supplier" />
            <div className="min-h-full bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-4">
                    <header className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-4 shadow-[0_14px_40px_-32px_rgba(63,31,22,0.55)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                        <div>
                            <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--app-ink)]">Pembelian</h1>
                            <p className="mt-0.5 text-sm text-stone-500">Catat barang masuk dan selesaikan utang supplier.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                            {canManage && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            prepareScannerTone();
                                            setScannerOpen(true);
                                        }}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-[var(--app-ink)] transition hover:border-orange-200 hover:bg-orange-50 focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none sm:text-sm"
                                    >
                                        <Camera className="size-4 text-[var(--app-primary)]" /> Scan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentOpen(true)}
                                        disabled={unpaidPurchases.length === 0}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-[var(--app-ink)] transition hover:border-orange-200 hover:bg-orange-50 focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 sm:text-sm"
                                    >
                                        <CircleDollarSign className="size-4 text-emerald-600" />
                                        Bayar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPurchaseOpen(true)}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-3 text-xs font-black text-[var(--app-primary-foreground)] shadow-[0_10px_20px_-12px_var(--app-primary)] transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:outline-none sm:text-sm"
                                    >
                                        <Plus className="size-4" /> Tambah
                                    </button>
                                </>
                            )}
                        </div>
                    </header>
                    {scannerSummary && (
                        <p role="status" className="rounded-xl bg-[var(--app-soft)] px-4 py-3 text-sm font-bold text-[var(--app-primary)]">
                            {scannerSummary.added} {t('produk ditambahkan')}.
                            {scannerSummary.skipped > 0
                                ? ` ${scannerSummary.skipped} ${t('tidak tersedia di daftar pembelian')}.`
                                : ` ${t('Periksa jumlah dan harga sebelum simpan.')}`}
                        </p>
                    )}

                    {canManage && (
                        <Sheet
                            open={purchaseOpen}
                            onOpenChange={(open) => {
                                setPurchaseOpen(open);

                                if (!open) {
                                    purchase.clearErrors();
                                }
                            }}
                        >
                            <SheetContent className="w-full gap-0 overflow-hidden border-stone-200 bg-white p-0 sm:max-w-2xl lg:max-w-4xl">
                                <form onSubmit={submitPurchase} className="flex min-h-0 flex-1 flex-col">
                                    <SheetHeader className="border-b border-stone-200 px-4 py-4 pr-12 sm:px-6">
                                        <SheetTitle className="flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[var(--app-ink)]">
                                            <PackagePlus className="size-5" />
                                            Tambah pembelian
                                        </SheetTitle>
                                    </SheetHeader>
                                    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
                                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                                            <div className={labelClass}>
                                                <div className="flex min-h-6 items-center justify-between gap-2">
                                                    <label htmlFor="purchase-supplier">Supplier</label>
                                                    <span className="flex items-center gap-2 text-xs font-black">
                                                        <Link
                                                            href="/master-data/suppliers?create=1"
                                                            className="text-teal-700 underline decoration-teal-700/30 underline-offset-4 hover:text-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:outline-none"
                                                        >
                                                            Tambah
                                                        </Link>
                                                        <Link
                                                            href="/master-data/suppliers"
                                                            className="text-stone-500 underline decoration-stone-400/30 underline-offset-4 hover:text-stone-800 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:outline-none"
                                                        >
                                                            Kelola
                                                        </Link>
                                                    </span>
                                                </div>
                                                <select
                                                    id="purchase-supplier"
                                                    className={fieldClass}
                                                    value={purchase.data.supplier_id}
                                                    onChange={(event) => purchase.setData('supplier_id', event.target.value)}
                                                    required
                                                >
                                                    {activeSuppliers.map((supplier) => (
                                                        <option key={supplier.public_id} value={supplier.public_id}>
                                                            {supplier.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <label className={labelClass}>
                                                Nomor invoice supplier
                                                <input
                                                    className={fieldClass}
                                                    value={purchase.data.supplier_invoice_number}
                                                    onChange={(event) => purchase.setData('supplier_invoice_number', event.target.value)}
                                                    maxLength={100}
                                                />
                                            </label>
                                            <label className={labelClass}>
                                                Waktu transaksi
                                                <input
                                                    className={fieldClass}
                                                    type="datetime-local"
                                                    value={purchase.data.occurred_at}
                                                    onChange={(event) => purchase.setData('occurred_at', event.target.value)}
                                                    required
                                                />
                                            </label>
                                        </div>
                                        <div className="mt-5 space-y-3">
                                            {purchase.data.items.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"
                                                >
                                                    <label className={labelClass}>
                                                        Produk / satuan
                                                        <select
                                                            className={fieldClass}
                                                            value={`${item.product_id}:${item.unit_id}`}
                                                            onChange={(event) => chooseProduct(index, event.target.value)}
                                                            required
                                                        >
                                                            {products.map((option) => (
                                                                <option
                                                                    key={`${option.product_id}:${option.unit_id}`}
                                                                    value={`${option.product_id}:${option.unit_id}`}
                                                                >
                                                                    {option.product_name} · {option.unit_symbol} (x
                                                                    {quantity(option.conversion_factor)})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </label>
                                                    <label className={labelClass}>
                                                        Jumlah
                                                        <input
                                                            className={fieldClass}
                                                            type="number"
                                                            min="0.000001"
                                                            step="0.000001"
                                                            value={item.quantity}
                                                            onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                                                            required
                                                        />
                                                    </label>
                                                    <label className={labelClass}>
                                                        Harga / satuan
                                                        <input
                                                            className={fieldClass}
                                                            type="number"
                                                            min="0"
                                                            step="0.0001"
                                                            value={item.unit_price}
                                                            onChange={(event) => updateItem(index, 'unit_price', event.target.value)}
                                                            required
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        aria-label="Hapus item"
                                                        className="mt-6 grid size-11 place-items-center rounded-xl border border-red-200 text-red-700 disabled:opacity-30"
                                                        disabled={purchase.data.items.length === 1}
                                                        onClick={() =>
                                                            purchase.setData(
                                                                'items',
                                                                purchase.data.items.filter((_, itemIndex) => itemIndex !== index),
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-2 rounded-xl border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800"
                                                onClick={() =>
                                                    purchase.setData('items', [...purchase.data.items, defaultItem(products[0])])
                                                }
                                            >
                                                <Plus className="size-4" />
                                                Tambah item
                                            </button>
                                        </div>
                                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                                            <label className={labelClass}>
                                                Diskon transaksi
                                                <input
                                                    className={fieldClass}
                                                    type="number"
                                                    min="0"
                                                    step="0.0001"
                                                    value={purchase.data.discount_amount}
                                                    onChange={(event) => purchase.setData('discount_amount', event.target.value)}
                                                    required
                                                />
                                            </label>
                                            <label className={labelClass}>
                                                Biaya tambahan
                                                <input
                                                    className={fieldClass}
                                                    type="number"
                                                    min="0"
                                                    step="0.0001"
                                                    value={purchase.data.additional_cost}
                                                    onChange={(event) => purchase.setData('additional_cost', event.target.value)}
                                                    required
                                                />
                                            </label>
                                            <div className="rounded-2xl bg-[var(--app-ink)] px-4 py-3 text-white">
                                                <p className="text-xs text-teal-100/70">Estimasi total</p>
                                                <p className="mt-1 text-xl font-bold text-amber-300">{money(grandTotal)}</p>
                                            </div>
                                            <label className={labelClass}>
                                                Bayar sekarang
                                                <input
                                                    className={fieldClass}
                                                    type="number"
                                                    min="0"
                                                    step="0.0001"
                                                    value={purchase.data.paid_amount}
                                                    onChange={(event) => purchase.setData('paid_amount', event.target.value)}
                                                    required
                                                />
                                            </label>
                                            <label className={labelClass}>
                                                Akun pembayaran
                                                <select
                                                    className={fieldClass}
                                                    value={purchase.data.account_id}
                                                    onChange={(event) => purchase.setData('account_id', event.target.value)}
                                                    disabled={Number(purchase.data.paid_amount) <= 0}
                                                >
                                                    {accounts.map((account) => (
                                                        <option key={account.public_id} value={account.public_id}>
                                                            {account.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className={labelClass}>
                                                Catatan
                                                <input
                                                    className={fieldClass}
                                                    value={purchase.data.notes}
                                                    onChange={(event) => purchase.setData('notes', event.target.value)}
                                                    maxLength={500}
                                                />
                                            </label>
                                        </div>
                                        {Object.keys(purchase.errors).length > 0 && (
                                            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                                                Periksa kembali input pembelian. Beberapa nilai belum valid.
                                            </p>
                                        )}
                                        <button
                                            className={`${buttonClass} mt-5`}
                                            disabled={purchase.processing || products.length === 0 || activeSuppliers.length === 0}
                                        >
                                            Posting pembelian
                                        </button>
                                    </div>
                                </form>
                            </SheetContent>
                        </Sheet>
                    )}

                    <div className="grid gap-6">
                        <section className={cardClass}>
                            <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-4 sm:px-5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-[var(--app-primary)]">
                                        <Building2 className="size-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="truncate text-base font-black text-[var(--app-ink)]">Posisi utang supplier</h2>
                                        <p className="text-xs text-stone-500">{suppliers.length} supplier terdaftar</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="hidden text-right sm:block">
                                        <p className="text-[10px] font-bold tracking-wide text-stone-400 uppercase">Total utang</p>
                                        <p className="text-sm font-black text-[var(--app-ink)] tabular-nums">{money(totalPayable)}</p>
                                    </div>
                                    <Link
                                        href="/master-data/suppliers"
                                        className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-stone-200 px-3 text-xs font-bold text-stone-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none sm:text-sm"
                                    >
                                        Kelola supplier
                                    </Link>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-stone-100 border-b border-stone-100 sm:grid-cols-3">
                                <div className="px-4 py-3 sm:px-5">
                                    <p className="text-xs font-medium text-stone-500">Total utang</p>
                                    <p className="mt-1 truncate text-lg font-black text-[var(--app-ink)] tabular-nums">
                                        {money(totalPayable)}
                                    </p>
                                </div>
                                <div className="px-4 py-3 sm:px-5">
                                    <p className="text-xs font-medium text-stone-500">Belum lunas</p>
                                    <p className="mt-1 text-lg font-black text-amber-700 tabular-nums">{unpaidPurchases.length}</p>
                                </div>
                                <div className="col-span-2 border-t border-stone-100 px-4 py-3 sm:col-span-1 sm:border-t-0 sm:px-5">
                                    <p className="text-xs font-medium text-stone-500">Dokumen pembelian</p>
                                    <p className="mt-1 text-lg font-black text-[var(--app-ink)] tabular-nums">{purchases.total}</p>
                                </div>
                            </div>
                            <div className="max-h-56 divide-y divide-stone-100 overflow-y-auto px-4 sm:px-5">
                                {suppliers.map((supplier) => (
                                    <div key={supplier.public_id} className="flex items-center justify-between gap-4 py-2.5">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-stone-800">{supplier.name}</p>
                                            <p className="text-xs text-stone-500">{supplier.is_active ? 'Aktif' : 'Nonaktif'}</p>
                                        </div>
                                        <p
                                            className={
                                                Number(supplier.payable_balance) > 0
                                                    ? 'shrink-0 text-sm font-black text-amber-700 tabular-nums'
                                                    : 'shrink-0 text-sm font-semibold text-stone-400 tabular-nums'
                                            }
                                        >
                                            {money(supplier.payable_balance)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {suppliers.length === 0 && (
                                <div className="px-4 py-8 text-center">
                                    <p className="text-sm font-semibold text-stone-600">Belum ada supplier.</p>
                                    {canManage && (
                                        <Link
                                            href="/master-data/suppliers?create=1"
                                            className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[var(--app-primary)] px-3 text-sm font-black text-[var(--app-primary-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--app-ink)] focus-visible:ring-offset-2 focus-visible:outline-none"
                                        >
                                            Tambah supplier
                                        </Link>
                                    )}
                                </div>
                            )}
                        </section>
                        {canManage && (
                            <Sheet
                                open={paymentOpen}
                                onOpenChange={(open) => {
                                    setPaymentOpen(open);

                                    if (!open) {
                                        payment.clearErrors();
                                    }
                                }}
                            >
                                <SheetContent className="w-full gap-0 overflow-hidden border-stone-200 bg-white p-0 sm:max-w-xl">
                                    <form onSubmit={submitPayment} className="flex min-h-0 flex-1 flex-col">
                                        <SheetHeader className="border-b border-stone-200 px-4 py-4 pr-12 sm:px-6">
                                            <SheetTitle className="flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[var(--app-ink)]">
                                                <CircleDollarSign className="size-5" />
                                                Bayar utang pembelian
                                            </SheetTitle>
                                        </SheetHeader>
                                        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
                                            <p className="mt-4 text-sm text-stone-600">
                                                Nominal tidak boleh melebihi sisa utang atau saldo akun.
                                            </p>
                                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                                <label className={`${labelClass} md:col-span-2`}>
                                                    Dokumen
                                                    <select
                                                        className={fieldClass}
                                                        value={payment.data.purchase_id}
                                                        onChange={(event) => {
                                                            const selected = unpaidPurchases.find(
                                                                (entry) => entry.public_id === event.target.value,
                                                            );
                                                            payment.setData((data) => ({
                                                                ...data,
                                                                purchase_id: event.target.value,
                                                                amount: selected?.outstanding_amount ?? '',
                                                            }));
                                                        }}
                                                        required
                                                    >
                                                        <option value="">Pilih dokumen</option>
                                                        {unpaidPurchases.map((entry) => (
                                                            <option key={entry.public_id} value={entry.public_id}>
                                                                {entry.document_number} · {entry.supplier_name} · sisa{' '}
                                                                {money(entry.outstanding_amount)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className={labelClass}>
                                                    Akun
                                                    <select
                                                        className={fieldClass}
                                                        value={payment.data.account_id}
                                                        onChange={(event) => payment.setData('account_id', event.target.value)}
                                                        required
                                                    >
                                                        {accounts.map((account) => (
                                                            <option key={account.public_id} value={account.public_id}>
                                                                {account.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label className={labelClass}>
                                                    Nominal
                                                    <input
                                                        className={fieldClass}
                                                        type="number"
                                                        min="0.0001"
                                                        step="0.0001"
                                                        value={payment.data.amount}
                                                        onChange={(event) => payment.setData('amount', event.target.value)}
                                                        required
                                                    />
                                                </label>
                                                <label className={labelClass}>
                                                    Waktu
                                                    <input
                                                        className={fieldClass}
                                                        type="datetime-local"
                                                        value={payment.data.occurred_at}
                                                        onChange={(event) => payment.setData('occurred_at', event.target.value)}
                                                        required
                                                    />
                                                </label>
                                                <label className={labelClass}>
                                                    Catatan
                                                    <input
                                                        className={fieldClass}
                                                        value={payment.data.notes}
                                                        onChange={(event) => payment.setData('notes', event.target.value)}
                                                        maxLength={500}
                                                    />
                                                </label>
                                            </div>
                                            {Object.keys(payment.errors).length > 0 && (
                                                <p className="mt-4 text-sm text-red-700">
                                                    Pembayaran belum valid. Periksa nominal, akun, dan waktu.
                                                </p>
                                            )}
                                            <button
                                                className={`${buttonClass} mt-5`}
                                                disabled={payment.processing || !payment.data.purchase_id}
                                            >
                                                Posting pembayaran
                                            </button>
                                        </div>
                                    </form>
                                </SheetContent>
                            </Sheet>
                        )}
                    </div>

                    <section className={cardClass}>
                        <div className="flex gap-1 border-b border-stone-100 p-1.5" role="tablist" aria-label="Data pembelian">
                            <DataTab
                                active={activeView === 'purchases'}
                                icon={ReceiptText}
                                label="Riwayat pembelian"
                                count={purchases.total}
                                onClick={() => setActiveView('purchases')}
                            />
                            <DataTab
                                active={activeView === 'payables'}
                                icon={Clock3}
                                label="Buku utang"
                                count={payableTransactions.total}
                                onClick={() => setActiveView('payables')}
                            />
                        </div>
                        {activeView === 'purchases' ? (
                            <PurchaseHistory purchases={purchases} timezone={timezone} />
                        ) : (
                            <PayableLedger transactions={payableTransactions} timezone={timezone} />
                        )}
                    </section>
                </div>
            </div>
            <Suspense
                fallback={
                    <div role="status" className="fixed inset-0 z-[90] grid place-items-center bg-black/80 text-white">
                        Membuka kamera…
                    </div>
                }
            >
                <ProductScanner
                    purpose="purchase"
                    title="Scan produk pembelian"
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onConfirm={addScannerSelections}
                    onManualSearch={() => setScannerOpen(false)}
                />
            </Suspense>
        </>
    );
}

function DataTab({
    active,
    icon: Icon,
    label,
    count,
    onClick,
}: {
    active: boolean;
    icon: LucideIcon;
    label: string;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            role="tab"
            aria-selected={active}
            onClick={onClick}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none sm:px-3 sm:text-sm ${
                active
                    ? 'bg-[var(--app-primary)] text-white shadow-[0_8px_20px_-14px_var(--app-primary)]'
                    : 'text-stone-500 hover:bg-orange-50 hover:text-[var(--app-primary)]'
            }`}
        >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{label}</span>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-white/20' : 'bg-stone-100'}`}>{count}</span>
        </button>
    );
}

function PurchaseHistory({ purchases, timezone }: { purchases: Page<Purchase>; timezone: string }) {
    return (
        <div role="tabpanel">
            <div className="divide-y divide-stone-100">
                {purchases.data.map((entry) => {
                    const hasDebt = Number(entry.outstanding_amount) > 0;

                    return (
                        <article key={entry.public_id} className="px-4 py-4 sm:px-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-black text-[var(--app-ink)]">{entry.document_number}</p>
                                        <span
                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${
                                                hasDebt ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                            }`}
                                        >
                                            {hasDebt ? <Clock3 className="size-3" /> : <CheckCircle2 className="size-3" />}
                                            {hasDebt ? 'Belum lunas' : 'Lunas'}
                                        </span>
                                    </div>
                                    <p className="mt-1 truncate text-sm font-medium text-stone-700">{entry.supplier_name}</p>
                                    <p className="mt-0.5 text-xs text-stone-500">
                                        {ledgerDateTime(entry.occurred_at, timezone)}
                                        {entry.supplier_invoice_number ? ` · Invoice ${entry.supplier_invoice_number}` : ''}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-sm font-black text-[var(--app-ink)] tabular-nums">{money(entry.total_amount)}</p>
                                    {hasDebt && (
                                        <p className="mt-1 text-xs font-bold text-amber-700 tabular-nums">
                                            Sisa {money(entry.outstanding_amount)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                {entry.items.map((item, index) => (
                                    <div
                                        key={`${entry.public_id}-${index}`}
                                        className="max-w-sm min-w-[13rem] rounded-xl bg-stone-50 px-3 py-2.5"
                                    >
                                        <p className="truncate text-xs font-bold text-stone-800">{item.product_name}</p>
                                        <p className="mt-1 text-xs text-stone-500 tabular-nums">
                                            {quantity(item.quantity)} {item.unit_symbol} · {money(item.landed_total)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </div>
            {purchases.data.length === 0 && <EmptyState icon={ReceiptText} text="Belum ada pembelian." />}
            <div className="border-t border-stone-100 px-4 py-4">
                <Pagination links={linksForView(purchases.links, 'purchases')} />
            </div>
        </div>
    );
}

function PayableLedger({ transactions, timezone }: { transactions: Page<PayableTransaction>; timezone: string }) {
    return (
        <div role="tabpanel">
            <div className="divide-y divide-stone-100">
                {transactions.data.map((entry) => {
                    const increase = entry.direction === 'increase';
                    const Icon = increase ? ArrowUpRight : ArrowDownLeft;

                    return (
                        <article
                            key={entry.public_id}
                            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[auto_minmax(12rem,1fr)_minmax(10rem,auto)_minmax(9rem,auto)] sm:px-5"
                        >
                            <div
                                className={`grid size-9 place-items-center rounded-xl ${
                                    increase ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                }`}
                            >
                                <Icon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[var(--app-ink)]">{entry.supplier_name}</p>
                                <p className="mt-0.5 truncate text-xs text-stone-500">{ledgerDateTime(entry.occurred_at, timezone)}</p>
                            </div>
                            <div className="hidden sm:block">
                                <span
                                    className={`rounded-md px-2 py-1 text-xs font-bold ${
                                        increase ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                    }`}
                                >
                                    {entry.reason === 'purchase' ? 'Pembelian' : 'Pembayaran'}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-black tabular-nums ${increase ? 'text-amber-700' : 'text-emerald-700'}`}>
                                    {increase ? '+' : '-'}
                                    {money(entry.amount)}
                                </p>
                                <p className="mt-0.5 text-[11px] text-stone-500 tabular-nums">Saldo {money(entry.balance_after)}</p>
                            </div>
                        </article>
                    );
                })}
            </div>
            {transactions.data.length === 0 && <EmptyState icon={Clock3} text="Belum ada pergerakan utang." />}
            <div className="border-t border-stone-100 px-4 py-4">
                <Pagination links={linksForView(transactions.links, 'payables')} />
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
    return (
        <div className="grid place-items-center px-4 py-12 text-center">
            <div className="grid size-11 place-items-center rounded-xl bg-orange-50 text-[var(--app-primary)]">
                <Icon className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-stone-500">{text}</p>
        </div>
    );
}
