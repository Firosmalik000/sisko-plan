import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import {
    buttonClass,
    currentDateTime,
    fieldClass,
    LedgerCard,
    ledgerDateTime,
    money,
    OperationsShell,
    postingToken,
    quantity,
} from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';

type Product = {
    public_id: string;
    name: string;
    sku: string | null;
    unit: string;
    quantity: string;
    average_cost: string;
    inventory_value: string;
    minimum_quantity: string;
};
type Movement = {
    public_id: string;
    product_name: string;
    reason: string;
    quantity_change: string;
    unit_cost: string;
    quantity_after: string;
    occurred_at: string;
};

const reasons: Record<string, string> = {
    opening_stock: 'Saldo awal',
    adjustment_in: 'Penyesuaian masuk',
    adjustment_out: 'Penyesuaian keluar',
    damaged: 'Rusak',
    lost: 'Hilang',
    inventory_contribution: 'Setoran modal',
    inventory_withdrawal: 'Penarikan modal',
    sale: 'Penjualan',
    sale_return: 'Retur penjualan',
};

export default function InventoryPage({
    products,
    movements,
    timezone,
    canManage,
}: {
    products: Product[];
    movements: { data: Movement[]; links: PaginationLink[]; total: number };
    timezone: string;
    canManage: boolean;
}) {
    const form = useForm({
        type: 'opening',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
        items: [
            {
                product_id: products[0]?.public_id ?? '',
                quantity: '',
                unit_cost: '',
            },
        ],
    });
    const minimum = useForm({
        product_id: products[0]?.public_id ?? '',
        minimum_quantity: '',
    });
    const incoming =
        form.data.type === 'opening' || form.data.type === 'increase';
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/operations/inventory/adjustments', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('notes', 'items');
                form.setData('idempotency_key', postingToken());
            },
        });
    };
    const submitMinimum = (event: FormEvent) => {
        event.preventDefault();
        minimum.post('/operations/inventory/minimum-stock', {
            preserveScroll: true,
            onSuccess: () => minimum.reset('minimum_quantity'),
        });
    };

    return (
        <>
            <Head title="Inventory ledger" />
            <OperationsShell
                active="/operations/inventory"
                eyebrow="Buku 01 / Barang"
                title="Setiap unit punya jejak."
                description="Saldo inventory adalah proyeksi dari movement posted. Stok keluar selalu dinilai dengan moving average berjalan."
            >
                {canManage && (
                    <LedgerCard
                        title="Posting pergerakan stok"
                        description="Dokumen yang sudah diposting tidak dapat diedit."
                    >
                        <form
                            onSubmit={submit}
                            className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"
                        >
                            <label className="space-y-1 text-sm font-semibold text-stone-700">
                                Jenis
                                <select
                                    className={fieldClass}
                                    value={form.data.type}
                                    onChange={(event) =>
                                        form.setData('type', event.target.value)
                                    }
                                >
                                    <option value="opening">Saldo awal</option>
                                    <option value="increase">
                                        Penyesuaian masuk
                                    </option>
                                    <option value="decrease">
                                        Penyesuaian keluar
                                    </option>
                                    <option value="damaged">
                                        Barang rusak
                                    </option>
                                    <option value="lost">Barang hilang</option>
                                </select>
                            </label>
                            <label className="space-y-1 text-sm font-semibold text-stone-700">
                                Produk
                                <select
                                    className={fieldClass}
                                    value={form.data.items[0].product_id}
                                    onChange={(event) =>
                                        form.setData('items', [
                                            {
                                                ...form.data.items[0],
                                                product_id: event.target.value,
                                            },
                                        ])
                                    }
                                >
                                    {products.map((product) => (
                                        <option
                                            key={product.public_id}
                                            value={product.public_id}
                                        >
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-1 text-sm font-semibold text-stone-700">
                                Kuantitas
                                <input
                                    className={fieldClass}
                                    type="number"
                                    min="0.000001"
                                    step="0.000001"
                                    value={form.data.items[0].quantity}
                                    onChange={(event) =>
                                        form.setData('items', [
                                            {
                                                ...form.data.items[0],
                                                quantity: event.target.value,
                                            },
                                        ])
                                    }
                                    required
                                />
                            </label>
                            <label className="space-y-1 text-sm font-semibold text-stone-700">
                                Biaya/unit {incoming ? '' : '(otomatis)'}
                                <input
                                    className={fieldClass}
                                    type="number"
                                    min="0"
                                    step="0.0001"
                                    value={form.data.items[0].unit_cost}
                                    onChange={(event) =>
                                        form.setData('items', [
                                            {
                                                ...form.data.items[0],
                                                unit_cost: event.target.value,
                                            },
                                        ])
                                    }
                                    disabled={!incoming}
                                    required={incoming}
                                />
                            </label>
                            <div className="flex items-end">
                                <button
                                    className={`${buttonClass} w-full`}
                                    disabled={
                                        form.processing || products.length === 0
                                    }
                                >
                                    Posting stok
                                </button>
                            </div>
                            <label className="space-y-1 text-sm font-semibold text-stone-700 md:col-span-2">
                                Waktu transaksi
                                <input
                                    className={fieldClass}
                                    type="datetime-local"
                                    value={form.data.occurred_at}
                                    onChange={(event) =>
                                        form.setData(
                                            'occurred_at',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </label>
                            <label className="space-y-1 text-sm font-semibold text-stone-700 md:col-span-2 xl:col-span-3">
                                Catatan
                                <input
                                    className={fieldClass}
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            {Object.keys(form.errors).length > 0 && (
                                <p className="text-sm font-medium text-red-700 md:col-span-full">
                                    {Object.values(form.errors)[0]}
                                </p>
                            )}
                        </form>
                    </LedgerCard>
                )}
                {canManage && (
                    <LedgerCard
                        title="Batas stok minimum"
                        description="Produk akan ditandai saat saldo menyentuh batas ini."
                    >
                        <form
                            onSubmit={submitMinimum}
                            className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
                        >
                            <label className="space-y-1 text-sm font-semibold text-stone-700">
                                Produk
                                <select
                                    className={fieldClass}
                                    value={minimum.data.product_id}
                                    onChange={(event) =>
                                        minimum.setData(
                                            'product_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    {products.map((product) => (
                                        <option
                                            key={product.public_id}
                                            value={product.public_id}
                                        >
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-1 text-sm font-semibold text-stone-700">
                                Kuantitas minimum
                                <input
                                    className={fieldClass}
                                    type="number"
                                    min="0"
                                    step="0.000001"
                                    value={minimum.data.minimum_quantity}
                                    onChange={(event) =>
                                        minimum.setData(
                                            'minimum_quantity',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </label>
                            <div className="flex items-end">
                                <button
                                    className={buttonClass}
                                    disabled={minimum.processing}
                                >
                                    Simpan batas
                                </button>
                            </div>
                            {Object.keys(minimum.errors).length > 0 && (
                                <p className="text-sm font-medium text-red-700 md:col-span-full">
                                    {Object.values(minimum.errors)[0]}
                                </p>
                            )}
                        </form>
                    </LedgerCard>
                )}

                <LedgerCard
                    title="Posisi inventory"
                    description={`${products.length} produk tercatat pada toko aktif.`}
                >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {products.map((product) => {
                            const low =
                                Number(product.quantity) <=
                                    Number(product.minimum_quantity) &&
                                Number(product.minimum_quantity) > 0;

                            return (
                                <article
                                    key={product.public_id}
                                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold text-stone-900">
                                                {product.name}
                                            </h3>
                                            <p className="text-xs text-stone-500">
                                                {product.sku || 'Tanpa SKU'}
                                            </p>
                                        </div>
                                        {low && (
                                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                                                Stok minimum
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-5 font-serif text-3xl text-teal-800">
                                        {quantity(product.quantity)}{' '}
                                        <span className="text-base">
                                            {product.unit}
                                        </span>
                                    </p>
                                    <div className="mt-3 flex justify-between text-xs text-stone-500">
                                        <span>
                                            Avg {money(product.average_cost)}
                                        </span>
                                        <span>
                                            Nilai{' '}
                                            {money(product.inventory_value)}
                                        </span>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </LedgerCard>

                <LedgerCard title="Movement terbaru">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-left text-sm">
                            <thead className="border-b border-stone-200 text-xs tracking-wider text-stone-500 uppercase">
                                <tr>
                                    <th className="pb-3">Produk</th>
                                    <th className="pb-3">Alasan</th>
                                    <th className="pb-3">Perubahan</th>
                                    <th className="pb-3">Biaya</th>
                                    <th className="pb-3">Saldo</th>
                                    <th className="pb-3">Waktu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.data.map((movement) => (
                                    <tr
                                        key={movement.public_id}
                                        className="border-b border-stone-100"
                                    >
                                        <td className="py-3 font-semibold">
                                            {movement.product_name}
                                        </td>
                                        <td>
                                            {reasons[movement.reason] ??
                                                movement.reason}
                                        </td>
                                        <td
                                            className={
                                                Number(
                                                    movement.quantity_change,
                                                ) >= 0
                                                    ? 'text-teal-700'
                                                    : 'text-red-700'
                                            }
                                        >
                                            {quantity(movement.quantity_change)}
                                        </td>
                                        <td>{money(movement.unit_cost)}</td>
                                        <td>
                                            {quantity(movement.quantity_after)}
                                        </td>
                                        <td>
                                            {ledgerDateTime(
                                                movement.occurred_at,
                                                timezone,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {movements.data.length === 0 && (
                            <p className="py-8 text-center text-sm text-stone-500">
                                Belum ada pergerakan stok.
                            </p>
                        )}
                        <div className="mt-5">
                            <Pagination links={movements.links} />
                        </div>
                    </div>
                </LedgerCard>
            </OperationsShell>
        </>
    );
}
