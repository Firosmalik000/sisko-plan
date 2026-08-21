import { Head, useForm } from '@inertiajs/react';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Boxes,
    CircleDollarSign,
    Plus,
    ReceiptText,
    WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
    buttonClass,
    currentDateTime,
    fieldClass,
    ledgerDateTime,
    money,
    OperationsShell,
    postingToken,
    quantity,
} from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type CapitalType =
    | 'cash_contribution'
    | 'cash_withdrawal'
    | 'inventory_contribution'
    | 'inventory_withdrawal';

type AccountOption = {
    public_id: string;
    name: string;
    balance: string;
};

type ProductOption = {
    public_id: string;
    name: string;
    quantity: string;
    average_cost: string;
};

type Capital = {
    public_id: string;
    document_number: string;
    type: CapitalType;
    total_value: string;
    occurred_at: string;
    notes: string | null;
    account_name: string | null;
};

const transactionTypes: Array<{
    value: CapitalType;
    label: string;
    icon: ReactNode;
}> = [
    {
        value: 'cash_contribution',
        label: 'Tambah kas',
        icon: <ArrowDownLeft className="size-4" />,
    },
    {
        value: 'cash_withdrawal',
        label: 'Ambil kas',
        icon: <ArrowUpRight className="size-4" />,
    },
    {
        value: 'inventory_contribution',
        label: 'Tambah barang',
        icon: <Boxes className="size-4" />,
    },
    {
        value: 'inventory_withdrawal',
        label: 'Ambil barang',
        icon: <Boxes className="size-4" />,
    },
];

const labels: Record<CapitalType, string> = {
    cash_contribution: 'Tambah modal kas',
    cash_withdrawal: 'Ambil modal kas',
    inventory_contribution: 'Tambah modal barang',
    inventory_withdrawal: 'Ambil modal barang',
};

