import { ArrowDownRight, ArrowUpRight, Boxes, Layers3, Search, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { fieldClass, LedgerCard, OperationsShell } from '@/components/operations-shell';
import { MetricItem, MetricStrip } from '@/components/page/metric-strip';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { formatCompactMoney, formatMoney as money, formatQuantity as quantity, localeTag } from '@/lib/currency';
import { ledgerDateTime } from '@/lib/date-time';
import { translate, useTranslation } from '@/lib/i18n';
import { inventory as inventoryIndex } from '@/routes/operations';

type Product = {
    public_id: string;
    name: string;
    sku: string | null;
    variant_name: string | null;
    parent_public_id: string | null;
    parent_name: string | null;
    unit: string;
    quantity: string;
    average_cost: string;
    inventory_value: string;
    minimum_quantity: string;
};

type ProductGroup = {
    public_id: string;
    name: string;
    grouped: boolean;
    products: Product[];
};

type Movement = {
    public_id: string;
    product_name: string;
    unit: string;
    reason: string;
    quantity_before: string | number;
    quantity_change: string;
    quantity_after: string;
    occurred_at: string;
};

const reasons: Record<string, string> = {
    opening_stock: 'Saldo awal',
    adjustment_in: 'Stok masuk',
    adjustment_out: 'Stok keluar',
    stock_opname_in: 'Stock opname masuk',
    stock_opname_out: 'Stock opname keluar',
    damaged: 'Rusak',
    lost: 'Hilang',
    inventory_contribution: 'Setoran modal',
    inventory_withdrawal: 'Penarikan modal',
    sale: 'Penjualan',
    sale_return: 'Retur penjualan',
    purchase: 'Pembelian',
    product_stock_update: 'Pembaruan stok produk',
};

export default function InventoryPage({
    products,
    movements,
    timezone,
}: {
    products: Product[];
    movements: { data: Movement[]; links: PaginationLink[]; total: number };
    timezone: string;
}) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [stockStatus, setStockStatus] = useState('all');
    const normalizedSearch = search.trim().toLocaleLowerCase(localeTag());
    const groups = groupProducts(products);
    const visibleGroups = groups
        .map((group) => ({
            ...group,
            products: group.products.filter((product) => {
                const matchesSearch =
                    normalizedSearch === '' ||
                    [group.name, product.name, product.variant_name, product.sku].some((value) =>
                        value?.toLocaleLowerCase(localeTag()).includes(normalizedSearch),
                    );
                const matchesStatus =
                    stockStatus === 'all' ||
                    (stockStatus === 'low' && isLowStock(product)) ||
                    (stockStatus === 'safe' && !isLowStock(product));

                return matchesSearch && matchesStatus;
            }),
        }))
        .filter((group) => group.products.length > 0);
    const totalValue = products.reduce((total, product) => total + Number(product.inventory_value), 0);
    const lowStockCount = products.filter(isLowStock).length;

    return (
        <OperationsShell active={inventoryIndex.url()} title="Persediaan" icon={Warehouse}>
            <MetricStrip className="[&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
                <MetricItem label={translate('Item stok')} value={String(products.length)} />
                <MetricItem
                    label={translate('Stok kritis')}
                    value={<span className={lowStockCount > 0 ? 'text-destructive' : undefined}>{lowStockCount}</span>}
                />
                <MetricItem label={translate('Nilai persediaan')} value={formatCompactMoney(totalValue)} />
            </MetricStrip>

            <LedgerCard title="Daftar Persediaan">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                    <label className="relative flex-1">
                        <span className="sr-only">Cari persediaan</span>
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className={`${fieldClass} pl-9`}
                            placeholder="Cari produk, varian, atau SKU"
                        />
                    </label>
                    <label>
                        <span className="sr-only">Filter status stok</span>
                        <select
                            value={stockStatus}
                            onChange={(event) => setStockStatus(event.target.value)}
                            className={`${fieldClass} sm:w-40`}
                        >
                            <option value="all">Semua stok</option>
                            <option value="low">Stok kritis</option>
                            <option value="safe">Stok aman</option>
                        </select>
                    </label>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                    <div>
                        <table className="w-full text-left text-sm">
                            <thead className="hidden bg-secondary text-[10px] font-bold tracking-[0.1em] text-[var(--muted-foreground)] uppercase md:table-header-group">
                                <tr>
                                    <th className="px-4 py-3">Produk</th>
                                    <th className="px-3 py-3">SKU</th>
                                    <th className="px-3 py-3 text-right">Stok saat ini</th>
                                    <th className="px-3 py-3 text-right">Batas minimum</th>
                                    <th className="px-3 py-3 text-right">HPP rata-rata/unit</th>
                                    <th className="px-3 py-3 text-right">Nilai persediaan</th>
                                    <th className="px-4 py-3 text-right">Status</th>
                                </tr>
                            </thead>
                            {visibleGroups.map((group) => (
                                <tbody key={group.public_id} className="block divide-y divide-border md:table-row-group">
                                    {group.grouped && (
                                        <tr className="block border-t border-[var(--app-soft-strong)] bg-secondary/50 first:border-t-0 md:table-row">
                                            <td colSpan={7} className="block px-4 py-2.5 md:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--app-soft-strong)] text-[var(--app-primary)]">
                                                        <Layers3 className="size-3.5" />
                                                    </span>
                                                    <span className="font-bold text-[var(--app-ink)]">{group.name}</span>
                                                    <span className="rounded-md bg-card px-2 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)] ring-1 ring-[var(--app-ink)]/8">
                                                        {group.products.length} varian
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {group.products.map((product) => {
                                        const low = isLowStock(product);

                                        return (
                                            <tr
                                                key={product.public_id}
                                                className="grid grid-cols-2 gap-3 bg-card px-4 py-4 transition hover:bg-secondary/30 md:table-row md:px-0 md:py-0"
                                            >
                                                <td className="col-span-2 p-0 md:table-cell md:px-4 md:py-3">
                                                    <div
                                                        className={`flex items-start justify-between gap-3 ${group.grouped ? 'md:pl-4' : ''}`}
                                                    >
                                                        <div className="min-w-0">
                                                            {group.grouped && <span className="h-px w-3 bg-[var(--app-soft-strong)]" />}
                                                            <span className="block truncate font-bold text-foreground">
                                                                {product.variant_name ?? product.name}
                                                            </span>
                                                            <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">
                                                                {product.sku || translate('Tanpa SKU')}
                                                            </span>
                                                        </div>
                                                        <span className="md:hidden">
                                                            <StockBadge low={low} />
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="hidden px-3 py-3 font-mono text-xs text-muted-foreground md:table-cell">
                                                    {product.sku || '-'}
                                                </td>
                                                <td className="p-0 font-bold text-[var(--app-primary)] tabular-nums md:table-cell md:px-3 md:py-3 md:text-right">
                                                    <span className="block text-[10px] font-medium text-muted-foreground md:hidden">
                                                        {translate('Stok saat ini')}
                                                    </span>
                                                    {quantity(product.quantity)}{' '}
                                                    <span className="text-[10px] font-bold text-muted-foreground">{product.unit}</span>
                                                </td>
                                                <td className="p-0 text-right text-muted-foreground tabular-nums md:table-cell md:px-3 md:py-3">
                                                    <span className="block text-[10px] font-medium md:hidden">
                                                        {translate('Batas minimum')}
                                                    </span>
                                                    {quantity(product.minimum_quantity)}
                                                </td>
                                                <td className="p-0 text-muted-foreground tabular-nums md:table-cell md:px-3 md:py-3 md:text-right">
                                                    <span className="block text-[10px] font-medium md:hidden">
                                                        {translate('HPP rata-rata')}
                                                    </span>
                                                    {money(product.average_cost)}
                                                </td>
                                                <td className="p-0 text-right font-bold text-foreground tabular-nums md:table-cell md:px-3 md:py-3">
                                                    <span className="block text-[10px] font-medium text-muted-foreground md:hidden">
                                                        {translate('Nilai persediaan')}
                                                    </span>
                                                    {money(product.inventory_value)}
                                                </td>
                                                <td className="hidden px-4 py-3 text-right md:table-cell">
                                                    <StockBadge low={low} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            ))}
                        </table>
                    </div>
                    {visibleGroups.length === 0 && (
                        <div className="flex min-h-32 flex-col items-center justify-center px-4 text-center">
                            <Boxes className="size-5 text-muted-foreground" />
                            <p className="mt-2 text-sm font-bold text-muted-foreground">Persediaan tidak ditemukan</p>
                        </div>
                    )}
                </div>
            </LedgerCard>

            <LedgerCard title="Riwayat Stok">
                <div className="overflow-hidden rounded-xl border border-border">
                    <div>
                        <table className="w-full text-left text-sm">
                            <thead className="hidden bg-secondary text-[10px] font-bold tracking-[0.1em] text-[var(--muted-foreground)] uppercase md:table-header-group">
                                <tr>
                                    <th className="px-4 py-3">Produk</th>
                                    <th className="px-3 py-3">Aktivitas</th>
                                    <th className="px-3 py-3 text-right">Stok sebelum</th>
                                    <th className="px-3 py-3 text-right">Perubahan</th>
                                    <th className="px-3 py-3 text-right">Stok akhir</th>
                                    <th className="px-4 py-3 text-right">Waktu</th>
                                </tr>
                            </thead>
                            <tbody className="block divide-y divide-border md:table-row-group">
                                {movements.data.map((movement) => {
                                    const positive = Number(movement.quantity_change) >= 0;

                                    return (
                                        <tr
                                            key={movement.public_id}
                                            className="grid grid-cols-3 gap-3 bg-card px-4 py-4 hover:bg-secondary/30 md:table-row md:px-0 md:py-0"
                                        >
                                            <td className="col-span-2 p-0 font-bold text-foreground md:table-cell md:px-4 md:py-3">
                                                {movement.product_name}
                                                <span className="mt-0.5 block text-xs font-normal text-muted-foreground md:hidden">
                                                    {t(reasons[movement.reason] ?? movement.reason)}
                                                </span>
                                            </td>
                                            <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">
                                                {t(reasons[movement.reason] ?? movement.reason)}
                                            </td>
                                            <td className="p-0 text-right text-xs text-muted-foreground md:table-cell md:px-3 md:py-3">
                                                <span className="block text-[10px] md:hidden">{translate('Waktu')}</span>
                                                <span className="md:hidden">{ledgerDateTime(movement.occurred_at, timezone)}</span>
                                                <span className="hidden tabular-nums md:inline">
                                                    {quantity(movement.quantity_before)}{' '}
                                                    <span className="text-[10px] font-bold text-muted-foreground">{movement.unit}</span>
                                                </span>
                                            </td>
                                            <td className="p-0 md:table-cell md:px-3 md:py-3 md:text-right">
                                                <span className="block text-[10px] text-muted-foreground md:hidden">
                                                    {translate('Perubahan')}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center gap-1 font-bold tabular-nums ${positive ? 'text-[var(--app-primary)]' : 'text-destructive'}`}
                                                >
                                                    {positive ? (
                                                        <ArrowUpRight className="size-3.5" />
                                                    ) : (
                                                        <ArrowDownRight className="size-3.5" />
                                                    )}
                                                    {quantity(movement.quantity_change)}{' '}
                                                    <span className="text-[10px] font-bold">{movement.unit}</span>
                                                </span>
                                            </td>
                                            <td className="p-0 font-bold tabular-nums md:table-cell md:px-3 md:py-3 md:text-right">
                                                <span className="block text-[10px] font-medium text-muted-foreground md:hidden">
                                                    {translate('Stok akhir')}
                                                </span>
                                                {quantity(movement.quantity_after)}{' '}
                                                <span className="text-[10px] font-bold text-muted-foreground">{movement.unit}</span>
                                            </td>
                                            <td className="hidden px-4 py-3 text-right text-xs whitespace-nowrap text-muted-foreground md:table-cell">
                                                {ledgerDateTime(movement.occurred_at, timezone)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {movements.data.length === 0 && (
                        <p className="py-10 text-center text-sm font-bold text-muted-foreground">Belum ada riwayat stok</p>
                    )}
                </div>
                <div className="mt-4">
                    <Pagination links={movements.links} />
                </div>
            </LedgerCard>
        </OperationsShell>
    );
}

function StockBadge({ low }: { low: boolean }) {
    return (
        <span
            className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold ${low ? 'bg-destructive/10 text-destructive' : 'bg-[var(--app-soft)] text-[var(--app-primary)]'}`}
        >
            {low ? 'Kritis' : 'Aman'}
        </span>
    );
}

function groupProducts(products: Product[]): ProductGroup[] {
    const groups = new Map<string, ProductGroup>();

    products.forEach((product) => {
        const publicId = product.parent_public_id ?? product.public_id;
        const current = groups.get(publicId) ?? {
            public_id: publicId,
            name: product.parent_name ?? product.name,
            grouped: product.parent_public_id !== null,
            products: [],
        };

        current.products.push(product);
        groups.set(publicId, current);
    });

    return Array.from(groups.values());
}

function isLowStock(product: Product) {
    return Number(product.minimum_quantity) > 0 && Number(product.quantity) <= Number(product.minimum_quantity);
}
