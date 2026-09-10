import { Head, Link, router, useForm } from '@inertiajs/react';
import { CalendarDays, Filter, ReceiptText, RotateCcw, Search, ShoppingCart, UserRound, WalletCards } from 'lucide-react';
import type { FormEvent } from 'react';
import { CommerceBrandMark } from '@/components/commerce-brand-mark';
import { ledgerDateTime, money } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { translate } from '@/lib/i18n';

type Sale = {
    public_id: string;
    document_number: string;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    sales_channel: 'in_store' | 'marketplace';
    marketplace_code: string | null;
    external_order_number: string | null;
    refund_amount: string;
    net_revenue: string;
    payment_method: 'cash' | 'qris' | 'qr_payment' | 'bank_transfer' | 'e_wallet' | 'marketplace';
    account_name: string;
    occurred_at: string;
    net_cogs?: string;
    net_gross_profit?: string;
};

type SalesFilters = {
    search: string;
    period: 'today' | 'week' | 'month' | 'all' | 'custom';
    start_date: string;
    end_date: string;
    payment_method: '' | Sale['payment_method'];
    sales_channel: '' | Sale['sales_channel'];
    marketplace_code: string;
    customer: '' | 'identified' | 'guest';
    view: 'history' | 'returns';
    from: 'pos' | null;
};

type Marketplace = { code: string; label: string };

const periodOptions: Array<{ value: SalesFilters['period']; label: string }> = [
    { value: 'today', label: 'Hari ini' },
    { value: 'week', label: '7 hari terakhir' },
    { value: 'month', label: 'Bulan ini' },
    { value: 'all', label: 'Semua waktu' },
    { value: 'custom', label: 'Pilih tanggal' },
];

const fieldClass =
    'h-11 w-full min-w-0 rounded-xl border border-[var(--app-ink)]/12 bg-[#fffaf7] px-3 text-sm font-bold text-[var(--app-ink)] outline-none transition focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary)]/15';

