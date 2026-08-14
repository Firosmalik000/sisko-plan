import { Head, Link, useForm } from '@inertiajs/react';
import {
    Barcode,
    Minus,
    Plus,
    ReceiptText,
    Search,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
    currentDateTime,
    money,
    postingToken,
    quantity,
} from '@/components/operations-shell';

type Product = {
    product_id: string;
    product_name: string;
    sku: string | null;
    barcode: string | null;
    unit_id: string;
    unit_name: string;
    unit_symbol: string;
    conversion_factor: string;
    selling_price: string;
    stock_quantity: string;
    is_base_unit: boolean | number;
};
type Account = { public_id: string; name: string; type: string };
type CartItem = Product & { quantity: string; discount_amount: string };
type SaleForm = {
    account_id: string;
    transaction_discount_amount: string;
    paid_amount: string;
    occurred_at: string;
    notes: string;
    idempotency_key: string;
    items: CartItem[];
};

const fieldClass =
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15';

export default function PosPage({
    products,
    accounts,
    timezone,
}: {
    products: Product[];
    accounts: Account[];
    timezone: string;
}) {
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const sale = useForm<SaleForm>({
        account_id: accounts[0]?.public_id ?? '',
        transaction_discount_amount: '0',
        paid_amount: '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
        items: [],
    });
    const visibleProducts = products.filter((product) => {
        const term = search.toLocaleLowerCase('id-ID');

        return (
            !term ||
            product.product_name.toLocaleLowerCase('id-ID').includes(term) ||
            product.sku?.toLocaleLowerCase('id-ID').includes(term) ||
            product.barcode?.includes(term)
        );
    });
    const available = (product: Product) =>
        Number(product.stock_quantity) / Number(product.conversion_factor);
    const addProduct = (product: Product) => {
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

        setSearch('');
        searchRef.current?.focus();
    };
    const updateItem = (index: number, changes: Partial<CartItem>) =>
        sale.setData(
            'items',
            sale.data.items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...changes } : item,
            ),
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
    const change = Math.max(0, Number(sale.data.paid_amount || 0) - total);
    const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();
        const exactMatches = products.filter(
            (product) =>
                product.barcode === search ||
                product.sku?.toLocaleLowerCase('id-ID') ===
                    search.toLocaleLowerCase('id-ID'),
        );
        const exact =
            exactMatches.find((product) => Boolean(product.is_base_unit)) ??
            exactMatches[0];

        if (exact) {
            addProduct(exact);
        } else if (visibleProducts.length === 1) {
            addProduct(visibleProducts[0]);
        }
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        sale.post('/pos/sales', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Kasir POS" />
            <div className="min-h-full bg-[radial-gradient(circle_at_8%_8%,rgba(251,146,60,0.18),transparent_30%),linear-gradient(145deg,#fffaf4,#f4f7f6_52%,#e8f2ef)] p-3 md:p-6">
                <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.75fr)]">
                    <section className="space-y-4">
                        <header className="rounded-[2rem] bg-[#173c39] p-6 text-white shadow-xl shadow-teal-950/15 md:p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold tracking-[0.24em] text-orange-300 uppercase">
                                        Kasir cepat
                                    </p>
                                    <h1 className="mt-2 font-serif text-3xl md:text-5xl">
                                        Cari. Scan. Selesai.
                                    </h1>
                                    <p className="mt-2 max-w-xl text-sm text-teal-50/70">
                                        Harga dan stok diverifikasi ulang server
                                        saat checkout.
                                    </p>
                                </div>
                                <Link
                                    href="/sales"
                                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
                                >
                                    <ReceiptText className="size-4" />
                                    Riwayat & retur
                                </Link>
                            </div>
                            <div className="relative mt-6">
                                <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    ref={searchRef}
                                    autoFocus
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    onKeyDown={onSearchKeyDown}
                                    placeholder="Scan barcode atau cari nama / SKU..."
                                    className="h-14 w-full rounded-2xl bg-white pr-4 pl-12 text-base text-slate-950 ring-orange-300 outline-none focus:ring-4"
                                />
                                <Barcode className="absolute top-1/2 right-4 size-5 -translate-y-1/2 text-slate-400" />
                            </div>
                        </header>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {visibleProducts.map((product) => {
                                const stock = available(product);

                                return (
                                    <button
                                        type="button"
                                        key={`${product.product_id}:${product.unit_id}`}
                                        onClick={() => addProduct(product)}
                                        disabled={stock <= 0}
                                        className="group rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {product.product_name}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {product.sku || 'Tanpa SKU'}{' '}
                                                    · {product.unit_name}
                                                </p>
                                            </div>
                                            <Plus className="size-5 text-orange-600 transition group-hover:rotate-90" />
                                        </div>
                                        <p className="mt-5 text-lg font-black text-[#173c39]">
                                            {money(product.selling_price)}
                                        </p>
                                        <p
                                            className={`mt-1 text-xs font-semibold ${stock > 0 ? 'text-teal-700' : 'text-red-600'}`}
                                        >
                                            {stock > 0
                                                ? `Tersedia ${quantity(stock)} ${product.unit_symbol}`
                                                : 'Stok habis'}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                        {visibleProducts.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                                Produk tidak ditemukan. Coba nama, SKU, atau
                                barcode lain.
                            </div>
                        )}
                    </section>

                    <form
                        onSubmit={submit}
                        className="h-fit rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/8 xl:sticky xl:top-5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="grid size-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
                                    <ShoppingCart className="size-5" />
                                </span>
                                <div>
                                    <h2 className="font-serif text-2xl text-slate-900">
                                        Keranjang
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        {sale.data.items.length} jenis barang
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => sale.setData('items', [])}
                                className="text-xs font-bold text-red-600"
                            >
                                Kosongkan
                            </button>
                        </div>
                        <div className="mt-5 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                            {sale.data.items.map((item, index) => (
                                <article
                                    key={`${item.product_id}:${item.unit_id}`}
                                    className="rounded-2xl bg-slate-50 p-3"
                                >
                                    <div className="flex justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">
                                                {item.product_name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {item.unit_symbol} ·{' '}
                                                {money(item.selling_price)}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                sale.setData(
                                                    'items',
                                                    sale.data.items.filter(
                                                        (_, itemIndex) =>
                                                            itemIndex !== index,
                                                    ),
                                                )
                                            }
                                            aria-label="Hapus item"
                                            className="text-red-600"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-[auto_1fr] gap-3">
                                        <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                                            <button
                                                type="button"
                                                className="grid size-10 place-items-center"
                                                onClick={() =>
                                                    updateItem(index, {
                                                        quantity: String(
                                                            Math.max(
                                                                0.000001,
                                                                Number(
                                                                    item.quantity,
                                                                ) - 1,
                                                            ),
                                                        ),
                                                    })
                                                }
                                            >
                                                <Minus className="size-4" />
                                            </button>
                                            <input
                                                aria-label={`Jumlah ${item.product_name}`}
                                                className="h-10 w-16 border-x border-slate-200 text-center text-sm"
                                                type="number"
                                                min="0.000001"
                                                max={available(item)}
                                                step="0.000001"
                                                value={item.quantity}
                                                onChange={(event) =>
                                                    updateItem(index, {
                                                        quantity:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                            <button
                                                type="button"
                                                className="grid size-10 place-items-center"
                                                onClick={() =>
                                                    updateItem(index, {
                                                        quantity: String(
                                                            Math.min(
                                                                available(item),
                                                                Number(
                                                                    item.quantity,
                                                                ) + 1,
                                                            ),
                                                        ),
                                                    })
                                                }
                                            >
                                                <Plus className="size-4" />
                                            </button>
                                        </div>
                                        <input
                                            aria-label={`Diskon ${item.product_name}`}
                                            className={fieldClass}
                                            type="number"
                                            min="0"
                                            step="0.0001"
                                            placeholder="Diskon item"
                                            value={item.discount_amount}
                                            onChange={(event) =>
                                                updateItem(index, {
                                                    discount_amount:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </article>
                            ))}
                            {sale.data.items.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
                                    Scan atau pilih produk untuk mulai.
                                </p>
                            )}
                        </div>
                        <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Subtotal</span>
                                <span>{money(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Diskon item</span>
                                <span>-{money(itemDiscount)}</span>
                            </div>
                            <label className="grid grid-cols-[1fr_150px] items-center gap-3 text-sm font-semibold text-slate-700">
                                <span>Diskon transaksi</span>
                                <input
                                    className={fieldClass}
                                    type="number"
                                    min="0"
                                    step="0.0001"
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
                            <div className="flex items-end justify-between rounded-2xl bg-[#173c39] p-4 text-white">
                                <span className="text-sm text-teal-50/70">
                                    Total
                                </span>
                                <strong className="text-2xl text-orange-300">
                                    {money(total)}
                                </strong>
                            </div>
                            <label className="block text-sm font-semibold text-slate-700">
                                Akun pembayaran
                                <select
                                    className={`${fieldClass} mt-1`}
                                    value={sale.data.account_id}
                                    onChange={(event) =>
                                        sale.setData(
                                            'account_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    {accounts.map((account) => (
                                        <option
                                            key={account.public_id}
                                            value={account.public_id}
                                        >
                                            {account.name} · {account.type}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm font-semibold text-slate-700">
                                Dibayar
                                <input
                                    className={`${fieldClass} mt-1 text-lg font-bold`}
                                    type="number"
                                    min="0"
                                    step="0.0001"
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
                            <div className="flex justify-between text-sm font-bold text-teal-800">
                                <span>Kembalian</span>
                                <span>{money(change)}</span>
                            </div>
                            <input
                                className={fieldClass}
                                placeholder="Catatan opsional"
                                value={sale.data.notes}
                                onChange={(event) =>
                                    sale.setData('notes', event.target.value)
                                }
                                maxLength={500}
                            />
                            {Object.keys(sale.errors).length > 0 && (
                                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                                    Checkout gagal. Periksa stok, diskon, akun,
                                    dan nominal pembayaran.
                                </p>
                            )}
                            <button
                                disabled={
                                    sale.processing ||
                                    sale.data.items.length === 0 ||
                                    accounts.length === 0
                                }
                                className="h-14 w-full rounded-2xl bg-orange-600 text-base font-black text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {sale.processing
                                    ? 'Memproses...'
                                    : `Bayar ${money(total)}`}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
