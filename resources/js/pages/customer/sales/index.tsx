import { Link, router, useForm } from '@inertiajs/react';
import { ReceiptText, RotateCcw, Search, ShoppingCart, UserRound, WalletCards } from 'lucide-react';
import type { FormEvent } from 'react';
import { CommerceBrandMark } from '@/components/commerce-brand-mark';
import { AppPage } from '@/components/page/app-page';
import { DataToolbar, dataToolbarControlClass } from '@/components/page/data-toolbar';
import { EmptyState } from '@/components/page/empty-state';
import { RecordList, RecordListHeader, RecordListRow } from '@/components/page/record-list';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney as money } from '@/lib/currency';
import { ledgerDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { index as posIndex } from '@/routes/pos';
import { index as salesIndex, show as showSale } from '@/routes/sales';
import { create as createReturn } from '@/routes/sales/returns';

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

function paymentLabel(method: Sale['payment_method']) {
    const labels: Record<Sale['payment_method'], string> = {
        cash: 'Tunai',
        qris: 'QRIS',
        qr_payment: 'Pembayaran QR',
        bank_transfer: 'Transfer bank',
        e_wallet: 'E-wallet',
        marketplace: 'Marketplace',
    };

    return translate(labels[method]);
}

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
    const contextQuery = Object.entries(filters).reduce<Record<string, string>>((query, [key, value]) => {
        if (value !== '' && value !== null) {
            query[key] = value;
        }

        return query;
    }, {});

    const applyFilter = (event: FormEvent) => {
        event.preventDefault();
        router.get(salesIndex.url(), filter.data, { preserveState: true, preserveScroll: true, replace: true });
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
            salesIndex.url(),
            { view: filters.view, from: filters.from },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppPage
            title={translate(returnMode ? 'Pilih transaksi retur' : 'Riwayat transaksi')}
            icon={ReceiptText}
            headerSurface
            description={
                <>
                    <strong>{sales.total}</strong> {translate('transaksi')}
                </>
            }
            actions={
                <Button asChild size="touch">
                    <Link href={posIndex.url()}>
                        <ShoppingCart className="size-4" aria-hidden="true" /> {translate('Buka kasir')}
                    </Link>
                </Button>
            }
        >
            <RecordList className="-mx-3 rounded-none border-y border-border min-[375px]:-mx-4 sm:mx-0 sm:rounded-2xl sm:border-0">
                <DataToolbar
                    onSubmit={applyFilter}
                    search={
                        <div className="relative">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                maxLength={120}
                                placeholder={translate('Cari nota, pelanggan, email, atau pesanan')}
                                aria-label={translate('Cari transaksi')}
                                value={filter.data.search}
                                onChange={(event) => filter.setData('search', event.target.value)}
                                className="h-11 rounded-xl bg-background pl-9 text-base sm:text-sm"
                            />
                        </div>
                    }
                    filters={
                        <>
                            <select
                                value={filter.data.period}
                                onChange={(event) => updatePeriod(event.target.value as SalesFilters['period'])}
                                className={dataToolbarControlClass}
                                aria-label={translate('Periode transaksi')}
                            >
                                {periodOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {translate(option.label)}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filter.data.payment_method}
                                onChange={(event) => filter.setData('payment_method', event.target.value as SalesFilters['payment_method'])}
                                className={dataToolbarControlClass}
                                aria-label={translate('Metode bayar')}
                            >
                                <option value="">{translate('Semua pembayaran')}</option>
                                <option value="cash">{translate('Tunai')}</option>
                                <option value="qris">QRIS</option>
                                <option value="qr_payment">{translate('Pembayaran QR')}</option>
                                <option value="bank_transfer">{translate('Transfer bank')}</option>
                                <option value="e_wallet">{translate('E-wallet')}</option>
                                <option value="marketplace">Marketplace</option>
                            </select>
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
                                className={dataToolbarControlClass}
                                aria-label={translate('Kanal penjualan')}
                            >
                                <option value="">{translate('Semua kanal')}</option>
                                <option value="in_store">{translate('Di toko')}</option>
                                <option value="marketplace">Marketplace</option>
                            </select>
                            <select
                                value={filter.data.customer}
                                onChange={(event) => filter.setData('customer', event.target.value as SalesFilters['customer'])}
                                className={dataToolbarControlClass}
                                aria-label={translate('Data pelanggan')}
                            >
                                <option value="">{translate('Semua pelanggan')}</option>
                                <option value="identified">{translate('Dengan data pelanggan')}</option>
                                <option value="guest">{translate('Pembeli umum')}</option>
                            </select>
                            {filter.data.sales_channel === 'marketplace' && (
                                <select
                                    value={filter.data.marketplace_code}
                                    onChange={(event) => filter.setData('marketplace_code', event.target.value)}
                                    className={dataToolbarControlClass}
                                    aria-label="Marketplace"
                                >
                                    <option value="">{translate('Semua marketplace')}</option>
                                    {marketplaces.map((marketplace) => (
                                        <option key={marketplace.code} value={marketplace.code}>
                                            {translate(marketplace.label)}
                                        </option>
                                    ))}
                                </select>
                            )}
                            {filter.data.period === 'custom' && (
                                <>
                                    <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                        {translate('Dari tanggal')}
                                        <input
                                            type="date"
                                            className={dataToolbarControlClass}
                                            value={filter.data.start_date}
                                            onChange={(event) => filter.setData('start_date', event.target.value)}
                                        />
                                    </label>
                                    <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                        {translate('Sampai tanggal')}
                                        <input
                                            type="date"
                                            min={filter.data.start_date || undefined}
                                            className={dataToolbarControlClass}
                                            value={filter.data.end_date}
                                            onChange={(event) => filter.setData('end_date', event.target.value)}
                                        />
                                    </label>
                                </>
                            )}
                        </>
                    }
                    actions={
                        <>
                            {hasFilters && (
                                <Button type="button" size="touch" variant="ghost" onClick={resetFilters}>
                                    <RotateCcw className="size-4" aria-hidden="true" /> {translate('Reset')}
                                </Button>
                            )}
                            <Button type="submit" size="touch" variant="outline">
                                {translate('Terapkan')}
                            </Button>
                        </>
                    }
                />

                {sales.data.length > 0 && (
                    <RecordListHeader className="grid-cols-[minmax(15rem,1.4fr)_10rem_12rem_10rem] gap-4">
                        <span>{translate('Transaksi')}</span>
                        <span className="text-right">{translate('Pendapatan neto')}</span>
                        <span>{translate('HPP / laba kotor neto')}</span>
                        <span className="sr-only">{translate('Aksi')}</span>
                    </RecordListHeader>
                )}

                {sales.data.length === 0 ? (
                    <EmptyState
                        icon={ReceiptText}
                        title={translate('Transaksi tidak ditemukan')}
                        description={translate('Coba ubah kata kunci atau filter yang digunakan.')}
                        action={
                            hasFilters ? (
                                <Button type="button" size="touch" variant="outline" onClick={resetFilters}>
                                    {translate('Reset filter')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div>
                        {sales.data.map((sale) => (
                            <RecordListRow
                                key={sale.public_id}
                                className="grid gap-4 md:grid-cols-[minmax(15rem,1.4fr)_10rem_12rem_10rem] md:items-center"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate font-mono text-xs font-semibold text-primary">{sale.document_number}</p>
                                        <Badge variant="secondary" className="font-medium">
                                            <WalletCards className="size-3" aria-hidden="true" /> {paymentLabel(sale.payment_method)}
                                        </Badge>
                                        {sale.sales_channel === 'marketplace' && (
                                            <Badge variant="outline" className="font-medium text-primary">
                                                <CommerceBrandMark code={sale.marketplace_code} className="size-5 rounded-md" />
                                                {translate(
                                                    marketplaces.find((item) => item.code === sale.marketplace_code)?.label ??
                                                        'Marketplace',
                                                )}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {ledgerDateTime(sale.occurred_at, timezone)} · {sale.account_name}
                                    </p>
                                    <div className="mt-2 flex min-w-0 items-center gap-2 text-sm">
                                        <UserRound className="size-4 shrink-0 text-primary" aria-hidden="true" />
                                        <p className="min-w-0 truncate font-medium text-foreground">
                                            {sale.customer_name ?? translate('Pembeli umum')}
                                            {sale.customer_phone && <span className="text-muted-foreground"> · {sale.customer_phone}</span>}
                                            {sale.customer_email && (
                                                <span className="block truncate text-xs font-normal text-muted-foreground">
                                                    {sale.customer_email}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {sale.external_order_number && (
                                        <p className="mt-1 truncate text-xs text-muted-foreground">
                                            {translate('Pesanan')} · {sale.external_order_number}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-end justify-between gap-3 md:block md:text-right">
                                    <p className="text-xs text-muted-foreground md:hidden">{translate('Pendapatan neto')}</p>
                                    <div>
                                        <p className="font-semibold text-foreground tabular-nums">{money(sale.net_revenue)}</p>
                                        {Number(sale.refund_amount) > 0 && (
                                            <p className="text-xs font-medium text-destructive">Refund {money(sale.refund_amount)}</p>
                                        )}
                                    </div>
                                </div>
                                {canViewProfit ? (
                                    <div className="flex items-end justify-between gap-3 md:block">
                                        <p className="text-xs text-muted-foreground md:hidden">{translate('HPP / laba kotor neto')}</p>
                                        <p className="font-medium text-foreground tabular-nums">
                                            {money(sale.net_cogs ?? 0)} /{' '}
                                            <span className="text-primary">{money(sale.net_gross_profit ?? 0)}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="hidden md:block" />
                                )}
                                <div className={`grid gap-2 ${canReturn ? 'grid-cols-2' : 'grid-cols-1'} md:flex md:justify-end`}>
                                    <Button asChild size="touch" variant="outline">
                                        <Link href={showSale.url(sale.public_id, { query: contextQuery })}>{translate('Invoice')}</Link>
                                    </Button>
                                    {canReturn && (
                                        <Button asChild size="touch">
                                            <Link href={createReturn.url(sale.public_id, { query: contextQuery })}>
                                                {translate(returnMode ? 'Pilih' : 'Retur')}
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </RecordListRow>
                        ))}
                    </div>
                )}

                {sales.links.length > 3 && (
                    <div className="border-t border-border px-3 py-3 sm:px-4">
                        <Pagination links={sales.links} />
                    </div>
                )}
            </RecordList>
        </AppPage>
    );
}
