import { useForm, usePage } from '@inertiajs/react';
import {
    Camera,
    ChevronDown,
    CreditCard,
    FileCheck2,
    Mail,
    Minus,
    PackageOpen,
    Plus,
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
import { FormCurrencyInput, FormPhoneInput } from '@/components/forms';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { EmptyState } from '@/components/page/empty-state';
import { Button } from '@/components/ui/button';
import { prepareScannerTone } from '@/components/widgets/product-scanner/scanner-feedback';
import type { ScannerApplyResult, ScannerProductCandidate, ScannerSelection } from '@/components/widgets/product-scanner/types';
import { formatMoney as money, formatQuantity as quantity } from '@/lib/currency';
import { cashTenderSuggestions, localeTag } from '@/lib/currency';
import { currentDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { postingToken } from '@/lib/posting-token';
import { store as storeSale } from '@/routes/pos/sales';
import type { StoreSummary } from '@/types';

type ProductOption = {
    catalog_product_id: string;
    catalog_product_name: string;
    category_public_id: string | null;
    category_name: string | null;
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
    category_public_id: string | null;
    category_name: string | null;
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
const ProductScanner = lazy(() => import('@/components/widgets/product-scanner/product-scanner'));

const fieldClass =
    'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary)]/15';

export default function PosIndex({
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
    const { activeStore } = usePage<{ activeStore: StoreSummary | null }>().props;
    const [search, setSearch] = useState('');
    const [searchError, setSearchError] = useState('');
    const [activeCategory, setActiveCategory] = useState('');
    const [scannerOpen, setScannerOpen] = useState(
        () => typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('scan') === '1',
    );
    const [scannerSummary, setScannerSummary] = useState('');
    const [scannerSession, setScannerSession] = useState({ count: 0, pending: 0 });
    const [scannerView, setScannerView] = useState<'camera' | 'review'>('camera');
    const [scannerResetKey, setScannerResetKey] = useState(0);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [otherPaymentsOpen, setOtherPaymentsOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
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
                            category_public_id: option.category_public_id,
                            category_name: option.category_name,
                            options: [option],
                        });
                    }

                    return grouped;
                }, new Map<string, CatalogProduct>()),
            ).map(([, product]) => product),
        [products],
    );
    const categories = useMemo(
        () =>
            Array.from(
                new Map(
                    catalog
                        .filter((product) => product.category_public_id && product.category_name)
                        .map((product) => [product.category_public_id as string, product.category_name as string]),
                ),
            ),
        [catalog],
    );
    const normalizedSearch = search.trim().toLocaleLowerCase(localeTag());
    const visibleProducts = catalog.filter(
        (product) =>
            (!activeCategory || product.category_public_id === activeCategory) &&
            (!normalizedSearch ||
                product.name.toLocaleLowerCase(localeTag()).includes(normalizedSearch) ||
                product.sku?.toLocaleLowerCase(localeTag()).includes(normalizedSearch) ||
                product.barcode?.includes(normalizedSearch) ||
                product.options.some(
                    (option) =>
                        option.variant_name?.toLocaleLowerCase(localeTag()).includes(normalizedSearch) ||
                        option.sku?.toLocaleLowerCase(localeTag()).includes(normalizedSearch) ||
                        option.barcode?.includes(normalizedSearch),
                )),
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

    const focusEntry = () => window.setTimeout(() => searchRef.current?.focus(), 0);
    const restoreEntry = () => {
        setSearch('');
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
        setSearchError('');
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
        setSearchError('');

        if (!search.trim()) {
            return;
        }

        const exactMatches = products.filter(
            (product) => product.barcode === search || product.sku?.toLocaleLowerCase(localeTag()) === normalizedSearch,
        );
        const exact = exactMatches.find((product) => Boolean(product.is_base_unit)) ?? exactMatches[0];

        if (exact && available(exact) <= 0) {
            setSearchError(translate('Stok produk habis.'));
        } else if (exact) {
            addProduct(exact);
        } else if (visibleProducts.length === 1) {
            chooseProduct(visibleProducts[0]);
        } else if (visibleProducts.length === 0) {
            setSearchError(translate('Barcode atau produk tidak ditemukan.'));
        }
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
        sale.post(storeSale.url(), {
            preserveScroll: true,
            onError: (errors) => {
                setPaymentOpen(true);

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
            <AppPage
                title={translate('Kasir penjualan')}
                description={`${translate('Transaksi baru')} · ${activeStore?.name ?? translate('Toko')}`}
                icon={ShoppingCart}
                headerSurface
                size="wide"
                actions={
                    <Button
                        type="button"
                        size="touch"
                        onClick={() => {
                            prepareScannerTone();
                            setScannerOpen(true);
                        }}
                    >
                        <Camera className="size-4" aria-hidden="true" />
                        {translate(scannerSession.count ? 'Lanjut scan' : 'Scan barang')}
                    </Button>
                }
            >
                {sale.data.items.length > 0 && (
                    <button
                        type="button"
                        onClick={() => document.getElementById('pos-cart')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="flex min-h-12 items-center justify-between rounded-xl bg-[var(--app-primary)] px-4 text-sm font-bold text-[var(--app-primary-foreground)] min-[960px]:hidden"
                    >
                        <span>
                            {translate('Keranjang')} · {sale.data.items.length} {translate('barang')}
                        </span>
                        <strong>{money(total)}</strong>
                    </button>
                )}
                <div className="grid gap-5 min-[960px]:grid-cols-[minmax(0,1fr)_330px] min-[1101px]:grid-cols-[minmax(0,1fr)_380px]">
                    <section className="min-w-0 space-y-4">
                        <section className="rounded-2xl bg-card p-3 text-card-foreground sm:p-4">
                            {scannerSession.count > 0 && (
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="touch"
                                        variant="outline"
                                        onClick={() => {
                                            prepareScannerTone();
                                            setScannerView('review');
                                            setScannerOpen(true);
                                        }}
                                    >
                                        {translate('Lihat hasil')} ({scannerSession.count})
                                    </Button>
                                    <Button
                                        type="button"
                                        size="touch"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => {
                                            setScannerResetKey((key) => key + 1);
                                            setScannerSession({ count: 0, pending: 0 });
                                        }}
                                    >
                                        {translate('Buang hasil scan')}
                                    </Button>
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
                            <div className="relative mt-4">
                                <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    ref={searchRef}
                                    autoFocus
                                    value={search}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                        setSearchError('');
                                    }}
                                    onKeyDown={onSearchKeyDown}
                                    placeholder={translate('Cari nama / scan barcode lalu Enter')}
                                    aria-label={translate('Cari nama produk, SKU, atau scan barcode')}
                                    aria-invalid={Boolean(searchError)}
                                    className="h-12 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-sm text-foreground transition outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary)]/15"
                                />
                            </div>
                            <p className="mt-3 text-xs leading-5 text-muted-foreground">
                                {translate('Ketik untuk mencari, atau fokuskan kolom lalu gunakan scanner alat.')}
                            </p>
                            {searchError && <p className="mt-2 text-sm font-semibold text-destructive">{searchError}</p>}
                            <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label={translate('Filter kategori')}>
                                <button
                                    type="button"
                                    aria-pressed={activeCategory === ''}
                                    onClick={() => setActiveCategory('')}
                                    className={`min-h-9 shrink-0 rounded-lg border px-3 text-xs font-semibold transition ${
                                        activeCategory === ''
                                            ? 'border-[var(--app-primary)]/30 bg-[var(--app-soft)] text-[var(--app-primary)]'
                                            : 'border-border bg-card text-foreground hover:bg-[var(--app-soft)]'
                                    }`}
                                >
                                    {translate('Semua')}
                                </button>
                                {categories.map(([id, name]) => (
                                    <button
                                        key={id}
                                        type="button"
                                        aria-pressed={activeCategory === id}
                                        onClick={() => setActiveCategory(id)}
                                        className={`min-h-9 shrink-0 rounded-lg border px-3 text-xs font-semibold transition ${
                                            activeCategory === id
                                                ? 'border-[var(--app-primary)]/30 bg-[var(--app-soft)] text-[var(--app-primary)]'
                                                : 'border-border bg-card text-foreground hover:bg-[var(--app-soft)]'
                                        }`}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <div className="grid grid-cols-2 gap-2.5 min-[960px]:grid-cols-2 min-[1101px]:grid-cols-3 sm:grid-cols-3">
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
                                        className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--app-ink)]/10 bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--app-primary)]/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
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
                                            <p className="line-clamp-2 text-sm leading-snug font-bold text-foreground sm:text-base">
                                                {product.name}
                                            </p>
                                            <p className="text-base font-bold tracking-[-0.02em] text-[var(--app-primary)] sm:text-lg">
                                                {money(minimumPrice)}
                                                {maximumPrice !== minimumPrice && (
                                                    <span className="block text-[11px] leading-tight font-bold text-muted-foreground sm:text-xs">
                                                        sampai {money(maximumPrice)}
                                                    </span>
                                                )}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                {criticalStock && (
                                                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                                                        Kritis
                                                    </span>
                                                )}
                                                <p
                                                    className={`text-[11px] font-bold ${criticalStock ? 'text-destructive' : 'text-muted-foreground'}`}
                                                >
                                                    Stok tersisa {Math.min(...product.options.map((option) => available(option)))}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {visibleProducts.length === 0 && (
                            <div className="rounded-2xl bg-card">
                                <EmptyState
                                    icon={Search}
                                    title={translate('Produk tidak ditemukan')}
                                    description={translate('Coba gunakan nama, SKU, atau barcode yang lain.')}
                                />
                            </div>
                        )}
                    </section>

                    <form
                        id="pos-checkout-form"
                        onSubmit={submit}
                        noValidate
                        className="h-fit min-w-0 scroll-mt-4 rounded-2xl bg-card p-4 text-card-foreground min-[960px]:sticky min-[960px]:top-5 sm:p-5"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                                    <ShoppingCart className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-xl font-bold text-foreground">Keranjang</h2>
                                    <p className="text-xs text-muted-foreground">{sale.data.items.length} jenis barang</p>
                                </div>
                            </div>
                            {sale.data.items.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => sale.setData('items', [])}
                                    className="min-h-11 shrink-0 px-2 text-xs font-bold text-destructive"
                                >
                                    Kosongkan
                                </button>
                            )}
                        </div>

                        <div id="pos-cart" className="mt-5 space-y-3">
                            {sale.data.items.map((item, index) => {
                                const lineTotal = Math.max(
                                    0,
                                    Number(item.quantity) * Number(item.selling_price) - Number(item.discount_amount || 0),
                                );

                                return (
                                    <article
                                        key={`${item.product_id}:${item.unit_id}`}
                                        className="rounded-xl border border-border bg-muted/35 p-3.5"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-foreground">{item.catalog_product_name}</p>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span className="rounded-md bg-background px-2 py-0.5 font-semibold text-[var(--app-primary)] ring-1 ring-border">
                                                        {item.variant_name || item.unit_name}
                                                    </span>
                                                    <span>{money(item.selling_price)}</span>
                                                    <span
                                                        className={`font-bold ${isCritical(item) ? 'text-destructive' : 'text-muted-foreground'}`}
                                                    >
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
                                                    className="grid size-9 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:outline-none"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
                                            <div>
                                                <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Jumlah</span>
                                                <div className="flex w-full items-center overflow-hidden rounded-xl border border-input bg-card sm:w-fit">
                                                    <button
                                                        type="button"
                                                        aria-label={`Kurangi ${item.catalog_product_name}`}
                                                        className="grid size-11 shrink-0 place-items-center transition hover:bg-muted"
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
                                                        className="h-11 min-w-0 flex-1 border-x border-border bg-card px-1 text-center text-sm sm:w-16 sm:flex-none"
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
                                                        className="grid size-11 shrink-0 place-items-center transition hover:bg-muted"
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
                                            <FormCurrencyInput
                                                id={`item-discount-${index}`}
                                                name={`items.${index}.discount_amount`}
                                                label={translate('Diskon item')}
                                                value={item.discount_amount}
                                                onValueChange={(value) => updateItem(index, { discount_amount: value })}
                                                min="0"
                                            />
                                        </div>
                                    </article>
                                );
                            })}
                            {sale.data.items.length === 0 && (
                                <div className="grid place-items-center rounded-2xl border border-dashed border-input px-4 py-9 text-center">
                                    <PackageOpen className="size-7 text-muted-foreground" />
                                    <p className="mt-2 text-sm text-muted-foreground">Pilih produk untuk mulai.</p>
                                </div>
                            )}

                            <ResponsiveDialog
                                open={paymentOpen}
                                onOpenChange={setPaymentOpen}
                                title={translate('Pembayaran')}
                                description={`${translate('Total')} ${money(total)}`}
                                size="lg"
                                bodyClassName="space-y-4"
                            >
                                <section className="overflow-hidden rounded-xl border border-border bg-[var(--app-soft)]/35">
                                    <button
                                        type="button"
                                        aria-expanded={customerExpanded}
                                        aria-controls="pos-customer-fields"
                                        onClick={() => setCustomerOpen(!customerExpanded)}
                                        className="flex min-h-14 w-full items-center gap-3 px-3.5 text-left transition hover:bg-[var(--app-soft)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                                    >
                                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-background text-[var(--app-primary)]">
                                            <UserRound className="size-4.5" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-foreground">Data pelanggan</span>
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {sale.data.customer_name || 'Opsional'}
                                            </span>
                                        </span>
                                        <ChevronDown
                                            aria-hidden="true"
                                            className={`size-4 shrink-0 text-muted-foreground transition-transform ${customerExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </button>

                                    {customerExpanded && (
                                        <div id="pos-customer-fields" className="grid gap-3 border-t border-border p-3.5 sm:grid-cols-2">
                                            <label className="grid gap-1.5 text-sm font-semibold text-foreground">
                                                Nama pelanggan
                                                <span className="relative">
                                                    <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                    <input
                                                        className={`${fieldClass} pl-10`}
                                                        autoComplete="name"
                                                        value={sale.data.customer_name}
                                                        onChange={(event) => sale.setData('customer_name', event.target.value)}
                                                        maxLength={160}
                                                    />
                                                </span>
                                                {sale.errors.customer_name && (
                                                    <span role="alert" className="text-xs font-semibold text-destructive">
                                                        {sale.errors.customer_name}
                                                    </span>
                                                )}
                                            </label>
                                            <FormPhoneInput
                                                id="customer_phone"
                                                name="customer_phone"
                                                label={translate('Nomor telepon')}
                                                value={sale.data.customer_phone}
                                                onChange={(event) => sale.setData('customer_phone', event.target.value)}
                                                maxLength={30}
                                                error={sale.errors.customer_phone}
                                            />
                                            <label className="grid gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                                                Email
                                                <span className="relative">
                                                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
                                                    <span role="alert" className="text-xs font-semibold text-destructive">
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
                                                    className="min-h-10 justify-self-start text-sm font-bold text-[var(--app-primary)] underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:col-span-2"
                                                >
                                                    Hapus data pelanggan
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </section>

                                <div className="mt-5 space-y-3 border-t border-border pt-5">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>{money(subtotal)}</span>
                                    </div>
                                    {itemDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-muted-foreground">
                                            <span>Diskon item</span>
                                            <span>-{money(itemDiscount)}</span>
                                        </div>
                                    )}
                                    <div className="ml-auto w-full sm:max-w-56">
                                        <FormCurrencyInput
                                            id="transaction_discount_amount"
                                            name="transaction_discount_amount"
                                            label={translate('Diskon transaksi')}
                                            value={sale.data.transaction_discount_amount}
                                            onValueChange={(value) => sale.setData('transaction_discount_amount', value)}
                                            min="0"
                                        />
                                    </div>
                                    <div className="flex items-end justify-between gap-3 rounded-2xl bg-[var(--app-primary)] p-4 text-[var(--app-primary-foreground)]">
                                        <span className="text-sm opacity-75">Total</span>
                                        <strong className="text-right text-2xl">{money(total)}</strong>
                                    </div>

                                    <fieldset>
                                        <legend className="mb-2 text-sm font-semibold text-foreground">
                                            {translate('Kanal penjualan')}
                                        </legend>
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
                                                        className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                                                            active
                                                                ? 'border-[var(--app-ink)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-sm'
                                                                : 'border-border bg-background text-foreground hover:border-[var(--app-primary)] hover:bg-[var(--app-soft)]'
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
                                        <div className="grid gap-3 rounded-xl border border-border bg-[var(--app-soft)]/35 p-3.5 sm:grid-cols-2">
                                            <fieldset className="sm:col-span-2">
                                                <legend className="mb-1.5 text-sm font-semibold text-foreground">Marketplace</legend>
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                    {marketplaces.map((marketplace) => {
                                                        const active = sale.data.marketplace_code === marketplace.code;

                                                        return (
                                                            <button
                                                                key={marketplace.code}
                                                                type="button"
                                                                aria-pressed={active}
                                                                onClick={() => sale.setData('marketplace_code', marketplace.code)}
                                                                className={`flex min-h-12 min-w-0 items-center gap-2 rounded-xl border px-2.5 text-left text-xs font-bold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                                                                    active
                                                                        ? 'border-[var(--app-primary)] bg-background text-foreground'
                                                                        : 'border-border bg-background/70 text-muted-foreground hover:border-[var(--app-primary)]'
                                                                }`}
                                                            >
                                                                <CommerceBrandMark code={marketplace.code} />
                                                                <span className="min-w-0 leading-tight">
                                                                    {translate(marketplace.label)}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </fieldset>
                                            <label className="grid gap-1.5 text-sm font-semibold text-foreground sm:col-span-2">
                                                {translate('Nomor pesanan')}
                                                <input
                                                    className={fieldClass}
                                                    value={sale.data.external_order_number}
                                                    onChange={(event) => sale.setData('external_order_number', event.target.value)}
                                                    maxLength={100}
                                                />
                                            </label>
                                            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm sm:col-span-2">
                                                <span className="font-semibold text-muted-foreground">
                                                    {translate('Masuk ke saldo marketplace')}
                                                </span>
                                                <strong className="text-base text-foreground">{money(total)}</strong>
                                            </div>
                                            {(sale.errors.marketplace_code ||
                                                sale.errors.external_order_number ||
                                                sale.errors.sales_channel) && (
                                                <p role="alert" className="text-xs font-bold text-destructive sm:col-span-2">
                                                    {sale.errors.marketplace_code ||
                                                        sale.errors.external_order_number ||
                                                        sale.errors.sales_channel}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <fieldset>
                                                <legend className="mb-2 text-sm font-semibold text-foreground">Metode bayar</legend>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {primaryPaymentMethods.map((method) => {
                                                        const active = method.account_id === sale.data.account_id;
                                                        const pillClass = active
                                                            ? 'border-[var(--app-ink)] bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-sm'
                                                            : 'border-border bg-background text-foreground hover:border-[var(--app-primary)] hover:bg-[var(--app-soft)]';

                                                        return (
                                                            <button
                                                                key={method.account_id}
                                                                type="button"
                                                                aria-pressed={active}
                                                                onClick={() => selectPaymentMethod(method)}
                                                                className={`flex min-h-12 items-center justify-center rounded-xl border px-4 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${pillClass}`}
                                                            >
                                                                <CommerceBrandMark code={method.brand} className="mr-2 size-6 rounded-md" />
                                                                {translate(method.label)}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </fieldset>

                                            {otherPaymentMethods.length > 0 && (
                                                <section className="overflow-hidden rounded-xl border border-border bg-card">
                                                    <button
                                                        type="button"
                                                        aria-expanded={otherPaymentsExpanded}
                                                        aria-controls="pos-other-payments"
                                                        onClick={() => setOtherPaymentsOpen(!otherPaymentsExpanded)}
                                                        className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-bold text-foreground transition hover:bg-[var(--app-soft)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                                                    >
                                                        <CreditCard className="size-4" />
                                                        <span className="flex-1">{translate('Pembayaran lainnya')}</span>
                                                        <ChevronDown
                                                            className={`size-4 transition-transform ${otherPaymentsExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </button>
                                                    {otherPaymentsExpanded && (
                                                        <div id="pos-other-payments" className="border-t border-border p-3">
                                                            <label className="grid gap-1.5 text-sm font-semibold text-foreground">
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
                                                                                method.method === 'bank_transfer'
                                                                                    ? 'Transfer bank'
                                                                                    : 'E-wallet',
                                                                            )}{' '}
                                                                            · {method.label}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {selectedMethod &&
                                                                    otherPaymentMethods.some(
                                                                        (method) => method.account_id === selectedMethod.account_id,
                                                                    ) && (
                                                                        <span className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-[var(--app-primary)]">
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
                                                    <FormCurrencyInput
                                                        id="paid_amount"
                                                        name="paid_amount"
                                                        label={translate('Uang diterima')}
                                                        value={sale.data.paid_amount}
                                                        onValueChange={(value) => sale.setData('paid_amount', value)}
                                                        min={String(total)}
                                                        required
                                                        error={sale.errors.paid_amount}
                                                        className="h-12 text-lg font-bold"
                                                    />
                                                    {cashSuggestions.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {cashSuggestions.map((amount) => (
                                                                <button
                                                                    type="button"
                                                                    key={amount}
                                                                    onClick={() => sale.setData('paid_amount', String(amount))}
                                                                    className="min-h-10 flex-1 rounded-xl border border-border bg-background px-2 text-xs font-bold text-foreground transition hover:border-[var(--app-primary)] hover:bg-[var(--app-soft)]"
                                                                >
                                                                    {money(amount)}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-sm font-bold text-[var(--app-primary)]">
                                                        <span>Kembalian</span>
                                                        <span>{money(change)}</span>
                                                    </div>
                                                </div>
                                            ) : selectedMethod ? (
                                                <div className="space-y-3 rounded-xl border border-border bg-[var(--app-soft)]/35 p-3.5">
                                                    <div className="flex items-center justify-between gap-3 text-sm">
                                                        <span className="font-semibold text-muted-foreground">
                                                            {selectedMethod.method === 'qris' || selectedMethod.method === 'qr_payment'
                                                                ? selectedMethod.label
                                                                : translate(
                                                                      selectedMethod.method === 'bank_transfer'
                                                                          ? 'Transfer bank'
                                                                          : 'E-wallet',
                                                                  )}
                                                        </span>
                                                        <strong className="text-base text-foreground">{money(total)}</strong>
                                                    </div>
                                                    <div className="border-t border-border pt-3">
                                                        {sale.data.payment_proof ? (
                                                            <div className="flex min-w-0 items-center gap-3 rounded-xl bg-background p-3 ring-1 ring-border">
                                                                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--app-soft)] text-[var(--app-primary)]">
                                                                    <FileCheck2 className="size-5" />
                                                                </span>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-bold text-foreground">
                                                                        {sale.data.payment_proof.name}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
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
                                                                    className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                                >
                                                                    <X className="size-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--app-primary)]/50 bg-background px-3 text-sm font-bold text-[var(--app-primary)] transition focus-within:ring-2 focus-within:ring-ring hover:border-[var(--app-primary)] hover:bg-[var(--app-soft)]">
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
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            JPG, PNG, WebP, atau PDF · maksimal 5 MB
                                                        </p>
                                                        {sale.errors.payment_proof && (
                                                            <p role="alert" className="mt-2 text-xs font-bold text-destructive">
                                                                {sale.errors.payment_proof}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                                                    Metode bayar belum tersedia.
                                                </p>
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
                                            className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-semibold text-destructive"
                                        >
                                            {checkoutError}
                                        </p>
                                    )}
                                    <Button
                                        type="submit"
                                        form="pos-checkout-form"
                                        size="checkout"
                                        disabled={
                                            sale.processing || sale.data.items.length === 0 || !paymentReady || sale.data.paid_amount === ''
                                        }
                                        className="w-full text-base font-bold"
                                    >
                                        {sale.processing ? translate('Memproses...') : `${translate('Bayar')} ${money(total)}`}
                                    </Button>
                                </div>
                            </ResponsiveDialog>
                            <div className="mt-2 space-y-3 border-t border-border pt-5">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{translate('Subtotal')}</span>
                                    <span>{money(subtotal)}</span>
                                </div>
                                {itemDiscount > 0 && (
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>{translate('Diskon')}</span>
                                        <span>-{money(itemDiscount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-border pt-3 text-xl font-bold tabular-nums">
                                    <span>{translate('Total')}</span>
                                    <span>{money(total)}</span>
                                </div>
                                <Button
                                    type="button"
                                    size="checkout"
                                    onClick={() => setPaymentOpen(true)}
                                    disabled={sale.data.items.length === 0}
                                    className="w-full text-base font-bold"
                                >
                                    {translate('Lanjut pembayaran')}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </AppPage>
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
                        focusEntry();
                    }}
                />
            </Suspense>

            <ResponsiveDialog
                open={selectedProduct !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedProduct(null);
                        restoreEntry();
                    }
                }}
                title={selectedProduct?.name ?? translate('Pilih produk')}
                description={[selectedProduct?.sku ? `SKU ${selectedProduct.sku}` : '', selectedProduct?.barcode ?? '']
                    .filter(Boolean)
                    .join(' · ')}
                size="md"
                bodyClassName="grid gap-2"
            >
                {selectedProduct?.options.map((option) => {
                    const stock = available(option);

                    return (
                        <button
                            type="button"
                            key={`${option.product_id}:${option.unit_id}`}
                            onClick={() => addProduct(option)}
                            disabled={stock <= 0}
                            className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-border bg-background p-3.5 text-left transition hover:border-[var(--app-primary)]/50 hover:bg-[var(--app-soft)]/35 focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60"
                        >
                            <div className="min-w-0">
                                <p className="font-bold text-foreground">{option.variant_name || option.unit_name}</p>
                                <p className={`mt-1 text-xs font-bold ${stock > 0 ? 'text-[var(--app-primary)]' : 'text-destructive'}`}>
                                    {stock > 0 ? `${translate('Stok')} ${quantity(stock)} ${option.unit_symbol}` : translate('Stok habis')}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <strong className="text-sm font-bold text-[var(--app-ink)] sm:text-base">
                                    {money(option.selling_price)}
                                </strong>
                                <span className="grid size-9 place-items-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                                    <Plus className="size-4" />
                                </span>
                            </div>
                        </button>
                    );
                })}
            </ResponsiveDialog>
        </>
    );
}
