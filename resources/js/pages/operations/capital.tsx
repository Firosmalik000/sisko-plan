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
} from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';

type Option = { public_id: string; name: string };
type Capital = {
    public_id: string;
    document_number: string;
    type: string;
    total_value: string;
    occurred_at: string;
    notes: string | null;
    account_name: string | null;
};
const labels: Record<string, string> = {
    cash_contribution: 'Setoran kas',
    cash_withdrawal: 'Penarikan kas',
    inventory_contribution: 'Setoran inventory',
    inventory_withdrawal: 'Penarikan inventory',
};

export default function CapitalPage({
    transactions,
    capitalBalance,
    products,
    accounts,
    timezone,
    canManage,
}: {
    transactions: { data: Capital[]; links: PaginationLink[]; total: number };
    capitalBalance: string;
    products: Option[];
    accounts: Option[];
    timezone: string;
    canManage: boolean;
}) {
    const form = useForm({
        type: 'cash_contribution',
        account_id: accounts[0]?.public_id ?? '',
        amount: '',
        items: [
            {
                product_id: products[0]?.public_id ?? '',
                quantity: '',
                unit_cost: '',
            },
        ],
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const isCash = form.data.type.startsWith('cash_');
    const incomingInventory = form.data.type === 'inventory_contribution';
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/operations/capital', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('amount', 'items', 'notes');
                form.setData('idempotency_key', postingToken());
            },
        });
    };

    return (
        <>
            <Head title="Capital ledger" />
            <OperationsShell
                active="/operations/capital"
                eyebrow="Buku 03 / Pemilik"
                title="Jejak modal, tanpa menyamarkannya."
                description="Kontribusi dan penarikan pemilik mengubah modal serta aset terkait secara atomik. Tidak satu pun dicatat sebagai omzet atau beban."
            >
                <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
                    {canManage && (
                        <LedgerCard
                            title="Posting transaksi modal"
                            description="Pilih bentuk aset yang disetor atau ditarik."
                        >
                            <form
                                onSubmit={submit}
                                className="grid gap-4 md:grid-cols-2"
                            >
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Jenis transaksi
                                    <select
                                        className={fieldClass}
                                        value={form.data.type}
                                        onChange={(event) =>
                                            form.setData(
                                                'type',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="cash_contribution">
                                            Setoran kas
                                        </option>
                                        <option value="cash_withdrawal">
                                            Penarikan kas
                                        </option>
                                        <option value="inventory_contribution">
                                            Setoran inventory
                                        </option>
                                        <option value="inventory_withdrawal">
                                            Penarikan inventory
                                        </option>
                                    </select>
                                </label>
                                {isCash ? (
                                    <label className="space-y-1 text-sm font-semibold text-stone-700">
                                        Akun
                                        <select
                                            className={fieldClass}
                                            value={form.data.account_id}
                                            onChange={(event) =>
                                                form.setData(
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
                                                    {account.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                ) : (
                                    <label className="space-y-1 text-sm font-semibold text-stone-700">
                                        Produk
                                        <select
                                            className={fieldClass}
                                            value={
                                                form.data.items[0].product_id
                                            }
                                            onChange={(event) =>
                                                form.setData('items', [
                                                    {
                                                        ...form.data.items[0],
                                                        product_id:
                                                            event.target.value,
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
                                )}
                                {isCash ? (
                                    <label className="space-y-1 text-sm font-semibold text-stone-700">
                                        Nominal
                                        <input
                                            className={fieldClass}
                                            type="number"
                                            min="0.0001"
                                            step="0.0001"
                                            value={form.data.amount}
                                            onChange={(event) =>
                                                form.setData(
                                                    'amount',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </label>
                                ) : (
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
                                                        quantity:
                                                            event.target.value,
                                                    },
                                                ])
                                            }
                                            required
                                        />
                                    </label>
                                )}
                                {!isCash && (
                                    <label className="space-y-1 text-sm font-semibold text-stone-700">
                                        Biaya/unit{' '}
                                        {incomingInventory ? '' : '(otomatis)'}
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
                                                        unit_cost:
                                                            event.target.value,
                                                    },
                                                ])
                                            }
                                            disabled={!incomingInventory}
                                            required={incomingInventory}
                                        />
                                    </label>
                                )}
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Waktu
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
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
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
                                <button
                                    className={`${buttonClass} md:col-span-2`}
                                    disabled={form.processing}
                                >
                                    Posting modal
                                </button>
                                {Object.keys(form.errors).length > 0 && (
                                    <p className="text-sm font-medium text-red-700 md:col-span-full">
                                        {Object.values(form.errors)[0]}
                                    </p>
                                )}
                            </form>
                        </LedgerCard>
                    )}
                    <section className="flex min-h-64 flex-col justify-between overflow-hidden rounded-3xl bg-amber-400 p-7 text-stone-950 shadow-lg shadow-amber-900/10">
                        <div>
                            <p className="text-xs font-black tracking-[0.2em] uppercase">
                                Modal bersih tercatat
                            </p>
                            <p className="mt-4 font-serif text-4xl xl:text-5xl">
                                {money(capitalBalance)}
                            </p>
                        </div>
                        <p className="mt-8 text-sm leading-6 font-medium text-stone-800">
                            Setoran dikurangi penarikan pemilik. Angka ini bukan
                            saldo kas dan bukan nilai inventory.
                        </p>
                    </section>
                </div>
                <LedgerCard title="Riwayat modal">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm">
                            <thead className="border-b border-stone-200 text-xs tracking-wider text-stone-500 uppercase">
                                <tr>
                                    <th className="pb-3">Dokumen</th>
                                    <th className="pb-3">Jenis</th>
                                    <th className="pb-3">Akun</th>
                                    <th className="pb-3">Nilai</th>
                                    <th className="pb-3">Waktu</th>
                                    <th className="pb-3">Catatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.data.map((item) => {
                                    const withdrawal =
                                        item.type.endsWith('withdrawal');

                                    return (
                                        <tr
                                            key={item.public_id}
                                            className="border-b border-stone-100"
                                        >
                                            <td className="py-3 font-mono text-xs font-bold">
                                                {item.document_number}
                                            </td>
                                            <td>
                                                {labels[item.type] ?? item.type}
                                            </td>
                                            <td>
                                                {item.account_name ||
                                                    'Inventory'}
                                            </td>
                                            <td
                                                className={
                                                    withdrawal
                                                        ? 'font-bold text-red-700'
                                                        : 'font-bold text-teal-700'
                                                }
                                            >
                                                {withdrawal ? '- ' : '+ '}
                                                {money(item.total_value)}
                                            </td>
                                            <td>
                                                {ledgerDateTime(
                                                    item.occurred_at,
                                                    timezone,
                                                )}
                                            </td>
                                            <td className="max-w-52 truncate text-stone-500">
                                                {item.notes || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {transactions.data.length === 0 && (
                            <p className="py-8 text-center text-sm text-stone-500">
                                Belum ada transaksi modal.
                            </p>
                        )}
                        <div className="mt-5">
                            <Pagination links={transactions.links} />
                        </div>
                    </div>
                </LedgerCard>
            </OperationsShell>
        </>
    );
}