export default function CapitalPage({
    transactions,
    capitalBalance,
    contributionTotal,
    withdrawalTotal,
    products,
    accounts,
    timezone,
    canManage,
}: {
    transactions: { data: Capital[]; links: PaginationLink[]; total: number };
    capitalBalance: string;
    contributionTotal: string;
    withdrawalTotal: string;
    products: ProductOption[];
    accounts: AccountOption[];
    timezone: string;
    canManage: boolean;
}) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const form = useForm({
        type: 'cash_contribution' as CapitalType,
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
    const isContribution = form.data.type.endsWith('contribution');
    const selectedAccount = accounts.find(
        (account) => account.public_id === form.data.account_id,
    );
    const selectedProduct = products.find(
        (product) => product.public_id === form.data.items[0].product_id,
    );
    const enteredValue = Number(
        isCash ? form.data.amount : form.data.items[0].quantity,
    );
    const currentAssetValue = Number(
        isCash ? selectedAccount?.balance : selectedProduct?.quantity,
    );
    const projectedAssetValue =
        currentAssetValue + (isContribution ? enteredValue : -enteredValue);
    const insufficientBalance =
        !isContribution && enteredValue > currentAssetValue;
    const hasReferenceOptions = isCash
        ? accounts.length > 0
        : products.length > 0;

    const setType = (type: CapitalType) => {
        form.setData('type', type);
        form.clearErrors();
    };

    const changeDialog = (open: boolean) => {
        setDialogOpen(open);

        if (!open) {
            form.clearErrors();
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) =>
            isCash
                ? {
                      type: data.type,
                      account_id: data.account_id,
                      amount: data.amount,
                      occurred_at: data.occurred_at,
                      notes: data.notes,
                      idempotency_key: data.idempotency_key,
                  }
                : {
                      type: data.type,
                      items: data.items,
                      occurred_at: data.occurred_at,
                      notes: data.notes,
                      idempotency_key: data.idempotency_key,
                  },
        );
        form.post('/operations/capital', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('amount', 'items', 'notes');
                form.setData('idempotency_key', postingToken());
                setDialogOpen(false);
            },
        });
    };

    return (
        <>
            <Head title="Modal Pemilik" />
            <OperationsShell
                active="/operations/capital"
                eyebrow="Operasional"
                title="Modal Pemilik"
                description=""
            >
                <section className="overflow-hidden rounded-[1.35rem] bg-[#123d36] text-white shadow-[0_12px_32px_rgba(18,61,54,0.13)]">
                    <div className="relative px-4 py-5 sm:px-6">
                        <div className="absolute -top-20 right-0 size-52 rounded-full bg-teal-300/15 blur-3xl" />
                        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-amber-300 uppercase">
                                    <CircleDollarSign className="size-4" />{' '}
                                    Modal bersih
                                </div>
                                <p className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                                    {money(capitalBalance)}
                                </p>
                            </div>
                            {canManage && (
                                <button
                                    type="button"
                                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-black text-[#173c35] transition hover:bg-amber-300 sm:w-auto"
                                    onClick={() => setDialogOpen(true)}
                                >
                                    <Plus className="size-4" /> Catat modal
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="grid border-t border-white/10 bg-white/5 sm:grid-cols-3">
                        <HeroMetric
                            icon={<ArrowDownLeft className="size-4" />}
                            label="Total ditambah"
                            value={money(contributionTotal)}
                        />
                        <HeroMetric
                            icon={<ArrowUpRight className="size-4" />}
                            label="Total diambil"
                            value={money(withdrawalTotal)}
                        />
                        <HeroMetric
                            icon={<ReceiptText className="size-4" />}
                            label="Dokumen"
                            value={transactions.total.toLocaleString('id-ID')}
                        />
                    </div>
                </section>

                <section className="overflow-hidden rounded-[1.35rem] border border-stone-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
                        <div>
                            <h2 className="text-lg font-black tracking-[-0.025em] text-stone-900">
                                Riwayat modal
                            </h2>
                            <p className="text-xs font-semibold text-stone-500">
                                {transactions.total.toLocaleString('id-ID')}{' '}
                                dokumen
                            </p>
                        </div>
                        <WalletCards className="size-5 text-teal-700" />
                    </div>

                    <div className="divide-y divide-stone-100 md:hidden">
                        {transactions.data.map((item) => (
                            <CapitalCard
                                key={item.public_id}
                                item={item}
                                timezone={timezone}
                            />
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-black tracking-wider text-stone-500 uppercase">
                                <tr>
                                    <th className="px-5 py-3">Dokumen</th>
                                    <th className="px-3 py-3">Jenis</th>
                                    <th className="px-3 py-3">Aset</th>
                                    <th className="px-3 py-3 text-right">
                                        Nilai
                                    </th>
                                    <th className="px-3 py-3">Waktu</th>
                                    <th className="px-5 py-3">Catatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {transactions.data.map((item) => {
                                    const withdrawal =
                                        item.type.endsWith('withdrawal');

                                    return (
                                        <tr
                                            key={item.public_id}
                                            className="transition hover:bg-stone-50/70"
                                        >
                                            <td className="px-5 py-3 font-mono text-xs font-bold text-stone-700">
                                                {item.document_number}
                                            </td>
                                            <td className="px-3 py-3">
                                                <TypeBadge type={item.type} />
                                            </td>
                                            <td className="px-3 py-3 text-stone-600">
                                                {item.account_name || 'Barang'}
                                            </td>
                                            <td
                                                className={`px-3 py-3 text-right font-black ${withdrawal ? 'text-rose-700' : 'text-teal-700'}`}
                                            >
                                                {withdrawal ? '- ' : '+ '}
                                                {money(item.total_value)}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-stone-600">
                                                {ledgerDateTime(
                                                    item.occurred_at,
                                                    timezone,
                                                )}
                                            </td>
                                            <td className="max-w-48 px-5 py-3 text-stone-500">
                                                <span className="block truncate">
                                                    {item.notes || '-'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {transactions.data.length === 0 && (
                        <div className="px-4 py-12 text-center">
                            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-[#eef4f0] text-teal-700">
                                <WalletCards className="size-5" />
                            </div>
                            <p className="mt-3 text-sm font-bold text-stone-700">
                                Belum ada transaksi modal
                            </p>
                            {canManage && (
                                <button
                                    type="button"
                                    className="mt-3 text-sm font-black text-teal-700 hover:text-teal-800"
                                    onClick={() => setDialogOpen(true)}
                                >
                                    Catat modal pertama
                                </button>
                            )}
                        </div>
                    )}

                    {transactions.links.length > 3 && (
                        <div className="border-t border-stone-200 px-4 py-4 sm:px-5">
                            <Pagination links={transactions.links} />
                        </div>
                    )}
                </section>
            </OperationsShell>

            <Dialog open={dialogOpen} onOpenChange={changeDialog}>
                <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-stone-200 bg-white p-0 shadow-2xl sm:max-w-xl">
                    <DialogHeader className="border-b border-stone-200 px-4 py-4 pr-12 text-left sm:px-5">
                        <DialogTitle className="text-lg font-black tracking-[-0.03em] text-[#173c35]">
                            Catat modal
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Catat penambahan atau pengambilan modal pemilik.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                            <fieldset>
                                <legend className="mb-2 text-sm font-bold text-stone-700">
                                    Jenis transaksi
                                </legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {transactionTypes.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold transition ${
                                                form.data.type === option.value
                                                    ? 'border-teal-700 bg-[#e8f1ed] text-[#173c35] ring-2 ring-teal-700/10'
                                                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                                            }`}
                                            aria-pressed={
                                                form.data.type === option.value
                                            }
                                            onClick={() =>
                                                setType(option.value)
                                            }
                                        >
                                            {option.icon}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="grid gap-4 sm:grid-cols-2">
                                {isCash ? (
                                    <Field label="Akun kas/bank">
                                        <select
                                            className={fieldClass}
                                            value={form.data.account_id}
                                            required
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
                                                    {account.name} ·{' '}
                                                    {money(account.balance)}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                ) : (
                                    <Field label="Barang">
                                        <select
                                            className={fieldClass}
                                            value={
                                                form.data.items[0].product_id
                                            }
                                            required
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
                                                    {product.name} · stok{' '}
                                                    {quantity(product.quantity)}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                )}

                                {isCash ? (
                                    <Field label="Nominal">
                                        <div className="flex h-10 items-center overflow-hidden rounded-xl border border-stone-300 bg-white focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/15">
                                            <span className="border-r border-stone-200 bg-stone-50 px-3 text-sm font-black text-stone-600">
                                                Rp
                                            </span>
                                            <input
                                                className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-stone-900 outline-none"
                                                type="number"
                                                inputMode="decimal"
                                                min="0.0001"
                                                step="0.0001"
                                                required
                                                autoFocus
                                                placeholder="0"
                                                value={form.data.amount}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'amount',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </Field>
                                ) : (
                                    <Field label="Jumlah barang">
                                        <input
                                            className={fieldClass}
                                            type="number"
                                            inputMode="decimal"
                                            min="0.000001"
                                            step="0.000001"
                                            required
                                            autoFocus
                                            placeholder="0"
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
                                        />
                                    </Field>
                                )}

                                {!isCash && isContribution && (
                                    <Field label="Biaya per barang">
                                        <div className="flex h-10 items-center overflow-hidden rounded-xl border border-stone-300 bg-white focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-600/15">
                                            <span className="border-r border-stone-200 bg-stone-50 px-3 text-sm font-black text-stone-600">
                                                Rp
                                            </span>
                                            <input
                                                className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm font-bold text-stone-900 outline-none"
                                                type="number"
                                                inputMode="decimal"
                                                min="0"
                                                step="0.0001"
                                                required
                                                placeholder="0"
                                                value={
                                                    form.data.items[0].unit_cost
                                                }
                                                onChange={(event) =>
                                                    form.setData('items', [
                                                        {
                                                            ...form.data
                                                                .items[0],
                                                            unit_cost:
                                                                event.target
                                                                    .value,
                                                        },
                                                    ])
                                                }
                                            />
                                        </div>
                                    </Field>
                                )}

                                <Field label="Waktu">
                                    <input
                                        className={fieldClass}
                                        type="datetime-local"
                                        required
                                        value={form.data.occurred_at}
                                        onChange={(event) =>
                                            form.setData(
                                                'occurred_at',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>

                                <label className="space-y-1 text-sm font-bold text-stone-700 sm:col-span-2">
                                    Catatan{' '}
                                    <span className="font-normal text-stone-400">
                                        (opsional)
                                    </span>
                                    <textarea
                                        className={`${fieldClass} min-h-20 resize-y py-2.5`}
                                        maxLength={500}
                                        value={form.data.notes}
                                        onChange={(event) =>
                                            form.setData(
                                                'notes',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            </div>

                            {hasReferenceOptions && (
                                <div className="grid grid-cols-2 divide-x divide-teal-900/10 rounded-xl border border-teal-900/10 bg-[#f2f7f4] py-3 text-[#173c35]">
                                    <Calculation
                                        label={
                                            isCash
                                                ? 'Saldo saat ini'
                                                : 'Stok saat ini'
                                        }
                                        value={
                                            isCash
                                                ? money(currentAssetValue)
                                                : quantity(currentAssetValue)
                                        }
                                    />
                                    <Calculation
                                        label={
                                            isCash
                                                ? 'Saldo setelahnya'
                                                : 'Stok setelahnya'
                                        }
                                        value={
                                            isCash
                                                ? money(projectedAssetValue)
                                                : quantity(projectedAssetValue)
                                        }
                                        danger={insufficientBalance}
                                    />
                                </div>
                            )}

                            {insufficientBalance && (
                                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">
                                    {isCash
                                        ? 'Saldo akun tidak cukup untuk penarikan ini.'
                                        : 'Stok tidak cukup untuk pengambilan ini.'}
                                </p>
                            )}

                            {Object.keys(form.errors).length > 0 && (
                                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">
                                    {Object.values(form.errors)[0]}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-stone-200 bg-white px-4 py-3 min-[375px]:flex-row min-[375px]:justify-end sm:px-5">
                            <button
                                type="button"
                                className="h-10 rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-700 hover:bg-stone-50"
                                onClick={() => changeDialog(false)}
                            >
                                Batal
                            </button>
                            <button
                                className={buttonClass}
                                disabled={
                                    form.processing ||
                                    insufficientBalance ||
                                    !hasReferenceOptions
                                }
                            >
                                {form.processing
                                    ? 'Menyimpan...'
                                    : 'Simpan modal'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function HeroMetric({
    icon,
    label,
    value,
}: {
    icon: ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:px-6 sm:last:border-r-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-white/60">
                    {label}
                </p>
                <p className="truncate text-sm font-black">{value}</p>
            </div>
        </div>
    );
}

function CapitalCard({ item, timezone }: { item: Capital; timezone: string }) {
    const withdrawal = item.type.endsWith('withdrawal');

    return (
        <article className="space-y-3 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <TypeBadge type={item.type} />
                    <p className="mt-2 truncate font-mono text-xs font-bold text-stone-500">
                        {item.document_number}
                    </p>
                </div>
                <p
                    className={`shrink-0 text-sm font-black ${withdrawal ? 'text-rose-700' : 'text-teal-700'}`}
                >
                    {withdrawal ? '- ' : '+ '}
                    {money(item.total_value)}
                </p>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
                <span className="truncate font-semibold">
                    {item.account_name || 'Barang'}
                </span>
                <span className="shrink-0">
                    {ledgerDateTime(item.occurred_at, timezone)}
                </span>
            </div>
            {item.notes && (
                <p className="truncate text-xs text-stone-500">{item.notes}</p>
            )}
        </article>
    );
}

function TypeBadge({ type }: { type: CapitalType }) {
    const withdrawal = type.endsWith('withdrawal');

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
                withdrawal
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-teal-50 text-teal-700'
            }`}
        >
            {labels[type]}
        </span>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="space-y-1 text-sm font-bold text-stone-700">
            {label}
            {children}
        </label>
    );
}

function Calculation({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: string;
    danger?: boolean;
}) {
    return (
        <div className="min-w-0 px-3 text-center">
            <p className="truncate text-[11px] font-bold text-stone-500">
                {label}
            </p>
            <p
                className={`mt-0.5 truncate text-sm font-black ${danger ? 'text-rose-700' : ''}`}
            >
                {value}
            </p>
        </div>
    );
}
