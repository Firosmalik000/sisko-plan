import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Boxes,
    Layers3,
    Search,
    Warehouse,
} from 'lucide-react';
import { useState } from 'react';
import {
    fieldClass,
    LedgerCard,
    ledgerDateTime,
    money,
    OperationsShell,
    quantity,
} from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { formatCompactMoney, localeTag } from '@/lib/currency';

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
                    [
                        group.name,
                        product.name,
                        product.variant_name,
                        product.sku,
                    ].some((value) =>
                        value
                            ?.toLocaleLowerCase(localeTag())
                            .includes(normalizedSearch),
                    );
                const matchesStatus =
                    stockStatus === 'all' ||
                    (stockStatus === 'low' && isLowStock(product)) ||
                    (stockStatus === 'safe' && !isLowStock(product));

                return matchesSearch && matchesStatus;
            }),
        }))
        .filter((group) => group.products.length > 0);
    const totalValue = products.reduce(
        (total, product) => total + Number(product.inventory_value),
        0,
    );
    const lowStockCount = products.filter(isLowStock).length;

    return (
        <>
            <Head title="Persediaan" />
            <OperationsShell
                active="/operations/inventory"
                eyebrow="Barang"
                title="Persediaan"
                description=""
            >
                <section className="grid grid-cols-3 divide-x divide-[var(--app-ink)]/8 rounded-[1.25rem] border border-[var(--app-ink)]/8 bg-white px-1 py-3 shadow-sm sm:px-3">
                    <InventoryMetric
                        icon={Boxes}
                        label="Item stok"
                        value={String(products.length)}
                    />
                    <InventoryMetric
                        icon={AlertTriangle}
                        label="Stok kritis"
                        value={String(lowStockCount)}
                        danger={lowStockCount > 0}
                    />
                    <InventoryMetric
                        icon={Warehouse}
                        label="Nilai persediaan"
                        value={compactMoney(totalValue)}
                    />
                </section>

                <LedgerCard title="Daftar Persediaan">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                        <label className="relative flex-1">
                            <span className="sr-only">Cari persediaan</span>
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
                            <input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                className={`${fieldClass} pl-9`}
                                placeholder="Cari produk, varian, atau SKU"
                            />
                        </label>
                        <label>
                            <span className="sr-only">Filter status stok</span>
                            <select
                                value={stockStatus}
                                onChange={(event) =>
                                    setStockStatus(event.target.value)
                                }
                                className={`${fieldClass} sm:w-40`}
                            >
                                <option value="all">Semua stok</option>
                                <option value="low">Stok kritis</option>
                                <option value="safe">Stok aman</option>
                            </select>
                        </label>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-stone-200">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[880px] text-left text-sm">
                                <thead className="bg-[#fff3ef] text-[10px] font-black tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Produk</th>
                                        <th className="px-3 py-3">SKU</th>
                                        <th className="px-3 py-3 text-right">
                                            Stok saat ini
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Batas minimum
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            HPP rata-rata/unit
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Nilai persediaan
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                {visibleGroups.map((group) => (
                                    <tbody
                                        key={group.public_id}
                                        className="divide-y divide-stone-100"
                                    >
                                        {group.grouped && (
                                            <tr className="border-t border-[var(--app-soft-strong)] bg-[#fffaf7] first:border-t-0">
                                                <td
                                                    colSpan={7}
                                                    className="px-4 py-2.5"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--app-soft-strong)] text-[var(--app-primary)]">
                                                            <Layers3 className="size-3.5" />
                                                        </span>
                                                        <span className="font-black text-[var(--app-ink)]">
                                                            {group.name}
                                                        </span>
                                                        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-[var(--muted-foreground)] ring-1 ring-[var(--app-ink)]/8">
                                                            {
                                                                group.products
                                                                    .length
                                                            }{' '}
                                                            varian
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
                                                    className="bg-white transition hover:bg-[#fffdfc]"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div
                                                            className={
                                                                group.grouped
                                                                    ? 'flex items-center gap-2 pl-4'
                                                                    : ''
                                                            }
                                                        >
                                                            {group.grouped && (
                                                                <span className="h-px w-3 bg-[var(--app-soft-strong)]" />
                                                            )}
                                                            <span className="font-bold text-stone-900">
                                                                {product.variant_name ??
                                                                    product.name}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 font-mono text-xs text-stone-500">
                                                        {product.sku || '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-black text-[var(--app-primary)] tabular-nums">
                                                        {quantity(
                                                            product.quantity,
                                                        )}{' '}
                                                        <span className="text-[10px] font-bold text-stone-500">
                                                            {product.unit}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-stone-600 tabular-nums">
                                                        {quantity(
                                                            product.minimum_quantity,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-stone-600 tabular-nums">
                                                        {money(
                                                            product.average_cost,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-right font-bold text-stone-800 tabular-nums">
                                                        {money(
                                                            product.inventory_value,
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
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
                                <Boxes className="size-5 text-stone-400" />
                                <p className="mt-2 text-sm font-bold text-stone-600">
                                    Persediaan tidak ditemukan
                                </p>
                            </div>
                        )}
                    </div>
                </LedgerCard>

                <LedgerCard title="Riwayat Stok">
                    <div className="overflow-hidden rounded-xl border border-stone-200">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-left text-sm">
                                <thead className="bg-[#fff3ef] text-[10px] font-black tracking-[0.1em] text-[var(--muted-foreground)] uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Produk</th>
                                        <th className="px-3 py-3">Aktivitas</th>
                                        <th className="px-3 py-3 text-right">
                                            Stok sebelum
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Perubahan
                                        </th>
                                        <th className="px-3 py-3 text-right">
                                            Stok akhir
                                        </th>
                                        <th className="px-4 py-3 text-right">
                                            Waktu
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {movements.data.map((movement) => {
                                        const positive =
                                            Number(movement.quantity_change) >=
                                            0;

                                        return (
                                            <tr
                                                key={movement.public_id}
                                                className="bg-white hover:bg-[#fffdfc]"
                                            >
                                                <td className="px-4 py-3 font-bold text-stone-900">
                                                    {movement.product_name}
                                                </td>
                                                <td className="px-3 py-3 text-stone-600">
                                                    {reasons[movement.reason] ??
                                                        movement.reason}
                                                </td>
                                                <td className="px-3 py-3 text-right text-stone-600 tabular-nums">
                                                    {quantity(
                                                        movement.quantity_before,
                                                    )}{' '}
                                                    <span className="text-[10px] font-bold text-stone-500">
                                                        {movement.unit}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-right">
                                                    <span
                                                        className={`inline-flex items-center gap-1 font-black tabular-nums ${positive ? 'text-[var(--app-primary)]' : 'text-[#aa5638]'}`}
                                                    >
                                                        {positive ? (
                                                            <ArrowUpRight className="size-3.5" />
                                                        ) : (
                                                            <ArrowDownRight className="size-3.5" />
                                                        )}
                                                        {quantity(
                                                            movement.quantity_change,
                                                        )}{' '}
                                                        <span className="text-[10px] font-bold">
                                                            {movement.unit}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-right font-bold tabular-nums">
                                                    {quantity(
                                                        movement.quantity_after,
                                                    )}{' '}
                                                    <span className="text-[10px] font-bold text-stone-500">
                                                        {movement.unit}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-xs whitespace-nowrap text-stone-500">
                                                    {ledgerDateTime(
                                                        movement.occurred_at,
                                                        timezone,
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {movements.data.length === 0 && (
                            <p className="py-10 text-center text-sm font-bold text-stone-500">
                                Belum ada riwayat stok
                            </p>
                        )}
                    </div>
                    <div className="mt-4">
                        <Pagination links={movements.links} />
                    </div>
                </LedgerCard>
            </OperationsShell>
        </>
    );
}

function InventoryMetric({
    icon: Icon,
    label,
    value,
    danger = false,
}: {
    icon: typeof Boxes;
    label: string;
    value: string;
    danger?: boolean;
}) {
    return (
        <div className="min-w-0 px-2 sm:flex sm:items-center sm:gap-3 sm:px-4">
            <span
                className={`hidden size-9 shrink-0 items-center justify-center rounded-xl sm:flex ${danger ? 'bg-[#f8e8df] text-[#aa5638]' : 'bg-[var(--app-soft)] text-[var(--app-primary)]'}`}
            >
                <Icon className="size-4" />
            </span>
            <div className="min-w-0 text-center sm:text-left">
                <p className="truncate text-[9px] font-bold tracking-wide text-[var(--muted-foreground)] uppercase sm:text-[10px]">
                    {label}
                </p>
                <p
                    className={`mt-1 truncate text-sm font-black tabular-nums sm:text-lg ${danger ? 'text-[#9c4f34]' : 'text-[var(--app-ink)]'}`}
                >
                    {value}
                </p>
            </div>
        </div>
    );
}

function StockBadge({ low }: { low: boolean }) {
    return (
        <span
            className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-black ${low ? 'bg-[#f8e8df] text-[#9c4f34]' : 'bg-[var(--app-soft)] text-[var(--app-primary)]'}`}
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
    return (
        Number(product.minimum_quantity) > 0 &&
        Number(product.quantity) <= Number(product.minimum_quantity)
    );
}

function compactMoney(value: string | number) {
    return formatCompactMoney(value);
}
