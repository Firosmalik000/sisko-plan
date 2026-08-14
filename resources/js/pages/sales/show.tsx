import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Printer, RotateCcw } from 'lucide-react';
import type { FormEvent } from 'react';
import {
    currentDateTime,
    ledgerDateTime,
    money,
    postingToken,
    quantity,
} from '@/components/operations-shell';

type Sale = {
    public_id: string;
    document_number: string;
    subtotal: string;
    item_discount_amount: string;
    transaction_discount_amount: string;
    total_amount: string;
    paid_amount: string;
    change_amount: string;
    occurred_at: string;
    notes: string | null;
    cashier_name: string;
};
type Item = {
    public_id: string;
    product_name: string;
    sku: string | null;
    unit_symbol: string;
    quantity: string;
    unit_price: string;
    gross_subtotal: string;
    item_discount_amount: string;
    allocated_transaction_discount: string;
    net_total: string;
    returned_quantity: string;
    returnable_quantity: string;
    cogs_amount?: string;
    gross_profit?: string;
};
type Payment = {
    amount: string;
    tendered_amount: string;
    change_amount: string;
    account_name: string;
};
type SaleReturn = {
    public_id: string;
    document_number: string;
    refund_amount: string;
    cogs_reversed: string;
    gross_profit_reversed: string;
    occurred_at: string;
    notes: string | null;
    account_name: string;
};
type Account = { public_id: string; name: string };
type ReturnForm = {
    account_id: string;
    occurred_at: string;
    notes: string;
    idempotency_key: string;
    items: { sale_item_id: string; quantity: string }[];
};
const fieldClass =
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15';

