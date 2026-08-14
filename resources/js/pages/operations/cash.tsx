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

type Account = {
    public_id: string;
    name: string;
    type: string;
    balance: string;
    is_active: boolean;
};
type Transaction = {
    public_id: string;
    account_name: string;
    direction: 'in' | 'out';
    reason: string;
    amount: string;
    balance_after: string;
    occurred_at: string;
};
const reasonLabels: Record<string, string> = {
    opening_balance: 'Saldo awal',
    cash_contribution: 'Setoran modal',
    cash_withdrawal: 'Penarikan modal',
    transfer_in: 'Transfer masuk',
    transfer_out: 'Transfer keluar',
    sale_payment: 'Pembayaran penjualan',
    sale_refund: 'Refund penjualan',
    expense: 'Biaya toko',
};

export default function CashPage({
    accounts,
    transactions,
    totalBalance,
    timezone,
    canManage,
}: {
    accounts: Account[];
    transactions: {
        data: Transaction[];
        links: PaginationLink[];
        total: number;
    };
    totalBalance: string | number;
    timezone: string;
    canManage: boolean;
}) {
    const initialAccount =
        accounts.find((account) => account.is_active)?.public_id ?? '';
    const opening = useForm({
        account_id: initialAccount,
        amount: '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const transfer = useForm({
        from_account_id: initialAccount,
        to_account_id:
            accounts.filter((account) => account.is_active)[1]?.public_id ?? '',
        amount: '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const submitOpening = (event: FormEvent) => {
        event.preventDefault();
        opening.post('/operations/cash/opening', {
            preserveScroll: true,
            onSuccess: () => {
                opening.reset('amount', 'notes');
                opening.setData('idempotency_key', postingToken());
            },
        });
    };
    const submitTransfer = (event: FormEvent) => {
        event.preventDefault();
        transfer.post('/operations/cash/transfers', {
            preserveScroll: true,
            onSuccess: () => {
                transfer.reset('amount', 'notes');
                transfer.setData('idempotency_key', postingToken());
            },
        });
    };
    const activeAccounts = accounts.filter((account) => account.is_active);

    return (
        <>
            <Head title="Cash ledger" />
            <OperationsShell
                active="/operations/cash"
                eyebrow="Buku 02 / Uang"
                title="Kas bukan modal. Modal bukan omzet."
                description="Setiap rupiah bergerak melalui cash transaction. Transfer memindahkan posisi antar-akun tanpa mengubah total kas toko."
            >
                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    {canManage && (
                        <LedgerCard
                            title="Saldo awal akun"
                            description="Hanya untuk akun yang belum pernah memiliki transaksi."
                        >
                            <form
                                onSubmit={submitOpening}
                                className="grid gap-4 md:grid-cols-2"
                            >
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Akun
                                    <select
                                        className={fieldClass}
                                        value={opening.data.account_id}
                                        onChange={(event) =>
                                            opening.setData(
                                                'account_id',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {activeAccounts.map((account) => (
                                            <option
                                                key={account.public_id}
                                                value={account.public_id}
                                            >
                                                {account.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Nominal
                                    <input
                                        className={fieldClass}
                                        type="number"
                                        min="0.0001"
                                        step="0.0001"
                                        value={opening.data.amount}
                                        onChange={(event) =>
                                            opening.setData(
                                                'amount',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Waktu
                                    <input
                                        className={fieldClass}
                                        type="datetime-local"
                                        value={opening.data.occurred_at}
                                        onChange={(event) =>
                                            opening.setData(
                                                'occurred_at',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </label>
                                <div className="flex items-end">
                                    <button
                                        className={`${buttonClass} w-full`}
                                        disabled={opening.processing}
                                    >
                                        Posting saldo awal
                                    </button>
                                </div>
                                {Object.keys(opening.errors).length > 0 && (
                                    <p className="text-sm text-red-700 md:col-span-full">
                                        {Object.values(opening.errors)[0]}
                                    </p>
                                )}
                            </form>
                        </LedgerCard>
                    )}
                    {canManage && (
                        <LedgerCard
                            title="Transfer antar-akun"
                            description="Debit dan kredit kas diposting atomik."
                        >
                            <form
                                onSubmit={submitTransfer}
                                className="grid gap-4 md:grid-cols-2"
                            >
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Dari akun
                                    <select
                                        className={fieldClass}
                                        value={transfer.data.from_account_id}
                                        onChange={(event) =>
                                            transfer.setData(
                                                'from_account_id',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {activeAccounts.map((account) => (
                                            <option
                                                key={account.public_id}
                                                value={account.public_id}
                                            >
                                                {account.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Ke akun
                                    <select
                                        className={fieldClass}
                                        value={transfer.data.to_account_id}
                                        onChange={(event) =>
                                            transfer.setData(
                                                'to_account_id',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {activeAccounts.map((account) => (
                                            <option
                                                key={account.public_id}
                                                value={account.public_id}
                                            >
                                                {account.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Nominal
                                    <input
                                        className={fieldClass}
                                        type="number"
                                        min="0.0001"
                                        step="0.0001"
                                        value={transfer.data.amount}
                                        onChange={(event) =>
                                            transfer.setData(
                                                'amount',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </label>
                                <label className="space-y-1 text-sm font-semibold text-stone-700">
                                    Waktu
                                    <input
                                        className={fieldClass}
                                        type="datetime-local"
                                        value={transfer.data.occurred_at}
                                        onChange={(event) =>
                                            transfer.setData(
                                                'occurred_at',
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </label>
                                <button
                                    className={`${buttonClass} md:col-span-2`}
                                    disabled={
                                        transfer.processing ||
                                        activeAccounts.length < 2
                                    }
                                >
                                    Posting transfer
                                </button>
                                {Object.keys(transfer.errors).length > 0 && (
                                    <p className="text-sm text-red-700 md:col-span-full">
                                        {Object.values(transfer.errors)[0]}
                                    </p>
                                )}
                            </form>
                        </LedgerCard>
                    )}
                </div>
                <LedgerCard
                    title="Posisi kas"
                    description={`Total likuiditas ${money(totalBalance)}`}
                >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {accounts.map((account) => (
                            <article
                                key={account.public_id}
                                className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                            >
                                <p className="text-xs font-bold tracking-wider text-stone-500 uppercase">
                                    {account.type.replace('_', ' ')}
                                </p>
                                <h3 className="mt-1 font-bold text-stone-900">
                                    {account.name}
                                </h3>
                                <p className="mt-5 font-serif text-2xl text-teal-800">
                                    {money(account.balance)}
                                </p>
                            </article>
                        ))}
                    </div>
                </LedgerCard>
                <LedgerCard title="Cash transaction terbaru">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[680px] text-left text-sm">
                            <thead className="border-b border-stone-200 text-xs tracking-wider text-stone-500 uppercase">
                                <tr>
                                    <th className="pb-3">Akun</th>
                                    <th className="pb-3">Alasan</th>
                                    <th className="pb-3">Arus</th>
                                    <th className="pb-3">Nominal</th>
                                    <th className="pb-3">Saldo akun</th>
                                    <th className="pb-3">Waktu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.data.map((item) => (
                                    <tr
                                        key={item.public_id}
                                        className="border-b border-stone-100"
                                    >
                                        <td className="py-3 font-semibold">
                                            {item.account_name}
                                        </td>
                                        <td>
                                            {reasonLabels[item.reason] ??
                                                item.reason}
                                        </td>
                                        <td
                                            className={
                                                item.direction === 'in'
                                                    ? 'font-bold text-teal-700'
                                                    : 'font-bold text-red-700'
                                            }
                                        >
                                            {item.direction === 'in'
                                                ? 'Masuk'
                                                : 'Keluar'}
                                        </td>
                                        <td>{money(item.amount)}</td>
                                        <td>{money(item.balance_after)}</td>
                                        <td>
                                            {ledgerDateTime(
                                                item.occurred_at,
                                                timezone,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {transactions.data.length === 0 && (
                            <p className="py-8 text-center text-sm text-stone-500">
                                Belum ada transaksi kas.
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
