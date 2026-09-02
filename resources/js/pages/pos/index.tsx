import { Head, Link, useForm } from '@inertiajs/react';
import {
    Barcode,
    Banknote,
    Camera,
    Keyboard,
    Minus,
    PackageOpen,
    Plus,
    ReceiptText,
    Search,
    ShoppingCart,
    QrCode,
    Trash2,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    currentDateTime,
    money,
    postingToken,
    quantity,
} from '@/components/operations-shell';
import type {
    ScannerProductCandidate,
    ScannerSelection,
} from '@/components/product-scanner/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { localeTag } from '@/lib/currency';

type ProductOption = {
    catalog_product_id: string;
    catalog_product_name: string;
    photo_url: string | null;
    product_id: string;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    barcode: string | null;
    unit_id: string;
    unit_name: string;
    unit_symbol: string;
    conversion_factor: string;
    selling_price: string;
    stock_quantity: string;
    minimum_quantity: string;
    is_base_unit: boolean | number;
};
type CatalogProduct = {
    id: string;
    name: string;
    photo_url: string | null;
    sku: string | null;
    barcode: string | null;
    options: ProductOption[];
};
type PaymentMethod = {
    method: 'cash' | 'qris';
    label: string;
    account_id: string;
};
type CartItem = ProductOption & {
    quantity: string;
    discount_amount: string;
};
type SaleForm = {
    account_id: string;
    transaction_discount_amount: string;
    paid_amount: string;
    occurred_at: string;
    notes: string;
    idempotency_key: string;
    items: CartItem[];
};
type EntryMode = 'input' | 'scan';

const ProductScanner = lazy(
    () => import('@/components/product-scanner/ProductScanner'),
);

const fieldClass =
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15';