export default function SaleShow({
    sale,
    items,
    payment,
    returns,
    accounts,
    canReturn,
    canViewProfit,
    timezone,
}: {
    sale: Sale;
    items: Item[];
    payment: Payment;
    returns: SaleReturn[];
    accounts: Account[];
    canReturn: boolean;
    canViewProfit: boolean;
    timezone: string;
}) {
    const returnableItems = items.filter(
        (item) => Number(item.returnable_quantity) > 0,
    );
    const returnForm = useForm<ReturnForm>({
        account_id: accounts[0]?.public_id ?? '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
        items: returnableItems.map((item) => ({
            sale_item_id: item.public_id,
            quantity: '0',
        })),
    });
    const estimatedRefund = returnForm.data.items.reduce((sum, input) => {
        const item = items.find(
            (candidate) => candidate.public_id === input.sale_item_id,
        );

        return (
            sum +
            (item
                ? (Number(item.net_total) * Number(input.quantity || 0)) /
                  Number(item.quantity)
                : 0)
        );
    }, 0);
    const submitReturn = (event: FormEvent) => {
        event.preventDefault();
        returnForm.transform((data) => ({
            ...data,
            items: data.items.filter((item) => Number(item.quantity) > 0),
        }));
        returnForm.post(`/sales/${sale.public_id}/returns`, {
            preserveScroll: true,
            preserveState: false,
        });
    };
    const cogs = items.reduce(
        (sum, item) => sum + Number(item.cogs_amount ?? 0),
        0,
    );
    const profit = items.reduce(
        (sum, item) => sum + Number(item.gross_profit ?? 0),
        0,
    );

    return (
        <>
            <Head title={`Struk ${sale.document_number}`} />
            <style>{`@media print { body * { visibility: hidden !important; } .print-receipt, .print-receipt * { visibility: visible !important; } .print-receipt { position: absolute; inset: 0; width: 100%; box-shadow: none !important; border: 0 !important; } }`}</style>
            <div className="min-h-full bg-[linear-gradient(145deg,#edf5f2,#fff8ef)] p-4 md:p-8">
                <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                            <Link
                                href="/sales"
                                className="inline-flex items-center gap-2 text-sm font-bold text-slate-700"
                            >
                                <ArrowLeft className="size-4" />
                                Riwayat penjualan
                            </Link>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 rounded-full bg-[#173c39] px-5 py-2.5 text-sm font-bold text-white"
                            >
                                <Printer className="size-4" />
                                Cetak struk
                            </button>
                        </div>
                        <section className="print-receipt rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/8 md:p-9">
                            <header className="border-b-2 border-dashed border-slate-200 pb-6 text-center">
                                <p className="text-xs font-bold tracking-[0.24em] text-orange-600 uppercase">
                                    Bukti penjualan
                                </p>
                                <h1 className="mt-2 font-serif text-3xl text-slate-900">
                                    {sale.document_number}
                                </h1>
                                <p className="mt-2 text-sm text-slate-500">
                                    {ledgerDateTime(sale.occurred_at, timezone)}{' '}
                                    · Kasir {sale.cashier_name}
                                </p>
                            </header>
                            <div className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <div
                                        key={item.public_id}
                                        className="grid grid-cols-[1fr_auto] gap-3 py-4"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900">
                                                {item.product_name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {quantity(item.quantity)}{' '}
                                                {item.unit_symbol} ×{' '}
                                                {money(item.unit_price)}
                                                {Number(
                                                    item.returned_quantity,
                                                ) > 0
                                                    ? ` · diretur ${quantity(item.returned_quantity)}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <p className="font-semibold">
                                            {money(item.net_total)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 border-t-2 border-dashed border-slate-200 pt-5 text-sm">
                                <div className="flex justify-between text-slate-500">
                                    <span>Subtotal</span>
                                    <span>{money(sale.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Diskon item</span>
                                    <span>
                                        -{money(sale.item_discount_amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Diskon transaksi</span>
                                    <span>
                                        -
                                        {money(
                                            sale.transaction_discount_amount,
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2 text-xl font-black text-[#173c39]">
                                    <span>Total</span>
                                    <span>{money(sale.total_amount)}</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>
                                        Dibayar via {payment.account_name}
                                    </span>
                                    <span>
                                        {money(payment.tendered_amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between font-bold text-orange-700">
                                    <span>Kembalian</span>
                                    <span>{money(payment.change_amount)}</span>
                                </div>
                            </div>
                            {sale.notes && (
                                <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                                    Catatan: {sale.notes}
                                </p>
                            )}
                            <p className="mt-7 text-center text-xs text-slate-400">
                                Terima kasih. Simpan struk ini untuk referensi
                                retur.
                            </p>
                        </section>
                        {canViewProfit && (
                            <section className="grid gap-3 sm:grid-cols-2 print:hidden">
                                <div className="rounded-2xl bg-[#173c39] p-5 text-white">
                                    <p className="text-xs text-teal-50/60">
                                        HPP penjualan
                                    </p>
                                    <p className="mt-1 text-2xl font-black">
                                        {money(cogs)}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-orange-100 p-5 text-orange-950">
                                    <p className="text-xs text-orange-800/60">
                                        Laba kotor
                                    </p>
                                    <p className="mt-1 text-2xl font-black">
                                        {money(profit)}
                                    </p>
                                </div>
                            </section>
                        )}
                        {returns.length > 0 && (
                            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 print:hidden">
                                <h2 className="font-serif text-2xl">
                                    Riwayat retur
                                </h2>
                                <div className="mt-4 divide-y divide-slate-100">
                                    {returns.map((entry) => (
                                        <div
                                            key={entry.public_id}
                                            className="flex justify-between gap-4 py-3"
                                        >
                                            <div>
                                                <p className="font-bold">
                                                    {entry.document_number}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {ledgerDateTime(
                                                        entry.occurred_at,
                                                        timezone,
                                                    )}{' '}
                                                    · {entry.account_name}
                                                </p>
                                            </div>
                                            <p className="font-bold text-red-600">
                                                -{money(entry.refund_amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                    {canReturn && (
                        <form
                            onSubmit={submitReturn}
                            className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-5 print:hidden"
                        >
                            <div className="flex items-start gap-3">
                                <span className="grid size-11 place-items-center rounded-2xl bg-red-50 text-red-700">
                                    <RotateCcw className="size-5" />
                                </span>
                                <div>
                                    <h2 className="font-serif text-2xl">
                                        Retur penjualan
                                    </h2>
                                    <p className="text-xs leading-5 text-slate-500">
                                        Refund dan pemulihan stok diposting
                                        bersamaan.
                                    </p>
                                </div>
                            </div>
                            {returnableItems.length > 0 ? (
                                <>
                                    <div className="mt-5 space-y-3">
                                        {returnableItems.map((item, index) => (
                                            <label
                                                key={item.public_id}
                                                className="block rounded-2xl bg-slate-50 p-3 text-sm font-semibold"
                                            >
                                                <span className="flex justify-between gap-3">
                                                    <span>
                                                        {item.product_name}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        Maks.{' '}
                                                        {quantity(
                                                            item.returnable_quantity,
                                                        )}{' '}
                                                        {item.unit_symbol}
                                                    </span>
                                                </span>
                                                <input
                                                    className={`${fieldClass} mt-2`}
                                                    type="number"
                                                    min="0"
                                                    max={
                                                        item.returnable_quantity
                                                    }
                                                    step="0.000001"
                                                    value={
                                                        returnForm.data.items[
                                                            index
                                                        ]?.quantity ?? '0'
                                                    }
                                                    onChange={(event) =>
                                                        returnForm.setData(
                                                            'items',
                                                            returnForm.data.items.map(
                                                                (
                                                                    input,
                                                                    itemIndex,
                                                                ) =>
                                                                    itemIndex ===
                                                                    index
                                                                        ? {
                                                                              ...input,
                                                                              quantity:
                                                                                  event
                                                                                      .target
                                                                                      .value,
                                                                          }
                                                                        : input,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className="mt-3 text-xs font-bold text-orange-700"
                                        onClick={() =>
                                            returnForm.setData(
                                                'items',
                                                returnableItems.map((item) => ({
                                                    sale_item_id:
                                                        item.public_id,
                                                    quantity:
                                                        item.returnable_quantity,
                                                })),
                                            )
                                        }
                                    >
                                        Pilih semua sisa untuk retur penuh
                                    </button>
                                    <div className="mt-5 grid gap-3">
                                        <label className="text-sm font-semibold">
                                            Akun refund
                                            <select
                                                className={`${fieldClass} mt-1`}
                                                value={
                                                    returnForm.data.account_id
                                                }
                                                onChange={(event) =>
                                                    returnForm.setData(
                                                        'account_id',
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                {accounts.map((account) => (
                                                    <option
                                                        key={account.public_id}
                                                        value={
                                                            account.public_id
                                                        }
                                                    >
                                                        {account.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="text-sm font-semibold">
                                            Waktu retur
                                            <input
                                                className={`${fieldClass} mt-1`}
                                                type="datetime-local"
                                                value={
                                                    returnForm.data.occurred_at
                                                }
                                                onChange={(event) =>
                                                    returnForm.setData(
                                                        'occurred_at',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <input
                                            className={fieldClass}
                                            placeholder="Alasan / catatan retur"
                                            value={returnForm.data.notes}
                                            onChange={(event) =>
                                                returnForm.setData(
                                                    'notes',
                                                    event.target.value,
                                                )
                                            }
                                            maxLength={500}
                                        />
                                    </div>
                                    <div className="mt-5 flex justify-between rounded-2xl bg-red-50 p-4 font-bold text-red-800">
                                        <span>Estimasi refund</span>
                                        <span>{money(estimatedRefund)}</span>
                                    </div>
                                    {Object.keys(returnForm.errors).length >
                                        0 && (
                                        <p className="mt-3 text-sm text-red-700">
                                            Retur gagal. Periksa quantity, akun
                                            refund, saldo, dan waktu transaksi.
                                        </p>
                                    )}
                                    <button
                                        disabled={
                                            returnForm.processing ||
                                            estimatedRefund < 0 ||
                                            !returnForm.data.items.some(
                                                (item) =>
                                                    Number(item.quantity) > 0,
                                            )
                                        }
                                        className="mt-4 h-12 w-full rounded-xl bg-red-700 font-black text-white disabled:opacity-50"
                                    >
                                        Posting retur
                                    </button>
                                </>
                            ) : (
                                <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                                    Semua item pada penjualan ini sudah diretur.
                                </p>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </>
    );
}