export default function SalesIndex({
    sales,
    canViewProfit,
    canReturn,
    timezone,
    filters,
    marketplaces,
}: {
    sales: { data: Sale[]; links: PaginationLink[]; total: number };
    canViewProfit: boolean;
    canReturn: boolean;
    timezone: string;
    filters: SalesFilters;
    marketplaces: Marketplace[];
}) {
    const returnMode = filters.view === 'returns';
    const filter = useForm(filters);
    const hasFilters =
        filters.search !== '' ||
        filters.period !== 'today' ||
        filters.start_date !== '' ||
        filters.end_date !== '' ||
        filters.payment_method !== '' ||
        filters.sales_channel !== '' ||
        filters.marketplace_code !== '' ||
        filters.customer !== '';
    const contextQuery = new URLSearchParams(
        Object.entries(filters).reduce<Record<string, string>>((query, [key, value]) => {
            if (value !== '' && value !== null) {
                query[key] = value;
            }

            return query;
        }, {}),
    ).toString();

    const applyFilter = (event: FormEvent) => {
        event.preventDefault();
        router.get('/sales', filter.data, { preserveState: true, preserveScroll: true, replace: true });
    };

    const updatePeriod = (period: SalesFilters['period']) => {
        filter.setData((data) => ({
            ...data,
            period,
            start_date: period === 'custom' ? data.start_date : '',
            end_date: period === 'custom' ? data.end_date : '',
        }));
    };

    const resetFilters = () => {
        router.get(
            '/sales',
            { view: filters.view, from: filters.from },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    return (
        <>
            <Head title={translate(returnMode ? 'Retur penjualan' : 'Riwayat penjualan')} />
            <main className="min-h-full bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-4">
                    <header className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className={`grid size-11 shrink-0 place-items-center rounded-xl ${returnMode ? 'bg-red-50 text-red-700' : 'bg-[var(--app-soft)] text-[var(--app-primary)]'}`}
                                >
                                    {returnMode ? <RotateCcw className="size-5" /> : <ReceiptText className="size-5" />}
                                </span>
                                <div className="min-w-0">
                                    <h1 className="text-lg leading-tight font-black tracking-[-0.03em] text-[var(--app-ink)] sm:text-2xl">
                                        {translate(returnMode ? 'Pilih Transaksi Retur' : 'Riwayat Transaksi')}
                                    </h1>
                                    <p className="mt-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                        {sales.total} {translate('transaksi')}
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/pos"
                                className="hidden h-10 shrink-0 items-center gap-2 rounded-xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/30 focus-visible:outline-none sm:inline-flex"
                            >
                                <ShoppingCart className="size-4" /> {translate('Buka kasir')}
                            </Link>
                        </div>
                    </header>

                    <section className="rounded-2xl border border-[var(--app-ink)]/8 bg-white p-3 shadow-sm sm:p-4">
                        <form onSubmit={applyFilter} className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-sm font-black text-[var(--app-ink)]">
                                    <Filter className="size-4 text-[var(--app-primary)]" /> {translate('Filter transaksi')}
                                </div>
                                {hasFilters && (
                                    <button
                                        type="button"
                                        className="text-xs font-bold text-orange-700 underline-offset-4 hover:underline"
                                        onClick={resetFilters}
                                    >
                                        {translate('Reset filter')}
                                    </button>
                                )}
                            </div>
                            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                                <label className="relative sm:col-span-2 xl:col-span-2">
                                    <span className="sr-only">{translate('Cari transaksi')}</span>
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
                                    <input
                                        className={`${fieldClass} pl-9`}
                                        maxLength={120}
                                        placeholder={translate('Cari nota, pelanggan, email, atau pesanan')}
                                        value={filter.data.search}
                                        onChange={(event) => filter.setData('search', event.target.value)}
                                    />
                                </label>
                                <label>
                                    <span className="sr-only">{translate('Periode transaksi')}</span>
                                    <select
                                        value={filter.data.period}
                                        onChange={(event) => updatePeriod(event.target.value as SalesFilters['period'])}
                                        className={fieldClass}
                                    >
                                        {periodOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {translate(option.label)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    <span className="sr-only">{translate('Metode bayar')}</span>
                                    <select
                                        value={filter.data.payment_method}
                                        onChange={(event) =>
                                            filter.setData('payment_method', event.target.value as SalesFilters['payment_method'])
                                        }
                                        className={fieldClass}
                                    >
                                        <option value="">{translate('Semua pembayaran')}</option>
                                        <option value="cash">{translate('Tunai')}</option>
                                        <option value="qris">QRIS</option>
                                        <option value="qr_payment">{translate('Pembayaran QR')}</option>
                                        <option value="bank_transfer">{translate('Transfer bank')}</option>
                                        <option value="e_wallet">{translate('E-wallet')}</option>
                                        <option value="marketplace">Marketplace</option>
                                    </select>
                                </label>
                                <label>
                                    <span className="sr-only">{translate('Kanal penjualan')}</span>
                                    <select
                                        value={filter.data.sales_channel}
                                        onChange={(event) => {
                                            const salesChannel = event.target.value as SalesFilters['sales_channel'];
                                            filter.setData((data) => ({
                                                ...data,
                                                sales_channel: salesChannel,
                                                marketplace_code: salesChannel === 'marketplace' ? data.marketplace_code : '',
                                            }));
                                        }}
                                        className={fieldClass}
                                    >
                                        <option value="">{translate('Semua kanal')}</option>
                                        <option value="in_store">{translate('Di toko')}</option>
                                        <option value="marketplace">Marketplace</option>
                                    </select>
                                </label>
                                <label>
                                    <span className="sr-only">{translate('Data pelanggan')}</span>
                                    <select
                                        value={filter.data.customer}
                                        onChange={(event) => filter.setData('customer', event.target.value as SalesFilters['customer'])}
                                        className={fieldClass}
                                    >
                                        <option value="">{translate('Semua pelanggan')}</option>
                                        <option value="identified">{translate('Dengan data pelanggan')}</option>
                                        <option value="guest">{translate('Pembeli umum')}</option>
                                    </select>
                                </label>
                                <button
                                    type="submit"
                                    className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--app-primary)] px-5 text-sm font-black text-[var(--app-primary-foreground)] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/30 focus-visible:outline-none sm:col-span-2 lg:col-span-1 xl:col-span-6 xl:justify-self-end"
                                >
                                    {translate('Terapkan')}
                                </button>
                            </div>
                            {filter.data.sales_channel === 'marketplace' && (
                                <div className="grid gap-2.5 border-t border-[var(--app-ink)]/8 pt-3 sm:grid-cols-2 lg:max-w-xl">
                                    <label className="space-y-1 text-xs font-bold text-stone-600">
                                        Marketplace
                                        <select
                                            value={filter.data.marketplace_code}
                                            onChange={(event) => filter.setData('marketplace_code', event.target.value)}
                                            className={fieldClass}
                                        >
                                            <option value="">{translate('Semua marketplace')}</option>
                                            {marketplaces.map((marketplace) => (
                                                <option key={marketplace.code} value={marketplace.code}>
                                                    {translate(marketplace.label)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            )}
                            {filter.data.period === 'custom' && (
                                <div className="grid gap-2.5 border-t border-[var(--app-ink)]/8 pt-3 sm:grid-cols-2 lg:max-w-xl">
                                    <label className="space-y-1 text-xs font-bold text-stone-600">
                                        {translate('Dari tanggal')}
                                        <input
                                            type="date"
                                            className={fieldClass}
                                            value={filter.data.start_date}
                                            onChange={(event) => filter.setData('start_date', event.target.value)}
                                        />
                                    </label>
                                    <label className="space-y-1 text-xs font-bold text-stone-600">
                                        {translate('Sampai tanggal')}
                                        <input
                                            type="date"
                                            min={filter.data.start_date || undefined}
                                            className={fieldClass}
                                            value={filter.data.end_date}
                                            onChange={(event) => filter.setData('end_date', event.target.value)}
                                        />
                                    </label>
                                </div>
                            )}
                        </form>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-[var(--app-ink)]/8 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--app-ink)]/8 px-4 py-3 sm:px-5">
                            <div>
                                <h2 className="text-base font-black tracking-[-0.02em] text-[var(--app-ink)]">
                                    {translate('Daftar transaksi')}
                                </h2>
                                <p className="text-xs font-semibold text-stone-500">
                                    {sales.total} {translate('hasil ditemukan')}
                                </p>
                            </div>
                            <CalendarDays className="size-5 text-[var(--app-primary)]" />
                        </div>
                        <div className="divide-y divide-[var(--app-ink)]/8">
                            {sales.data.map((sale) => (
                                <article
                                    key={sale.public_id}
                                    className="grid gap-3 p-4 transition hover:bg-[#fffaf7] sm:p-5 md:grid-cols-[1.35fr_1fr_1fr_auto] md:items-center"
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate font-mono text-xs font-bold text-teal-800">{sale.document_number}</p>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-[10px] font-black text-stone-600 uppercase">
                                                <WalletCards className="size-3" />{' '}
                                                {sale.payment_method === 'qris'
                                                    ? 'QRIS'
                                                    : sale.payment_method === 'qr_payment'
                                                      ? translate('Pembayaran QR')
                                                      : sale.payment_method === 'cash'
                                                        ? translate('Tunai')
                                                        : sale.payment_method === 'bank_transfer'
                                                          ? translate('Transfer bank')
                                                          : sale.payment_method === 'e_wallet'
                                                            ? translate('E-wallet')
                                                            : 'Marketplace'}
                                            </span>
                                            {sale.sales_channel === 'marketplace' && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 text-[10px] font-black text-orange-700 uppercase">
                                                    <CommerceBrandMark code={sale.marketplace_code} className="size-5 rounded-md" />
                                                    {translate(
                                                        marketplaces.find((item) => item.code === sale.marketplace_code)?.label ??
                                                            'Marketplace',
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-stone-500">
                                            {ledgerDateTime(sale.occurred_at, timezone)} · {sale.account_name}
                                        </p>
                                        <div className="mt-2 flex min-w-0 items-center gap-2 text-sm">
                                            <UserRound className="size-4 shrink-0 text-[var(--app-primary)]" />
                                            {sale.customer_name ? (
                                                <p className="min-w-0 truncate font-bold text-stone-800">
                                                    {sale.customer_name}
                                                    {sale.customer_phone && (
                                                        <span className="font-medium text-stone-500"> · {sale.customer_phone}</span>
                                                    )}
                                                    {sale.customer_email && (
                                                        <span className="block truncate text-xs font-medium text-stone-500">
                                                            {sale.customer_email}
                                                        </span>
                                                    )}
                                                </p>
                                            ) : (
                                                <p className="font-medium text-stone-500">{translate('Pembeli umum')}</p>
                                            )}
                                        </div>
                                        {sale.external_order_number && (
                                            <p className="mt-1 truncate text-xs font-semibold text-stone-500">
                                                {translate('Pesanan')} · {sale.external_order_number}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500">{translate('Pendapatan neto')}</p>
                                        <p className="font-black text-[var(--app-ink)]">{money(sale.net_revenue)}</p>
                                        {Number(sale.refund_amount) > 0 && (
                                            <p className="text-xs font-semibold text-red-600">Refund {money(sale.refund_amount)}</p>
                                        )}
                                    </div>
                                    {canViewProfit ? (
                                        <div>
                                            <p className="text-xs text-stone-500">{translate('HPP / laba kotor neto')}</p>
                                            <p className="font-semibold text-stone-800">
                                                {money(sale.net_cogs ?? 0)} /{' '}
                                                <span className="text-teal-700">{money(sale.net_gross_profit ?? 0)}</span>
                                            </p>
                                        </div>
                                    ) : (
                                        <div />
                                    )}
                                    <div className={`grid gap-2 ${canReturn ? 'grid-cols-2' : 'grid-cols-1'} md:flex md:justify-end`}>
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/sales/${sale.public_id}?${contextQuery}`}>{translate('Invoice')}</Link>
                                        </Button>
                                        {canReturn && (
                                            <Button asChild size="sm">
                                                <Link href={`/sales/${sale.public_id}/returns/create?${contextQuery}`}>
                                                    {translate(returnMode ? 'Pilih' : 'Retur')}
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                        {sales.data.length === 0 && (
                            <div className="px-5 py-14 text-center">
                                <ReceiptText className="mx-auto size-8 text-stone-300" />
                                <p className="mt-3 text-sm font-black text-[var(--app-ink)]">{translate('Transaksi tidak ditemukan')}</p>
                                <button type="button" className="mt-2 text-sm font-bold text-orange-700" onClick={resetFilters}>
                                    {translate('Reset filter')}
                                </button>
                            </div>
                        )}
                        {sales.links.length > 3 && (
                            <div className="border-t border-[var(--app-ink)]/8 p-4 sm:px-5">
                                <Pagination links={sales.links} />
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}
