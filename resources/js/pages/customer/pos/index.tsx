import { Head, Link, useForm } from '@inertiajs/react';
import {
    Barcode,
    Camera,
    ChevronDown,
    CreditCard,
    FileCheck2,
    Keyboard,
    Mail,
    Minus,
    PackageOpen,
    Plus,
    Phone,
    ReceiptText,
    RotateCcw,
    Search,
    ShoppingCart,
    ShoppingBag,
    Store,
    Trash2,
    Upload,
    UserRound,
    X,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CommerceBrandMark } from '@/components/commerce-brand-mark';
import { currentDateTime, money, postingToken, quantity } from '@/components/operations-shell';
import { prepareScannerTone } from '@/components/product-scanner/scanner-feedback';
import type { ScannerApplyResult, ScannerProductCandidate, ScannerSelection } from '@/components/product-scanner/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cashTenderSuggestions, localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';

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
    method: 'cash' | 'qris' | 'qr_payment' | 'bank_transfer' | 'e_wallet';
    label: string;
    account_id: string;
    brand: string | null;
};
type Marketplace = {
    code: string;
    label: string;
};
type CartItem = ProductOption & {
    quantity: string;
    discount_amount: string;
};
type SaleForm = {
    account_id: string;
    transaction_discount_amount: string;
    paid_amount: string;
    payment_proof: File | null;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    sales_channel: 'in_store' | 'marketplace';
    payment_method: PaymentMethod['method'] | 'marketplace';
    marketplace_code: string;
    external_order_number: string;
    occurred_at: string;
    notes: string;
    idempotency_key: string;
    items: CartItem[];
};
type EntryMode = 'input' | 'scan';

const ProductScanner = lazy(() => import('@/components/product-scanner/ProductScanner'));

const fieldClass =
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15';

