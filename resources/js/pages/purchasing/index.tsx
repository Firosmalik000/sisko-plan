import { Head, useForm } from '@inertiajs/react';
import { CircleDollarSign, PackagePlus, Plus, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import {
    buttonClass,
    currentDateTime,
    fieldClass,
    ledgerDateTime,
    money,
    postingToken,
    quantity,
} from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';

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

const cardClass =
    'rounded-[1.35rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5';
const labelClass = 'space-y-1 text-sm font-semibold text-stone-700';
const defaultItem = (product?: ProductOption) => ({
    product_id: product?.product_id ?? '',
    unit_id: product?.unit_id ?? '',
    quantity: '1',
    unit_price: product?.purchase_price ?? '0',
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
    const unpaidPurchases = purchases.data.filter(
        (entry) => Number(entry.outstanding_amount) > 0,
    );
    const payment = useForm({
        purchase_id: unpaidPurchases[0]?.public_id ?? '',
        account_id: accounts[0]?.public_id ?? '',
        amount: unpaidPurchases[0]?.outstanding_amount ?? '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const subtotal = purchase.data.items.reduce(
        (total, item) =>
            total + Number(item.quantity) * Number(item.unit_price),
        0,
    );
    const grandTotal =
        subtotal -
        Number(purchase.data.discount_amount || 0) +
        Number(purchase.data.additional_cost || 0);

    const chooseProduct = (index: number, composite: string) => {
        const [productId, unitId] = composite.split(':');
        const selected = products.find(
            (option) =>
                option.product_id === productId && option.unit_id === unitId,
        );
        purchase.setData(
            'items',
            purchase.data.items.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                          ...item,
                          product_id: productId,
                          unit_id: unitId,
                          unit_price:
                              selected?.purchase_price ?? item.unit_price,
                      }
                    : item,
            ),
        );
    };
    const updateItem = (
        index: number,
        field: 'quantity' | 'unit_price',
        value: string,
    ) => {
        purchase.setData(
            'items',
            purchase.data.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item,
            ),
        );
    };
    const submitPurchase = (event: FormEvent) => {
        event.preventDefault();
        purchase.post('/purchasing', {
            preserveScroll: true,
            onSuccess: () => {
                purchase.reset(
                    'supplier_invoice_number',
                    'notes',
                    'discount_amount',
                    'additional_cost',
                    'paid_amount',
                );
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
            <div className="min-h-full bg-[linear-gradient(180deg,#f8faf6_0%,#f2f5f0_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-4">
                    <header className="flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] border border-[#173c35]/8 bg-white px-4 py-4 shadow-sm sm:px-5">
                        <h1 className="text-2xl font-black tracking-[-0.04em] text-[#173c35]">
                            Pembelian
                        </h1>
                        <div className="flex gap-2">
                            <div className="rounded-xl bg-[#edf4f0] px-3 py-2">
                                <p className="text-[10px] font-bold text-[#6d817a] uppercase">
                                    Total utang supplier
                                </p>
                                <p className="mt-0.5 text-sm font-black text-[#173c35]">
                                    {money(totalPayable)}
                                </p>
                            </div>
                            <div className="rounded-xl bg-[#edf4f0] px-3 py-2">
                                <p className="text-[10px] font-bold text-[#6d817a] uppercase">
                                    Dokumen pembelian
                                </p>
                                <p className="mt-0.5 text-sm font-black text-[#173c35]">
                                    {purchases.total}
                                </p>
                            </div>
                        </div>
                    </header>

                    {canManage && (
                        <form onSubmit={submitPurchase} className={cardClass}>
                            <div className="flex items-start gap-3">
                                <PackagePlus className="mt-1 size-6 text-teal-700" />
                                <div>
                                    <h2 className="font-serif text-2xl text-stone-900">
                                        Posting pembelian
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                <label className={labelClass}>
                                    Supplier
                                    <select
                                        className={fieldClass}
                                        value={purchase.data.supplier_id}
                                        onChange={(event) =>
                                            purchase.setData(
                                                'supplier_id',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    >
                                        {activeSuppliers.map((supplier) => (
                                            <option
                                                key={supplier.public_id}
                                                value={supplier.public_id}
                                            >
                                                {supplier.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className={labelClass}>
                                    Nomor invoice supplier
                                    <input
                                        className={fieldClass}
                                        value={
                                            purchase.data
                                                .supplier_invoice_number
                                        }
                                        onChange={(event) =>
                                            purchase.setData(
                                                'supplier_invoice_number',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={100}
                                    />
                                </label>
                                <label className={labelClass}>
                                    Waktu transaksi
                                    <input
                                        className={fieldClass}
                                        type="datetime-local"
                                        value={purchase.data.occurred_at}
                                        onChange={(event) =>
                                            purchase.setData(
                                                'occurred_at',
                                                event.target.value,
                                            )
                                        }
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
                                                onChange={(event) =>
                                                    chooseProduct(
                                                        index,
                                                        event.target.value,
                                                    )
                                                }
                                                required
                                            >
                                                {products.map((option) => (
                                                    <option
                                                        key={`${option.product_id}:${option.unit_id}`}
                                                        value={`${option.product_id}:${option.unit_id}`}
                                                    >
                                                        {option.product_name} ·{' '}
                                                        {option.unit_symbol} (x
                                                        {quantity(
                                                            option.conversion_factor,
                                                        )}
                                                        )
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
                                                onChange={(event) =>
                                                    updateItem(
                                                        index,
                                                        'quantity',
                                                        event.target.value,
                                                    )
                                                }
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
                                                onChange={(event) =>
                                                    updateItem(
                                                        index,
                                                        'unit_price',
                                                        event.target.value,
                                                    )
                                                }
                                                required
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            aria-label="Hapus item"
                                            className="mt-6 grid size-11 place-items-center rounded-xl border border-red-200 text-red-700 disabled:opacity-30"
                                            disabled={
                                                purchase.data.items.length === 1
                                            }
                                            onClick={() =>
                                                purchase.setData(
                                                    'items',
                                                    purchase.data.items.filter(
                                                        (_, itemIndex) =>
                                                            itemIndex !== index,
                                                    ),
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
                                        purchase.setData('items', [
                                            ...purchase.data.items,
                                            defaultItem(products[0]),
                                        ])
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
                                        onChange={(event) =>
                                            purchase.setData(
                                                'discount_amount',
                                                event.target.value,
                                            )
                                        }
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
                                        onChange={(event) =>
                                            purchase.setData(
                                                'additional_cost',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </label>
                                <div className="rounded-2xl bg-[#12332f] px-4 py-3 text-white">
                                    <p className="text-xs text-teal-100/70">
                                        Estimasi total
                                    </p>
                                    <p className="mt-1 text-xl font-bold text-amber-300">
                                        {money(grandTotal)}
                                    </p>
                                </div>
                                <label className={labelClass}>
                                    Bayar sekarang
                                    <input
                                        className={fieldClass}
                                        type="number"
                                        min="0"
                                        step="0.0001"
                                        value={purchase.data.paid_amount}
                                        onChange={(event) =>
                                            purchase.setData(
                                                'paid_amount',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </label>
                                <label className={labelClass}>
                                    Akun pembayaran
                                    <select
                                        className={fieldClass}
                                        value={purchase.data.account_id}
                                        onChange={(event) =>
                                            purchase.setData(
                                                'account_id',
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            Number(purchase.data.paid_amount) <=
                                            0
                                        }
                                    >
                                        {accounts.map((account) => (
                                            <option
                                                key={account.public_id}
                                                value={account.public_id}
                                            >
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
                                        onChange={(event) =>
                                            purchase.setData(
                                                'notes',
                                                event.target.value,
                                            )
                                        }
                                        maxLength={500}
                                    />
                                </label>
                            </div>
                            {Object.keys(purchase.errors).length > 0 && (
                                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                                    Periksa kembali input pembelian. Beberapa
                                    nilai belum valid.
                                </p>
                            )}
                            <button
                                className={`${buttonClass} mt-5`}
                                disabled={
                                    purchase.processing ||
                                    products.length === 0 ||
                                    activeSuppliers.length === 0
                                }
                            >
                                Posting pembelian
                            </button>
                        </form>
                    )}

                    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                        <section className={cardClass}>
                            <h2 className="font-serif text-2xl text-stone-900">
                                Posisi utang supplier
                            </h2>
                            <div className="mt-5 divide-y divide-stone-100">
                                {suppliers.map((supplier) => (
                                    <div
                                        key={supplier.public_id}
                                        className="flex items-center justify-between gap-4 py-3"
                                    >
                                        <div>
                                            <p className="font-semibold text-stone-800">
                                                {supplier.name}
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                {supplier.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </p>
                                        </div>
                                        <p
                                            className={
                                                Number(
                                                    supplier.payable_balance,
                                                ) > 0
                                                    ? 'font-bold text-amber-700'
                                                    : 'font-semibold text-stone-400'
                                            }
                                        >
                                            {money(supplier.payable_balance)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                        {canManage && (
                            <form
                                onSubmit={submitPayment}
                                className={cardClass}
                            >
                                <div className="flex items-start gap-3">
                                    <CircleDollarSign className="mt-1 size-6 text-teal-700" />
                                    <div>
                                        <h2 className="font-serif text-2xl text-stone-900">
                                            Bayar utang pembelian
                                        </h2>
                                        <p className="text-sm text-stone-500">
                                            Pembayaran tidak dapat melebihi sisa
                                            dokumen dan harus tersedia pada akun
                                            kas.
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <label
                                        className={`${labelClass} md:col-span-2`}
                                    >
                                        Dokumen
                                        <select
                                            className={fieldClass}
                                            value={payment.data.purchase_id}
                                            onChange={(event) => {
                                                const selected =
                                                    unpaidPurchases.find(
                                                        (entry) =>
                                                            entry.public_id ===
                                                            event.target.value,
                                                    );
                                                payment.setData((data) => ({
                                                    ...data,
                                                    purchase_id:
                                                        event.target.value,
                                                    amount:
                                                        selected?.outstanding_amount ??
                                                        '',
                                                }));
                                            }}
                                            required
                                        >
                                            <option value="">
                                                Pilih dokumen
                                            </option>
                                            {unpaidPurchases.map((entry) => (
                                                <option
                                                    key={entry.public_id}
                                                    value={entry.public_id}
                                                >
                                                    {entry.document_number} ·{' '}
                                                    {entry.supplier_name} · sisa{' '}
                                                    {money(
                                                        entry.outstanding_amount,
                                                    )}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className={labelClass}>
                                        Akun
                                        <select
                                            className={fieldClass}
                                            value={payment.data.account_id}
                                            onChange={(event) =>
                                                payment.setData(
                                                    'account_id',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        >
                                            {accounts.map((account) => (
                                                <option
                                                    key={account.public_id}
                                                    value={account.public_id}
                                                >
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
                                            onChange={(event) =>
                                                payment.setData(
                                                    'amount',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </label>
                                    <label className={labelClass}>
                                        Waktu
                                        <input
                                            className={fieldClass}
                                            type="datetime-local"
                                            value={payment.data.occurred_at}
                                            onChange={(event) =>
                                                payment.setData(
                                                    'occurred_at',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </label>
                                    <label className={labelClass}>
                                        Catatan
                                        <input
                                            className={fieldClass}
                                            value={payment.data.notes}
                                            onChange={(event) =>
                                                payment.setData(
                                                    'notes',
                                                    event.target.value,
                                                )
                                            }
                                            maxLength={500}
                                        />
                                    </label>
                                </div>
                                {Object.keys(payment.errors).length > 0 && (
                                    <p className="mt-4 text-sm text-red-700">
                                        Pembayaran belum valid. Periksa nominal,
                                        akun, dan waktu.
                                    </p>
                                )}
                                <button
                                    className={`${buttonClass} mt-5`}
                                    disabled={
                                        payment.processing ||
                                        !payment.data.purchase_id
                                    }
                                >
                                    Posting pembayaran
                                </button>
                            </form>
                        )}
                    </div>

                    <section className={cardClass}>
                        <h2 className="font-serif text-2xl text-stone-900">
                            Riwayat pembelian
                        </h2>
                        <div className="mt-5 space-y-4">
                            {purchases.data.map((entry) => (
                                <article
                                    key={entry.public_id}
                                    className="rounded-2xl border border-stone-200 p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="font-bold text-stone-900">
                                                {entry.document_number} ·{' '}
                                                {entry.supplier_name}
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                {ledgerDateTime(
                                                    entry.occurred_at,
                                                    timezone,
                                                )}
                                                {entry.supplier_invoice_number
                                                    ? ` · Invoice ${entry.supplier_invoice_number}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-stone-900">
                                                {money(entry.total_amount)}
                                            </p>
                                            <p
                                                className={`text-xs font-semibold ${Number(entry.outstanding_amount) > 0 ? 'text-amber-700' : 'text-teal-700'}`}
                                            >
                                                {Number(
                                                    entry.outstanding_amount,
                                                ) > 0
                                                    ? `Sisa ${money(entry.outstanding_amount)}`
                                                    : 'Lunas'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                                        {entry.items.map((item, index) => (
                                            <div
                                                key={`${entry.public_id}-${index}`}
                                                className="rounded-xl bg-stone-50 px-3 py-2 text-sm"
                                            >
                                                <span className="font-semibold">
                                                    {item.product_name}
                                                </span>
                                                <span className="text-stone-500">
                                                    {' '}
                                                    · {quantity(
                                                        item.quantity,
                                                    )}{' '}
                                                    {item.unit_symbol} · landed{' '}
                                                    {money(item.landed_total)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                            ))}
                        </div>
                        {purchases.data.length === 0 && (
                            <p className="mt-5 text-sm text-stone-500">
                                Belum ada pembelian.
                            </p>
                        )}
                        <div className="mt-5">
                            <Pagination links={purchases.links} />
                        </div>
                    </section>

                    <section className={cardClass}>
                        <h2 className="font-serif text-2xl text-stone-900">
                            Buku utang supplier
                        </h2>
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="border-b border-stone-200 text-xs tracking-wider text-stone-500 uppercase">
                                    <tr>
                                        <th className="py-3">Waktu</th>
                                        <th>Supplier</th>
                                        <th>Jenis</th>
                                        <th className="text-right">Nilai</th>
                                        <th className="text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payableTransactions.data.map((entry) => (
                                        <tr
                                            key={entry.public_id}
                                            className="border-b border-stone-100"
                                        >
                                            <td className="py-3 text-stone-500">
                                                {ledgerDateTime(
                                                    entry.occurred_at,
                                                    timezone,
                                                )}
                                            </td>
                                            <td className="font-semibold">
                                                {entry.supplier_name}
                                            </td>
                                            <td>
                                                {entry.reason === 'purchase'
                                                    ? 'Pembelian'
                                                    : 'Pembayaran'}
                                            </td>
                                            <td
                                                className={`text-right font-semibold ${entry.direction === 'increase' ? 'text-amber-700' : 'text-teal-700'}`}
                                            >
                                                {entry.direction === 'increase'
                                                    ? '+'
                                                    : '-'}
                                                {money(entry.amount)}
                                            </td>
                                            <td className="text-right font-bold">
                                                {money(entry.balance_after)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-5">
                            <Pagination links={payableTransactions.links} />
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