export default function PosPage({
    products,
    paymentMethods,
    timezone,
}: {
    products: ProductOption[];
    paymentMethods: PaymentMethod[];
    timezone: string;
}) {
    const [entryMode, setEntryMode] = useState<EntryMode>('input');
    const [search, setSearch] = useState('');
    const [barcode, setBarcode] = useState('');
    const [scanError, setScanError] = useState('');
    const [scannerOpen, setScannerOpen] = useState(
        () =>
            typeof window !== 'undefined' &&
            new URL(window.location.href).searchParams.get('scan') === '1',
    );
    const [scannerSummary, setScannerSummary] = useState('');
    const [selectedProduct, setSelectedProduct] =
        useState<CatalogProduct | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const scanRef = useRef<HTMLInputElement>(null);
    const sale = useForm<SaleForm>({
        account_id: paymentMethods[0]?.account_id ?? '',
        transaction_discount_amount: '0',
        paid_amount: '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
        items: [],
    });
    const catalog = useMemo(
        () =>
            Array.from(
                products.reduce((grouped, option) => {
                    const product = grouped.get(option.catalog_product_id);

                    if (product) {
                        product.options.push(option);
                        product.photo_url ??= option.photo_url;
                    } else {
                        grouped.set(option.catalog_product_id, {
                            id: option.catalog_product_id,
                            name: option.catalog_product_name,
                            photo_url: option.photo_url,
                            sku: option.sku,
                            barcode: option.barcode,
                            options: [option],
                        });
                    }

                    return grouped;
                }, new Map<string, CatalogProduct>()),
            ).map(([, product]) => product),
        [products],
    );
    const normalizedSearch = search.trim().toLocaleLowerCase(localeTag());
    const visibleProducts = catalog.filter(
        (product) =>
            !normalizedSearch ||
            product.name
                .toLocaleLowerCase(localeTag())
                .includes(normalizedSearch) ||
            product.sku
                ?.toLocaleLowerCase(localeTag())
                .includes(normalizedSearch) ||
            product.barcode?.includes(normalizedSearch) ||
            product.options.some(
                (option) =>
                    option.variant_name
                        ?.toLocaleLowerCase(localeTag())
                        .includes(normalizedSearch) ||
                    option.sku
                        ?.toLocaleLowerCase(localeTag())
                        .includes(normalizedSearch) ||
                    option.barcode?.includes(normalizedSearch),
            ),
    );
    const available = (product: ProductOption) =>
        Number(product.stock_quantity) / Number(product.conversion_factor);
    const isCritical = (product: ProductOption) =>
        available(product) <=
        Number(product.minimum_quantity) / Number(product.conversion_factor);
    const scannerProducts = useMemo<ScannerProductCandidate[]>(
        () =>
            catalog.map((product) => ({
                productPublicId: product.id,
                name: product.name,
                photoUrl: product.photo_url,
                confidence: null,
                methods: [],
                options: product.options.map((option) => ({
                    id: `${option.product_id}:${option.unit_id}`,
                    productId: option.product_id,
                    productPublicId: product.id,
                    variantPublicId:
                        option.product_id === product.id
                            ? null
                            : option.product_id,
                    variantName: option.variant_name,
                    unitId: option.unit_id,
                    unitName: option.unit_name,
                    unitSymbol: option.unit_symbol,
                    purchasePrice: '0',
                    sellingPrice: option.selling_price,
                    stockQuantity: String(
                        Number(option.stock_quantity) /
                            Number(option.conversion_factor),
                    ),
                })),
            })),
        [catalog],
    );
    const subtotal = sale.data.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.selling_price),
        0,
    );
    const itemDiscount = sale.data.items.reduce(
        (sum, item) => sum + Number(item.discount_amount || 0),
        0,
    );
    const total = Math.max(
        0,
        subtotal -
            itemDiscount -
            Number(sale.data.transaction_discount_amount || 0),
    );
    const selectedMethod = paymentMethods.find(
        (method) => method.account_id === sale.data.account_id,
    );
    const change = Math.max(0, Number(sale.data.paid_amount || 0) - total);
    const cashSuggestions = Array.from(
        new Set([
            Math.ceil(total / 1000) * 1000,
            Math.ceil(total / 5000) * 5000,
            Math.ceil(total / 10000) * 10000,
        ]),
    ).filter((amount) => amount >= total && amount > 0);

    useEffect(() => {
        const url = new URL(window.location.href);

        if (!scannerOpen || url.searchParams.get('scan') !== '1') {
            return;
        }

        url.searchParams.delete('scan');
        window.history.replaceState({}, '', url);
    }, [scannerOpen]);

    const focusEntry = (mode: EntryMode = entryMode) => {
        window.setTimeout(
            () => (mode === 'input' ? searchRef : scanRef).current?.focus(),
            0,
        );
    };
    const restoreEntry = () => {
        if (entryMode === 'input') {
            setSearch('');
        } else {
            setBarcode('');
        }

        focusEntry();
    };
    const addProduct = (product: ProductOption) => {
        if (available(product) <= 0) {
            return;
        }

        const existing = sale.data.items.find(
            (item) =>
                item.product_id === product.product_id &&
                item.unit_id === product.unit_id,
        );

        if (existing) {
            sale.setData(
                'items',
                sale.data.items.map((item) =>
                    item === existing
                        ? {
                              ...item,
                              quantity: String(
                                  Math.min(
                                      Number(item.quantity) + 1,
                                      available(product),
                                  ),
                              ),
                          }
                        : item,
                ),
            );
        } else {
            sale.setData('items', [
                ...sale.data.items,
                { ...product, quantity: '1', discount_amount: '0' },
            ]);
        }

        setSelectedProduct(null);
        setScanError('');
        restoreEntry();
    };
    const addScannerSelections = (selections: ScannerSelection[]) => {
        let added = 0;
        let skipped = 0;
        sale.setData((data) => {
            const items = [...data.items];
            selections.forEach((selection) => {
                const option = products.find(
                    (product) =>
                        product.product_id === selection.productId &&
                        product.unit_id === selection.unitId,
                );

                if (!option || available(option) <= 0) {
                    skipped++;

                    return;
                }

                const index = items.findIndex(
                    (item) =>
                        item.product_id === option.product_id &&
                        item.unit_id === option.unit_id,
                );

                if (index >= 0) {
                    items[index] = {
                        ...items[index],
                        quantity: String(
                            Math.min(
                                Number(items[index].quantity) +
                                    selection.quantity,
                                available(option),
                            ),
                        ),
                    };
                } else {
                    items.push({
                        ...option,
                        quantity: String(
                            Math.min(selection.quantity, available(option)),
                        ),
                        discount_amount: '0',
                    });
                }

                added++;
            });

            return { ...data, items };
        });
        setScannerSummary(
            skipped > 0
                ? `${added} produk ditambahkan, ${skipped} dilewati karena tidak tersedia atau stok habis.`
                : `${added} produk ditambahkan ke keranjang.`,
        );
    };
    const chooseProduct = (product: CatalogProduct) => {
        setSelectedProduct(product);
    };
    const updateItem = (index: number, changes: Partial<CartItem>) =>
        sale.setData(
            'items',
            sale.data.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...changes } : item,
            ),
        );
    const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        const exactMatches = products.filter(
            (product) =>
                product.barcode === search ||
                product.sku?.toLocaleLowerCase(localeTag()) ===
                    normalizedSearch,
        );
        const exact =
            exactMatches.find((product) => Boolean(product.is_base_unit)) ??
            exactMatches[0];

        if (exactMatches.length === 1 && exact) {
            addProduct(exact);
        } else if (visibleProducts.length === 1) {
            chooseProduct(visibleProducts[0]);
        }
    };
    const scanBarcode = () => {
        const scannedBarcode = barcode.trim();
        const exactMatches = products.filter(
            (product) => product.barcode === scannedBarcode,
        );
        const exact =
            exactMatches.find((product) => Boolean(product.is_base_unit)) ??
            exactMatches[0];

        if (!exact) {
            setScanError('Barcode tidak ditemukan.');
            focusEntry('scan');

            return;
        }

        if (available(exact) <= 0) {
            setScanError('Stok produk habis.');
            focusEntry('scan');

            return;
        }

        addProduct(exact);
    };
    const onScanKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        scanBarcode();
    };
    const selectEntryMode = (mode: EntryMode) => {
        setEntryMode(mode);
        setScanError('');

        if (mode === 'scan') {
            setBarcode('');
        }

        focusEntry(mode);
    };
    const selectPaymentMethod = (method: PaymentMethod) => {
        sale.setData((data) => ({
            ...data,
            account_id: method.account_id,
            paid_amount: method.method === 'qris' ? String(total) : '',
        }));
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        sale.transform((data) => ({
            ...data,
            paid_amount:
                selectedMethod?.method === 'qris'
                    ? String(total)
                    : data.paid_amount,
        }));
        sale.post('/pos/sales', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Kasir POS" />
            <div className="min-h-full bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] p-3 sm:p-4 lg:p-5">
                <div className="mx-auto grid max-w-[1500px] gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.75fr)]">
                    <section className="min-w-0 space-y-4">
                        <header className="rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--app-ink)]">
                                    Kasir
                                </h1>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setScannerOpen(true)}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--app-primary)] px-3 text-xs font-black text-[var(--app-primary-foreground)] hover:bg-[var(--workspace-700)]"
                                    >
                                        <Camera className="size-4" />
                                        Scan kamera
                                    </button>
                                    <Link
                                        href="/sales"
                                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--app-soft)] px-3 text-xs font-bold text-[var(--app-primary)] hover:bg-[var(--app-soft-strong)]"
                                    >
                                        <ReceiptText className="size-4" />
                                        Riwayat & retur
                                    </Link>
                                </div>
                            </div>
                            {scannerSummary && (
                                <p
                                    role="status"
                                    className="mt-3 rounded-xl bg-[var(--app-soft)] px-3 py-2 text-xs font-bold text-[var(--app-primary)]"
                                >
                                    {scannerSummary}
                                </p>
                            )}
                            <div className="mt-4 rounded-2xl bg-[var(--app-soft)] p-1.5 shadow-[var(--app-ink)]/5 shadow-inner">
                                <div
                                    className="grid grid-cols-2 gap-1"
                                    role="tablist"
                                    aria-label="Mode tambah produk"
                                >
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={entryMode === 'input'}
                                        aria-controls="input-product-panel"
                                        onClick={() => selectEntryMode('input')}
                                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none ${
                                            entryMode === 'input'
                                                ? 'bg-white text-[var(--app-ink)] shadow-sm'
                                                : 'text-[var(--muted-foreground)] hover:bg-white/60'
                                        }`}
                                    >
                                        <Keyboard className="size-4" />
                                        Input produk
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={entryMode === 'scan'}
                                        aria-controls="scan-barcode-panel"
                                        onClick={() => selectEntryMode('scan')}
                                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none ${
                                            entryMode === 'scan'
                                                ? 'bg-white text-[var(--app-ink)] shadow-sm'
                                                : 'text-[var(--muted-foreground)] hover:bg-white/60'
                                        }`}
                                    >
                                        <Barcode className="size-4" />
                                        Scan barcode
                                    </button>
                                </div>
                            </div>

                            {entryMode === 'input' ? (
                                <div
                                    id="input-product-panel"
                                    role="tabpanel"
                                    className="relative mt-3"
                                >
                                    <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        ref={searchRef}
                                        autoFocus
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        onKeyDown={onSearchKeyDown}
                                        placeholder="Cari nama produk atau SKU"
                                        aria-label="Cari produk"
                                        className="h-11 w-full rounded-xl border border-[var(--app-ink)]/10 bg-[#fffaf7] pr-4 pl-11 text-sm text-slate-950 outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary)]/15"
                                    />
                                </div>
                            ) : (
                                <div
                                    id="scan-barcode-panel"
                                    role="tabpanel"
                                    className="mt-3 rounded-2xl border border-[var(--app-ink)]/10 bg-[#fffaf7] p-3"
                                >
                                    <div className="flex gap-2">
                                        <div className="relative min-w-0 flex-1">
                                            <Barcode className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--app-primary)]" />
                                            <input
                                                ref={scanRef}
                                                value={barcode}
                                                onChange={(event) => {
                                                    setBarcode(
                                                        event.target.value,
                                                    );
                                                    setScanError('');
                                                }}
                                                onKeyDown={onScanKeyDown}
                                                placeholder="Scan barcode"
                                                aria-label="Scan barcode"
                                                aria-invalid={Boolean(
                                                    scanError,
                                                )}
                                                className="h-12 w-full rounded-xl border border-[var(--app-ink)]/10 bg-white pr-3 pl-11 text-base font-bold text-slate-950 outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary)]/15"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={scanBarcode}
                                            disabled={!barcode.trim()}
                                            className="min-h-12 shrink-0 rounded-xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] transition hover:bg-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Tambah
                                        </button>
                                    </div>
                                    {scanError && (
                                        <p className="mt-2 text-sm font-semibold text-red-600">
                                            {scanError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </header>

                        {entryMode === 'input' && (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                                {visibleProducts.map((product) => {
                                    const prices = product.options.map(
                                        (option) =>
                                            Number(option.selling_price),
                                    );
                                    const minimumPrice = Math.min(...prices);
                                    const maximumPrice = Math.max(...prices);
                                    const criticalStock =
                                        product.options.some(isCritical);

                                    return (
                                        <button
                                            type="button"
                                            key={product.id}
                                            onClick={() =>
                                                chooseProduct(product)
                                            }
                                            className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--app-ink)]/10 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--app-primary)]/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                                        >
                                            <div className="aspect-[4/3] overflow-hidden bg-[var(--app-soft)]">
                                                {product.photo_url ? (
                                                    <img
                                                        src={product.photo_url}
                                                        alt={product.name}
                                                        loading="lazy"
                                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                                                    />
                                                ) : (
                                                    <span className="grid h-full place-items-center text-[var(--muted-foreground)]">
                                                        <PackageOpen className="size-8" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex min-h-24 flex-col justify-between gap-3 p-3 sm:min-h-28 sm:p-3.5">
                                                <p className="line-clamp-2 text-sm leading-snug font-bold text-slate-900 sm:text-base">
                                                    {product.name}
                                                </p>
                                                <p className="text-base font-black tracking-[-0.02em] text-[var(--app-primary)] sm:text-lg">
                                                    {money(minimumPrice)}
                                                    {maximumPrice !==
                                                        minimumPrice && (
                                                        <span className="block text-[11px] leading-tight font-bold text-slate-500 sm:text-xs">
                                                            sampai{' '}
                                                            {money(
                                                                maximumPrice,
                                                            )}
                                                        </span>
                                                    )}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    {criticalStock && (
                                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">
                                                            Kritis
                                                        </span>
                                                    )}
                                                    <p
                                                        className={`text-[11px] font-bold ${criticalStock ? 'text-red-600' : 'text-slate-500'}`}
                                                    >
                                                        Stok tersisa{' '}
                                                        {Math.min(
                                                            ...product.options.map(
                                                                (option) =>
                                                                    available(
                                                                        option,
                                                                    ),
                                                            ),
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {entryMode === 'input' &&
                            visibleProducts.length === 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                                    Produk tidak ditemukan.
                                </div>
                            )}
                    </section>

                    <form
                        onSubmit={submit}
                        className="h-fit min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/8 sm:p-5 xl:sticky xl:top-5"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-700">
                                    <ShoppingCart className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="font-serif text-2xl text-slate-900">
                                        Keranjang
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        {sale.data.items.length} jenis barang
                                    </p>
                                </div>
                            </div>
                            {sale.data.items.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => sale.setData('items', [])}
                                    className="min-h-11 shrink-0 px-2 text-xs font-bold text-red-600"
                                >
                                    Kosongkan
                                </button>
                            )}
                        </div>

                        <div className="mt-5 max-h-[48vh] space-y-3 overflow-y-auto pr-1">
                            {sale.data.items.map((item, index) => {
                                const lineTotal = Math.max(
                                    0,
                                    Number(item.quantity) *
                                        Number(item.selling_price) -
                                        Number(item.discount_amount || 0),
                                );

                                return (
                                    <article
                                        key={`${item.product_id}:${item.unit_id}`}
                                        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-900">
                                                    {item.catalog_product_name}
                                                </p>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                                    <span className="rounded-md bg-white px-2 py-0.5 font-semibold text-teal-800 ring-1 ring-slate-200">
                                                        {item.variant_name ||
                                                            item.unit_name}
                                                    </span>
                                                    <span>
                                                        {money(
                                                            item.selling_price,
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`font-bold ${isCritical(item) ? 'text-red-600' : 'text-slate-500'}`}
                                                    >
                                                        {isCritical(item) &&
                                                            'Kritis · '}
                                                        Stok {available(item)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-start gap-2">
                                                <strong className="pt-1 text-sm text-[var(--app-ink)]">
                                                    {money(lineTotal)}
                                                </strong>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        sale.setData(
                                                            'items',
                                                            sale.data.items.filter(
                                                                (
                                                                    _,
                                                                    itemIndex,
                                                                ) =>
                                                                    itemIndex !==
                                                                    index,
                                                            ),
                                                        )
                                                    }
                                                    aria-label={`Hapus ${item.catalog_product_name}`}
                                                    className="grid size-9 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                                            <div>
                                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                                                    Jumlah
                                                </span>
                                                <div className="flex w-full items-center overflow-hidden rounded-xl border border-slate-300 bg-white sm:w-fit">
                                                    <button
                                                        type="button"
                                                        aria-label={`Kurangi ${item.catalog_product_name}`}
                                                        className="grid size-11 shrink-0 place-items-center transition hover:bg-slate-50"
                                                        onClick={() =>
                                                            updateItem(index, {
                                                                quantity:
                                                                    String(
                                                                        Math.max(
                                                                            0.000001,
                                                                            Number(
                                                                                item.quantity,
                                                                            ) -
                                                                                1,
                                                                        ),
                                                                    ),
                                                            })
                                                        }
                                                    >
                                                        <Minus className="size-4" />
                                                    </button>
                                                    <input
                                                        aria-label={`Jumlah ${item.catalog_product_name}`}
                                                        className="h-11 min-w-0 flex-1 border-x border-slate-200 bg-white px-1 text-center text-sm sm:w-16 sm:flex-none"
                                                        type="number"
                                                        min="0.000001"
                                                        max={available(item)}
                                                        step="0.000001"
                                                        value={item.quantity}
                                                        onChange={(event) =>
                                                            updateItem(index, {
                                                                quantity:
                                                                    event.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Tambah ${item.catalog_product_name}`}
                                                        className="grid size-11 shrink-0 place-items-center transition hover:bg-slate-50"
                                                        onClick={() =>
                                                            updateItem(index, {
                                                                quantity:
                                                                    String(
                                                                        Math.min(
                                                                            available(
                                                                                item,
                                                                            ),
                                                                            Number(
                                                                                item.quantity,
                                                                            ) +
                                                                                1,
                                                                        ),
                                                                    ),
                                                            })
                                                        }
                                                    >
                                                        <Plus className="size-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <label className="block min-w-0">
                                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                                                    Diskon item
                                                </span>
                                                <input
                                                    className={fieldClass}
                                                    type="number"
                                                    min="0"
                                                    step="0.0001"
                                                    inputMode="decimal"
                                                    value={item.discount_amount}
                                                    onChange={(event) =>
                                                        updateItem(index, {
                                                            discount_amount:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                />
                                            </label>
                                        </div>
                                    </article>
                                );
                            })}
                            {sale.data.items.length === 0 && (
                                <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 px-4 py-9 text-center">
                                    <PackageOpen className="size-7 text-slate-400" />
                                    <p className="mt-2 text-sm text-slate-500">
                                        Pilih produk untuk mulai.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Subtotal</span>
                                <span>{money(subtotal)}</span>
                            </div>
                            {itemDiscount > 0 && (
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Diskon item</span>
                                    <span>-{money(itemDiscount)}</span>
                                </div>
                            )}
                            <label className="grid grid-cols-[minmax(0,1fr)_minmax(120px,150px)] items-center gap-3 text-sm font-semibold text-slate-700">
                                <span>Diskon transaksi</span>
                                <input
                                    aria-label="Diskon transaksi"
                                    className={fieldClass}
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    inputMode="decimal"
                                    value={
                                        sale.data.transaction_discount_amount
                                    }
                                    onChange={(event) =>
                                        sale.setData(
                                            'transaction_discount_amount',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <div className="flex items-end justify-between gap-3 rounded-2xl bg-[var(--app-primary)] p-4 text-[var(--app-primary-foreground)]">
                                <span className="text-sm text-teal-50/70">
                                    Total
                                </span>
                                <strong className="text-right text-2xl text-orange-300">
                                    {money(total)}
                                </strong>
                            </div>

                            <fieldset>
                                <legend className="mb-2 text-sm font-semibold text-slate-700">
                                    Metode bayar
                                </legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {paymentMethods.map((method) => {
                                        const active =
                                            method.account_id ===
                                            sale.data.account_id;
                                        const pillClass = active
                                            ? 'border-[var(--app-ink)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-sm'
                                            : 'border-slate-300 bg-white text-slate-700 hover:border-teal-500 hover:bg-teal-50';

                                        return (
                                            <button
                                                key={method.account_id}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() =>
                                                    selectPaymentMethod(method)
                                                }
                                                className={`flex min-h-12 items-center justify-center rounded-xl border px-4 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none ${pillClass}`}
                                            >
                                                <span className="mr-2 inline-flex">
                                                    {method.method ===
                                                    'cash' ? (
                                                        <Banknote className="size-4" />
                                                    ) : (
                                                        <QrCode className="size-4" />
                                                    )}
                                                </span>
                                                {method.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>

                            {selectedMethod?.method === 'cash' ? (
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Uang diterima
                                        <input
                                            className={`${fieldClass} mt-1 text-lg font-bold`}
                                            type="number"
                                            min={total}
                                            step="0.0001"
                                            inputMode="decimal"
                                            value={sale.data.paid_amount}
                                            onChange={(event) =>
                                                sale.setData(
                                                    'paid_amount',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </label>
                                    {cashSuggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {cashSuggestions.map((amount) => (
                                                <button
                                                    type="button"
                                                    key={amount}
                                                    onClick={() =>
                                                        sale.setData(
                                                            'paid_amount',
                                                            String(amount),
                                                        )
                                                    }
                                                    className="min-h-10 flex-1 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 transition hover:border-teal-500 hover:bg-teal-50"
                                                >
                                                    {money(amount)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-bold text-teal-800">
                                        <span>Kembalian</span>
                                        <span>{money(change)}</span>
                                    </div>
                                </div>
                            ) : selectedMethod?.method === 'qris' ? (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-3 text-sm">
                                    <span className="font-semibold text-teal-800">
                                        Nominal QRIS
                                    </span>
                                    <strong className="text-teal-900">
                                        {money(total)}
                                    </strong>
                                </div>
                            ) : (
                                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                    Metode bayar belum tersedia.
                                </p>
                            )}

                            <input
                                className={fieldClass}
                                aria-label="Catatan"
                                placeholder="Catatan opsional"
                                value={sale.data.notes}
                                onChange={(event) =>
                                    sale.setData('notes', event.target.value)
                                }
                                maxLength={500}
                            />
                            {Object.keys(sale.errors).length > 0 && (
                                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                    Checkout gagal. Periksa stok, diskon, dan
                                    pembayaran.
                                </p>
                            )}
                            <button
                                disabled={
                                    sale.processing ||
                                    sale.data.items.length === 0 ||
                                    !selectedMethod ||
                                    sale.data.paid_amount === ''
                                }
                                className="h-14 w-full rounded-2xl bg-orange-600 text-base font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {sale.processing
                                    ? 'Memproses...'
                                    : `Bayar ${money(total)}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <Suspense fallback={null}>
                <ProductScanner
                    purpose="sale"
                    title="Scan produk untuk penjualan"
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onConfirm={addScannerSelections}
                    manualProducts={scannerProducts}
                    onManualSearch={() => {
                        setScannerOpen(false);
                        selectEntryMode('input');
                    }}
                />
            </Suspense>

            <Dialog
                open={selectedProduct !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedProduct(null);
                        restoreEntry();
                    }
                }}
            >
                <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-xl">
                    <DialogHeader className="border-b border-slate-200 bg-[#fffaf7] p-4 pr-12 text-left sm:p-5 sm:pr-12">
                        <div className="flex min-w-0 items-center gap-3">
                            {selectedProduct?.photo_url && (
                                <img
                                    src={selectedProduct.photo_url}
                                    alt=""
                                    className="size-14 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 sm:size-16"
                                />
                            )}
                            <div className="min-w-0">
                                <DialogTitle className="text-xl leading-tight font-black tracking-[-0.03em] text-[var(--app-ink)] sm:text-2xl">
                                    {selectedProduct?.name}
                                </DialogTitle>
                                {(selectedProduct?.sku ||
                                    selectedProduct?.barcode) && (
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                        {selectedProduct.sku && (
                                            <span>
                                                SKU {selectedProduct.sku}
                                            </span>
                                        )}
                                        {selectedProduct.barcode && (
                                            <span>
                                                {selectedProduct.barcode}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogDescription className="sr-only">
                            Detail stok dan pilihan produk
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid max-h-[calc(100dvh-7.5rem)] gap-2 overflow-y-auto p-3 sm:p-5">
                        {selectedProduct?.options.map((option) => {
                            const stock = available(option);

                            return (
                                <button
                                    type="button"
                                    key={`${option.product_id}:${option.unit_id}`}
                                    onClick={() => addProduct(option)}
                                    disabled={stock <= 0}
                                    className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-[var(--app-primary)]/50 hover:bg-[#fffaf7] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
                                >
                                    <div className="min-w-0">
                                        <p className="font-black text-slate-900">
                                            {option.variant_name ||
                                                option.unit_name}
                                        </p>
                                        <p
                                            className={`mt-1 text-xs font-bold ${
                                                stock > 0
                                                    ? 'text-[var(--app-primary)]'
                                                    : 'text-red-600'
                                            }`}
                                        >
                                            {stock > 0
                                                ? `Stok ${quantity(stock)} ${option.unit_symbol}`
                                                : 'Stok habis'}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <strong className="text-sm font-black text-[var(--app-ink)] sm:text-base">
                                            {money(option.selling_price)}
                                        </strong>
                                        <span className="grid size-9 place-items-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                                            <Plus className="size-4" />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