export default function PosPage({
    products,
    paymentMethods,
    marketplaces,
    timezone,
}: {
    products: ProductOption[];
    paymentMethods: PaymentMethod[];
    marketplaces: Marketplace[];
    timezone: string;
}) {
    const [entryMode, setEntryMode] = useState<EntryMode>('input');
    const [search, setSearch] = useState('');
    const [barcode, setBarcode] = useState('');
    const [scanError, setScanError] = useState('');
    const [scannerOpen, setScannerOpen] = useState(
        () => typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('scan') === '1',
    );
    const [scannerSummary, setScannerSummary] = useState('');
    const [scannerSession, setScannerSession] = useState({ count: 0, pending: 0 });
    const [scannerView, setScannerView] = useState<'camera' | 'review'>('camera');
    const [scannerResetKey, setScannerResetKey] = useState(0);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [otherPaymentsOpen, setOtherPaymentsOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const scanRef = useRef<HTMLInputElement>(null);
    const defaultPaymentMethod = paymentMethods.find((method) => method.method === 'cash') ?? paymentMethods[0];
    const sale = useForm<SaleForm>({
        account_id: defaultPaymentMethod?.account_id ?? '',
        transaction_discount_amount: '0',
        paid_amount: '',
        payment_proof: null,
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        sales_channel: 'in_store',
        payment_method: defaultPaymentMethod?.method ?? 'cash',
        marketplace_code: '',
        external_order_number: '',
        occurred_at: currentDateTime(timezone, true),
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
            product.name.toLocaleLowerCase(localeTag()).includes(normalizedSearch) ||
            product.sku?.toLocaleLowerCase(localeTag()).includes(normalizedSearch) ||
            product.barcode?.includes(normalizedSearch) ||
            product.options.some(
                (option) =>
                    option.variant_name?.toLocaleLowerCase(localeTag()).includes(normalizedSearch) ||
                    option.sku?.toLocaleLowerCase(localeTag()).includes(normalizedSearch) ||
                    option.barcode?.includes(normalizedSearch),
            ),
    );
    const available = (product: ProductOption) => Number(product.stock_quantity) / Number(product.conversion_factor);
    const isCritical = (product: ProductOption) =>
        available(product) <= Number(product.minimum_quantity) / Number(product.conversion_factor);
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
                    variantPublicId: option.product_id === product.id ? null : option.product_id,
                    variantName: option.variant_name,
                    unitId: option.unit_id,
                    unitName: option.unit_name,
                    unitSymbol: option.unit_symbol,
                    purchasePrice: '0',
                    sellingPrice: option.selling_price,
                    stockQuantity: String(Number(option.stock_quantity) / Number(option.conversion_factor)),
                })),
            })),
        [catalog],
    );
    const subtotal = sale.data.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.selling_price), 0);
    const itemDiscount = sale.data.items.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0);
    const total = Math.max(0, subtotal - itemDiscount - Number(sale.data.transaction_discount_amount || 0));
    const selectedMethod = paymentMethods.find((method) => method.account_id === sale.data.account_id);
    const primaryPaymentMethods = paymentMethods.filter(
        (method) => method.method === 'cash' || method.method === 'qris' || method.method === 'qr_payment',
    );
    const otherPaymentMethods = paymentMethods.filter((method) => method.method === 'bank_transfer' || method.method === 'e_wallet');
    const isMarketplace = sale.data.sales_channel === 'marketplace';
    const change = Math.max(0, Number(sale.data.paid_amount || 0) - total);
    const cashSuggestions = cashTenderSuggestions(total);

    useEffect(() => {
        if (isMarketplace) {
            return;
        }

        const fallback = defaultPaymentMethod;

        if (!fallback || paymentMethods.some((method) => method.account_id === sale.data.account_id)) {
            return;
        }

        sale.setData((data) => ({
            ...data,
            account_id: fallback.account_id,
            payment_method: fallback.method,
            paid_amount: fallback.method === 'cash' ? '' : String(total),
            payment_proof: fallback.method === 'cash' ? null : data.payment_proof,
        }));
    }, [defaultPaymentMethod, isMarketplace, paymentMethods, sale, total]);

    useEffect(() => {
        const url = new URL(window.location.href);

        if (!scannerOpen || url.searchParams.get('scan') !== '1') {
            return;
        }

        url.searchParams.delete('scan');
        window.history.replaceState({}, '', url);
    }, [scannerOpen]);

    const focusEntry = (mode: EntryMode = entryMode) => {
        window.setTimeout(() => (mode === 'input' ? searchRef : scanRef).current?.focus(), 0);
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

        const existing = sale.data.items.find((item) => item.product_id === product.product_id && item.unit_id === product.unit_id);

        if (existing) {
            sale.setData(
                'items',
                sale.data.items.map((item) =>
                    item === existing
                        ? {
                              ...item,
                              quantity: String(Math.min(Number(item.quantity) + 1, available(product))),
                          }
                        : item,
                ),
            );
        } else {
            sale.setData('items', [...sale.data.items, { ...product, quantity: '1', discount_amount: '0' }]);
        }

        setSelectedProduct(null);
        setScanError('');
        restoreEntry();
    };
    const addScannerSelections = (selections: ScannerSelection[]): ScannerApplyResult => {
        const result: ScannerApplyResult = { applied: [], failures: [] };
        const items = [...sale.data.items];

        for (const selection of selections) {
            const identity = { captureId: selection.captureId, itemIndex: selection.itemIndex };
            const option = products.find((product) => product.product_id === selection.productId && product.unit_id === selection.unitId);
            const index = items.findIndex((item) => item.product_id === selection.productId && item.unit_id === selection.unitId);
            const quantity = (index >= 0 ? Number(items[index].quantity) : 0) + selection.quantity;

            if (!option || !Number.isFinite(selection.quantity) || selection.quantity <= 0 || quantity > available(option)) {
                result.failures.push({
                    ...identity,
                    message: 'Produk tidak tersedia atau jumlah melebihi stok. Kurangi jumlah lalu coba lagi.',
                });
                continue;
            }

            if (index >= 0) {
                items[index] = { ...items[index], quantity: String(quantity) };
            } else {
                items.push({ ...option, quantity: String(quantity), discount_amount: '0' });
            }

            result.applied.push(identity);
        }

        sale.setData('items', items);
        setScannerSummary(
            result.failures.length > 0
                ? `${result.applied.length} ${translate('produk ditambahkan')}, ${result.failures.length} ${translate('dilewati karena tidak tersedia atau stok habis.')}`
                : `${result.applied.length} ${translate('produk ditambahkan ke keranjang.')}`,
        );

        return result;
    };
    const chooseProduct = (product: CatalogProduct) => {
        setSelectedProduct(product);
    };
    const updateItem = (index: number, changes: Partial<CartItem>) =>
        sale.setData(
            'items',
            sale.data.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
        );
    const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        const exactMatches = products.filter(
            (product) => product.barcode === search || product.sku?.toLocaleLowerCase(localeTag()) === normalizedSearch,
        );
        const exact = exactMatches.find((product) => Boolean(product.is_base_unit)) ?? exactMatches[0];

        if (exactMatches.length === 1 && exact) {
            addProduct(exact);
        } else if (visibleProducts.length === 1) {
            chooseProduct(visibleProducts[0]);
        }
    };
    const scanBarcode = () => {
        const scannedBarcode = barcode.trim();
        const exactMatches = products.filter((product) => product.barcode === scannedBarcode);
        const exact = exactMatches.find((product) => Boolean(product.is_base_unit)) ?? exactMatches[0];

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
        sale.clearErrors('account_id', 'payment_method', 'paid_amount', 'payment_proof');
        sale.setData((data) => ({
            ...data,
            account_id: method.account_id,
            payment_method: method.method,
            paid_amount: method.method === 'cash' ? '' : String(total),
            payment_proof: method.method === 'cash' ? null : data.payment_proof,
        }));
    };
    const selectSalesChannel = (channel: SaleForm['sales_channel']) => {
        sale.clearErrors(
            'sales_channel',
            'account_id',
            'payment_method',
            'paid_amount',
            'payment_proof',
            'marketplace_code',
            'external_order_number',
        );

        if (channel === 'marketplace') {
            sale.setData((data) => ({
                ...data,
                sales_channel: channel,
                payment_method: 'marketplace',
                account_id: '',
                paid_amount: String(total),
                payment_proof: null,
                marketplace_code: data.marketplace_code || marketplaces[0]?.code || '',
            }));

            return;
        }

        sale.setData((data) => ({
            ...data,
            sales_channel: channel,
            payment_method: defaultPaymentMethod?.method ?? 'cash',
            account_id: defaultPaymentMethod?.account_id ?? '',
            paid_amount: defaultPaymentMethod?.method === 'cash' ? '' : String(total),
            marketplace_code: '',
            external_order_number: '',
        }));
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        sale.clearErrors();
        sale.transform((data) => ({
            ...data,
            occurred_at: currentDateTime(timezone, true),
            paid_amount: isMarketplace || selectedMethod?.method !== 'cash' ? String(total) : data.paid_amount,
            payment_proof: isMarketplace || selectedMethod?.method === 'cash' ? null : data.payment_proof,
            marketplace_code: isMarketplace ? data.marketplace_code || marketplaces[0]?.code || '' : '',
            external_order_number: isMarketplace ? data.external_order_number : '',
        }));
        sale.post('/pos/sales', {
            preserveScroll: true,
            onError: (errors) => {
                if (errors.customer_name || errors.customer_phone || errors.customer_email) {
                    setCustomerOpen(true);
                }

                if (
                    (errors.account_id || errors.payment_method) &&
                    (!selectedMethod || otherPaymentMethods.some((method) => method.account_id === selectedMethod.account_id))
                ) {
                    setOtherPaymentsOpen(true);
                }
            },
        });
    };
    const customerExpanded = customerOpen || Boolean(sale.errors.customer_name || sale.errors.customer_phone || sale.errors.customer_email);
    const otherPaymentsExpanded =
        otherPaymentsOpen ||
        Boolean(selectedMethod && otherPaymentMethods.some((method) => method.account_id === selectedMethod.account_id));
    const paymentReady = isMarketplace ? sale.data.marketplace_code !== '' : selectedMethod !== undefined;
    const checkoutError = Object.values(sale.errors)[0];

    return (
        <>
            <Head title="Kasir POS" />
            <div className="min-h-full bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] p-3 sm:p-4 lg:p-5">
                <div className="mx-auto grid max-w-[1500px] gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.75fr)]">
                    <section className="min-w-0 space-y-4">
                        <header className="rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--app-ink)]">Kasir</h1>
                                <div className="grid grid-cols-3 gap-2 sm:flex">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            prepareScannerTone();
                                            setScannerOpen(true);
                                        }}
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-2 text-center text-xs font-black text-[var(--app-primary-foreground)] hover:bg-[var(--workspace-700)] sm:px-3"
                                    >
                                        <Camera className="size-4" />
                                        {scannerSession.count ? 'Lanjut scan' : 'Scan barang'}
                                    </button>
                                    <Link
                                        href="/sales?view=history&from=pos"
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--app-soft)] px-2 text-center text-xs font-bold text-[var(--app-primary)] hover:bg-[var(--app-soft-strong)] sm:px-3"
                                    >
                                        <ReceiptText className="size-4" />
                                        Riwayat
                                    </Link>
                                    <Link
                                        href="/sales?view=returns&from=pos"
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 px-2 text-center text-xs font-bold text-red-700 hover:bg-red-100 sm:px-3"
                                    >
                                        <RotateCcw className="size-4" />
                                        Retur
                                    </Link>
                                </div>
                            </div>
                            {scannerSession.count > 0 && (
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        className="min-h-11 rounded-lg bg-white px-3 font-bold"
                                        onClick={() => {
                                            setScannerView('review');
                                            setScannerOpen(true);
                                        }}
                                    >
                                        Lihat hasil ({scannerSession.count})
                                    </button>
                                    <button
                                        type="button"
                                        className="min-h-11 px-3 text-red-700"
                                        onClick={() => {
                                            setScannerResetKey((key) => key + 1);
                                            setScannerSession({ count: 0, pending: 0 });
                                        }}
                                    >
                                        Buang hasil scan
                                    </button>
                                </div>
                            )}
                            {scannerSummary && (
                                <p
                                    role="status"
                                    className="mt-3 rounded-xl bg-[var(--app-soft)] px-3 py-2 text-xs font-bold text-[var(--app-primary)]"
                                >
                                    {scannerSummary}
                                </p>
                            )}
                            <div className="mt-4 rounded-2xl bg-[var(--app-soft)] p-1.5 shadow-[var(--app-ink)]/5 shadow-inner">
                                <div className="grid grid-cols-2 gap-1" role="tablist" aria-label="Mode tambah produk">
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
                                <div id="input-product-panel" role="tabpanel" className="relative mt-3">
                                    <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        ref={searchRef}
                                        autoFocus
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
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
                                                    setBarcode(event.target.value);
                                                    setScanError('');
                                                }}
                                                onKeyDown={onScanKeyDown}
                                                placeholder="Scan barcode"
                                                aria-label="Scan barcode"
                                                aria-invalid={Boolean(scanError)}
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
                                    {scanError && <p className="mt-2 text-sm font-semibold text-red-600">{scanError}</p>}
                                </div>
                            )}
                        </header>

                        {entryMode === 'input' && (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                                {visibleProducts.map((product) => {
                                    const prices = product.options.map((option) => Number(option.selling_price));
                                    const minimumPrice = Math.min(...prices);
                                    const maximumPrice = Math.max(...prices);
                                    const criticalStock = product.options.some(isCritical);

                                    return (
                                        <button
                                            type="button"
                                            key={product.id}
                                            onClick={() => chooseProduct(product)}
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
                                                    {maximumPrice !== minimumPrice && (
                                                        <span className="block text-[11px] leading-tight font-bold text-slate-500 sm:text-xs">
                                                            sampai {money(maximumPrice)}
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
                                                        Stok tersisa {Math.min(...product.options.map((option) => available(option)))}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {entryMode === 'input' && visibleProducts.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                                Produk tidak ditemukan.
                            </div>
                        )}
                    </section>

                    <form
                        onSubmit={submit}
                        noValidate
                        className="h-fit min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/8 sm:p-5 xl:sticky xl:top-5"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-700">
                                    <ShoppingCart className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="font-serif text-2xl text-slate-900">Keranjang</h2>
                                    <p className="text-xs text-slate-500">{sale.data.items.length} jenis barang</p>
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
                                    Number(item.quantity) * Number(item.selling_price) - Number(item.discount_amount || 0),
                                );

                                return (
                                    <article
                                        key={`${item.product_id}:${item.unit_id}`}
                                        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-900">{item.catalog_product_name}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                                    <span className="rounded-md bg-white px-2 py-0.5 font-semibold text-teal-800 ring-1 ring-slate-200">
                                                        {item.variant_name || item.unit_name}
                                                    </span>
                                                    <span>{money(item.selling_price)}</span>
                                                    <span className={`font-bold ${isCritical(item) ? 'text-red-600' : 'text-slate-500'}`}>
                                                        {isCritical(item) && 'Kritis · '}
                                                        Stok {available(item)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-start gap-2">
                                                <strong className="pt-1 text-sm text-[var(--app-ink)]">{money(lineTotal)}</strong>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        sale.setData(
                                                            'items',
                                                            sale.data.items.filter((_, itemIndex) => itemIndex !== index),
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
                                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Jumlah</span>
                                                <div className="flex w-full items-center overflow-hidden rounded-xl border border-slate-300 bg-white sm:w-fit">
                                                    <button
                                                        type="button"
                                                        aria-label={`Kurangi ${item.catalog_product_name}`}
                                                        className="grid size-11 shrink-0 place-items-center transition hover:bg-slate-50"
                                                        onClick={() =>
                                                            updateItem(index, {
                                                                quantity: String(Math.max(0.000001, Number(item.quantity) - 1)),
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
                                                                quantity: event.target.value,
                                                            })
                                                        }
                                                    />
                                                    <button
                                                        type="button"
                                                        aria-label={`Tambah ${item.catalog_product_name}`}
                                                        className="grid size-11 shrink-0 place-items-center transition hover:bg-slate-50"
                                                        onClick={() =>
                                                            updateItem(index, {
                                                                quantity: String(Math.min(available(item), Number(item.quantity) + 1)),
                                                            })
                                                        }
                                                    >
                                                        <Plus className="size-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <label className="block min-w-0">
                                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Diskon item</span>
                                                <input
                                                    className={fieldClass}
                                                    type="number"
                                                    min="0"
                                                    step="0.0001"
                                                    inputMode="decimal"
                                                    value={item.discount_amount}
                                                    onChange={(event) =>
                                                        updateItem(index, {
                                                            discount_amount: event.target.value,
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
                                    <p className="mt-2 text-sm text-slate-500">Pilih produk untuk mulai.</p>
                                </div>
                            )}

                            <section className="overflow-hidden rounded-2xl border border-[#d6e5df] bg-[#f7fbf9]">
                                <button
                                    type="button"
                                    aria-expanded={customerExpanded}
                                    aria-controls="pos-customer-fields"
                                    onClick={() => setCustomerOpen(!customerExpanded)}
                                    className="flex min-h-14 w-full items-center gap-3 px-3.5 text-left transition hover:bg-[#eff7f3] focus-visible:ring-2 focus-visible:ring-[#34765f] focus-visible:outline-none focus-visible:ring-inset"
                                >
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#e3f3ed] text-[#176b57]">
                                        <UserRound className="size-4.5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold text-[#173c35]">Data pelanggan</span>
                                        <span className="block truncate text-xs text-[#58756c]">
                                            {sale.data.customer_name || 'Opsional'}
                                        </span>
                                    </span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={`size-4 shrink-0 text-[#58756c] transition-transform ${customerExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {customerExpanded && (
                                    <div id="pos-customer-fields" className="grid gap-3 border-t border-[#d6e5df] p-3.5 sm:grid-cols-2">
                                        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                                            Nama pelanggan
                                            <span className="relative">
                                                <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    className={`${fieldClass} pl-10`}
                                                    autoComplete="name"
                                                    value={sale.data.customer_name}
                                                    onChange={(event) => sale.setData('customer_name', event.target.value)}
                                                    maxLength={160}
                                                />
                                            </span>
                                            {sale.errors.customer_name && (
                                                <span role="alert" className="text-xs font-semibold text-red-700">
                                                    {sale.errors.customer_name}
                                                </span>
                                            )}
                                        </label>
                                        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                                            Nomor telepon
                                            <span className="relative">
                                                <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    className={`${fieldClass} pl-10`}
                                                    type="tel"
                                                    inputMode="tel"
                                                    autoComplete="tel"
                                                    value={sale.data.customer_phone}
                                                    onChange={(event) => sale.setData('customer_phone', event.target.value)}
                                                    maxLength={30}
                                                />
                                            </span>
                                            {sale.errors.customer_phone && (
                                                <span role="alert" className="text-xs font-semibold text-red-700">
                                                    {sale.errors.customer_phone}
                                                </span>
                                            )}
                                        </label>
                                        <label className="grid gap-1.5 text-sm font-semibold text-slate-700 sm:col-span-2">
                                            Email
                                            <span className="relative">
                                                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    className={`${fieldClass} pl-10`}
                                                    type="email"
                                                    inputMode="email"
                                                    autoComplete="email"
                                                    value={sale.data.customer_email}
                                                    onChange={(event) => sale.setData('customer_email', event.target.value)}
                                                    maxLength={254}
                                                />
                                            </span>
                                            {sale.errors.customer_email && (
                                                <span role="alert" className="text-xs font-semibold text-red-700">
                                                    {sale.errors.customer_email}
                                                </span>
                                            )}
                                        </label>
                                        {(sale.data.customer_name || sale.data.customer_phone || sale.data.customer_email) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    sale.setData((data) => ({
                                                        ...data,
                                                        customer_name: '',
                                                        customer_phone: '',
                                                        customer_email: '',
                                                    }));
                                                    sale.clearErrors('customer_name', 'customer_phone', 'customer_email');
                                                }}
                                                className="min-h-10 justify-self-start text-sm font-bold text-[#34765f] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-[#34765f] focus-visible:outline-none sm:col-span-2"
                                            >
                                                Hapus data pelanggan
                                            </button>
                                        )}
                                    </div>
                                )}
                            </section>
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
                                    value={sale.data.transaction_discount_amount}
                                    onChange={(event) => sale.setData('transaction_discount_amount', event.target.value)}
                                />
                            </label>
                            <div className="flex items-end justify-between gap-3 rounded-2xl bg-[var(--app-primary)] p-4 text-[var(--app-primary-foreground)]">
                                <span className="text-sm text-teal-50/70">Total</span>
                                <strong className="text-right text-2xl text-orange-300">{money(total)}</strong>
                            </div>

                            <fieldset>
                                <legend className="mb-2 text-sm font-semibold text-slate-700">{translate('Kanal penjualan')}</legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { channel: 'in_store' as const, label: translate('Di toko'), icon: Store },
                                        { channel: 'marketplace' as const, label: 'Marketplace', icon: ShoppingBag },
                                    ].map(({ channel, label, icon: Icon }) => {
                                        const active = sale.data.sales_channel === channel;

                                        return (
                                            <button
                                                key={channel}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => selectSalesChannel(channel)}
                                                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none ${
                                                    active
                                                        ? 'border-[var(--app-ink)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-sm'
                                                        : 'border-slate-300 bg-white text-teal-900 hover:border-teal-500 hover:bg-teal-50'
                                                }`}
                                            >
                                                <Icon className="size-4" />
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>

                            {isMarketplace ? (
                                <div className="grid gap-3 rounded-2xl border border-[#b8d8cd] bg-[#f1f8f5] p-3.5 sm:grid-cols-2">
                                    <fieldset className="sm:col-span-2">
                                        <legend className="mb-1.5 text-sm font-semibold text-[#245c4f]">Marketplace</legend>
                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {marketplaces.map((marketplace) => {
                                                const active = sale.data.marketplace_code === marketplace.code;

                                                return (
                                                    <button
                                                        key={marketplace.code}
                                                        type="button"
                                                        aria-pressed={active}
                                                        onClick={() => sale.setData('marketplace_code', marketplace.code)}
                                                        className={`flex min-h-12 min-w-0 items-center gap-2 rounded-xl border px-2.5 text-left text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-[#34765f] focus-visible:outline-none ${
                                                            active
                                                                ? 'border-[#34765f] bg-white text-[#173c35] shadow-sm'
                                                                : 'border-[#cfe3dc] bg-[#f8fcfa] text-[#58756c] hover:border-[#76a898]'
                                                        }`}
                                                    >
                                                        <CommerceBrandMark code={marketplace.code} />
                                                        <span className="min-w-0 leading-tight">{translate(marketplace.label)}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </fieldset>
                                    <label className="grid gap-1.5 text-sm font-semibold text-[#245c4f] sm:col-span-2">
                                        {translate('Nomor pesanan')}
                                        <input
                                            className={fieldClass}
                                            value={sale.data.external_order_number}
                                            onChange={(event) => sale.setData('external_order_number', event.target.value)}
                                            maxLength={100}
                                        />
                                    </label>
                                    <div className="flex items-center justify-between gap-3 border-t border-[#cfe3dc] pt-3 text-sm sm:col-span-2">
                                        <span className="font-semibold text-[#245c4f]">{translate('Masuk ke saldo marketplace')}</span>
                                        <strong className="text-base text-[#173c35]">{money(total)}</strong>
                                    </div>
                                    {(sale.errors.marketplace_code || sale.errors.external_order_number || sale.errors.sales_channel) && (
                                        <p role="alert" className="text-xs font-bold text-red-700 sm:col-span-2">
                                            {sale.errors.marketplace_code || sale.errors.external_order_number || sale.errors.sales_channel}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <fieldset>
                                        <legend className="mb-2 text-sm font-semibold text-slate-700">Metode bayar</legend>
                                        <div className="grid grid-cols-2 gap-2">
                                            {primaryPaymentMethods.map((method) => {
                                                const active = method.account_id === sale.data.account_id;
                                                const pillClass = active
                                                    ? 'border-[var(--app-ink)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-sm'
                                                    : 'border-slate-300 bg-white text-teal-900 hover:border-teal-500 hover:bg-teal-50';

                                                return (
                                                    <button
                                                        key={method.account_id}
                                                        type="button"
                                                        aria-pressed={active}
                                                        onClick={() => selectPaymentMethod(method)}
                                                        className={`flex min-h-12 items-center justify-center rounded-xl border px-4 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none ${pillClass}`}
                                                    >
                                                        <CommerceBrandMark code={method.brand} className="mr-2 size-6 rounded-md" />
                                                        {translate(method.label)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </fieldset>

                                    {otherPaymentMethods.length > 0 && (
                                        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                            <button
                                                type="button"
                                                aria-expanded={otherPaymentsExpanded}
                                                aria-controls="pos-other-payments"
                                                onClick={() => setOtherPaymentsOpen(!otherPaymentsExpanded)}
                                                className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-bold text-teal-900 transition hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none focus-visible:ring-inset"
                                            >
                                                <CreditCard className="size-4" />
                                                <span className="flex-1">{translate('Pembayaran lainnya')}</span>
                                                <ChevronDown
                                                    className={`size-4 transition-transform ${otherPaymentsExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                            {otherPaymentsExpanded && (
                                                <div id="pos-other-payments" className="border-t border-slate-200 p-3">
                                                    <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                                                        {translate('Akun penerimaan')}
                                                        <select
                                                            className={fieldClass}
                                                            value={
                                                                selectedMethod &&
                                                                otherPaymentMethods.some(
                                                                    (method) => method.account_id === selectedMethod.account_id,
                                                                )
                                                                    ? selectedMethod.account_id
                                                                    : ''
                                                            }
                                                            onChange={(event) => {
                                                                const method = otherPaymentMethods.find(
                                                                    (option) => option.account_id === event.target.value,
                                                                );

                                                                if (method) {
                                                                    selectPaymentMethod(method);
                                                                }
                                                            }}
                                                        >
                                                            <option value="">{translate('Pilih akun')}</option>
                                                            {otherPaymentMethods.map((method) => (
                                                                <option key={method.account_id} value={method.account_id}>
                                                                    {translate(
                                                                        method.method === 'bank_transfer' ? 'Transfer bank' : 'E-wallet',
                                                                    )}{' '}
                                                                    · {method.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {selectedMethod &&
                                                            otherPaymentMethods.some(
                                                                (method) => method.account_id === selectedMethod.account_id,
                                                            ) && (
                                                                <span className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-[#245c4f]">
                                                                    <CommerceBrandMark code={selectedMethod.brand} />
                                                                    {selectedMethod.label}
                                                                </span>
                                                            )}
                                                    </label>
                                                </div>
                                            )}
                                        </section>
                                    )}

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
                                                    onChange={(event) => sale.setData('paid_amount', event.target.value)}
                                                    required
                                                />
                                            </label>
                                            {cashSuggestions.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {cashSuggestions.map((amount) => (
                                                        <button
                                                            type="button"
                                                            key={amount}
                                                            onClick={() => sale.setData('paid_amount', String(amount))}
                                                            className="min-h-10 flex-1 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold text-teal-900 transition hover:border-teal-500 hover:bg-teal-50"
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
                                    ) : selectedMethod ? (
                                        <div className="space-y-3 rounded-2xl border border-[#b8d8cd] bg-[#f1f8f5] p-3.5">
                                            <div className="flex items-center justify-between gap-3 text-sm">
                                                <span className="font-semibold text-[#245c4f]">
                                                    {selectedMethod.method === 'qris' || selectedMethod.method === 'qr_payment'
                                                        ? selectedMethod.label
                                                        : translate(
                                                              selectedMethod.method === 'bank_transfer' ? 'Transfer bank' : 'E-wallet',
                                                          )}
                                                </span>
                                                <strong className="text-base text-[#173c35]">{money(total)}</strong>
                                            </div>
                                            <div className="border-t border-[#cfe3dc] pt-3">
                                                {sale.data.payment_proof ? (
                                                    <div className="flex min-w-0 items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-[#b8d8cd]">
                                                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#e3f3ed] text-[#176b57]">
                                                            <FileCheck2 className="size-5" />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-bold text-[#173c35]">
                                                                {sale.data.payment_proof.name}
                                                            </p>
                                                            <p className="text-xs text-[#58756c]">
                                                                {(sale.data.payment_proof.size / 1024 / 1024).toFixed(1)} MB
                                                            </p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                sale.setData('payment_proof', null);
                                                                sale.clearErrors('payment_proof');
                                                            }}
                                                            aria-label="Hapus bukti pembayaran"
                                                            className="grid size-10 shrink-0 place-items-center rounded-lg text-[#6f817b] transition hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-[#34765f] focus-visible:outline-none"
                                                        >
                                                            <X className="size-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#76a898] bg-white px-3 text-sm font-bold text-[#245c4f] transition focus-within:ring-2 focus-within:ring-[#34765f] hover:border-[#34765f] hover:bg-[#f9fcfb]">
                                                        <Upload className="size-4" />
                                                        Tambah bukti pembayaran
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                                            className="sr-only"
                                                            onChange={(event) => {
                                                                const file = event.target.files?.[0] ?? null;

                                                                if (file && file.size > 5 * 1024 * 1024) {
                                                                    sale.setData('payment_proof', null);
                                                                    sale.setError(
                                                                        'payment_proof',
                                                                        translate('Ukuran bukti pembayaran maksimal 5 MB.'),
                                                                    );
                                                                    event.target.value = '';

                                                                    return;
                                                                }

                                                                sale.setData('payment_proof', file);
                                                                sale.clearErrors('payment_proof');
                                                                event.target.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                )}
                                                <p className="mt-2 text-xs text-[#58756c]">JPG, PNG, WebP, atau PDF · maksimal 5 MB</p>
                                                {sale.errors.payment_proof && (
                                                    <p role="alert" className="mt-2 text-xs font-bold text-red-700">
                                                        {sale.errors.payment_proof}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Metode bayar belum tersedia.</p>
                                    )}
                                </>
                            )}

                            <input
                                className={fieldClass}
                                aria-label="Catatan"
                                placeholder="Catatan opsional"
                                value={sale.data.notes}
                                onChange={(event) => sale.setData('notes', event.target.value)}
                                maxLength={500}
                            />
                            {checkoutError && (
                                <p
                                    role="alert"
                                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                                >
                                    {checkoutError}
                                </p>
                            )}
                            <button
                                disabled={sale.processing || sale.data.items.length === 0 || !paymentReady || sale.data.paid_amount === ''}
                                className="h-14 w-full rounded-2xl bg-orange-600 text-base font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {sale.processing ? 'Memproses...' : `Bayar ${money(total)}`}
                            </button>
                        </div>
                    </form>
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
                    purpose="sale"
                    title="Scan produk untuk penjualan"
                    open={scannerOpen}
                    onOpenChange={setScannerOpen}
                    onConfirm={addScannerSelections}
                    onSessionChange={setScannerSession}
                    initialView={scannerView}
                    resetKey={scannerResetKey}
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
                                {(selectedProduct?.sku || selectedProduct?.barcode) && (
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                        {selectedProduct.sku && <span>SKU {selectedProduct.sku}</span>}
                                        {selectedProduct.barcode && <span>{selectedProduct.barcode}</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogDescription className="sr-only">Detail stok dan pilihan produk</DialogDescription>
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
                                        <p className="font-black text-slate-900">{option.variant_name || option.unit_name}</p>
                                        <p className={`mt-1 text-xs font-bold ${stock > 0 ? 'text-[var(--app-primary)]' : 'text-red-600'}`}>
                                            {stock > 0
                                                ? `${translate('Stok')} ${quantity(stock)} ${option.unit_symbol}`
                                                : translate('Stok habis')}
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
