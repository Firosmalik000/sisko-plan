import { useForm } from '@inertiajs/react';
import { WalletCards } from 'lucide-react';
import type { FormEvent } from 'react';
import { FormCurrencyInput } from '@/components/forms';
import { fieldClass, LedgerCard, OperationsShell } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { formatMoney as money } from '@/lib/currency';
import { currentDateTime, ledgerDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { postingToken } from '@/lib/posting-token';
import { cash as cashIndex } from '@/routes/operations';
import { store as storeOpeningBalance } from '@/routes/operations/cash/opening';
import { store as storeTransfer } from '@/routes/operations/cash/transfers';

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
    const initialAccount = accounts.find((account) => account.is_active)?.public_id ?? '';
    const opening = useForm({
        account_id: initialAccount,
        amount: '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const transfer = useForm({
        from_account_id: initialAccount,
        to_account_id: accounts.filter((account) => account.is_active)[1]?.public_id ?? '',
        amount: '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const submitOpening = (event: FormEvent) => {
        event.preventDefault();
        opening.post(storeOpeningBalance.url(), {
            preserveScroll: true,
            onSuccess: () => {
                opening.reset('amount', 'notes');
                opening.setData('idempotency_key', postingToken());
            },
        });
    };
    const submitTransfer = (event: FormEvent) => {
        event.preventDefault();
        transfer.post(storeTransfer.url(), {
            preserveScroll: true,
            onSuccess: () => {
                transfer.reset('amount', 'notes');
                transfer.setData('idempotency_key', postingToken());
            },
        });
    };
    const activeAccounts = accounts.filter((account) => account.is_active);

    return (
        <OperationsShell active={cashIndex.url()} title="Kas & Bank" icon={WalletCards}>
            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                {canManage && (
                    <LedgerCard title="Saldo awal akun" description="Hanya untuk akun yang belum pernah memiliki transaksi.">
                        <form onSubmit={submitOpening} className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-1 text-sm font-semibold text-foreground">
                                Akun
                                <select
                                    className={fieldClass}
                                    value={opening.data.account_id}
                                    onChange={(event) => opening.setData('account_id', event.target.value)}
                                >
                                    {activeAccounts.map((account) => (
                                        <option key={account.public_id} value={account.public_id}>
                                            {account.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <FormCurrencyInput
                                id="opening-amount"
                                name="amount"
                                label={translate('Nominal')}
                                value={opening.data.amount}
                                onValueChange={(value) => opening.setData('amount', value)}
                                min="0.0001"
                                required
                            />
                            <label className="space-y-1 text-sm font-semibold text-foreground">
                                Waktu
                                <input
                                    className={fieldClass}
                                    type="datetime-local"
                                    value={opening.data.occurred_at}
                                    onChange={(event) => opening.setData('occurred_at', event.target.value)}
                                    required
                                />
                            </label>
                            <div className="flex items-end">
                                <Button size="touch" className="w-full" disabled={opening.processing}>
                                    Posting saldo awal
                                </Button>
                            </div>
                            {Object.keys(opening.errors).length > 0 && (
                                <p className="text-sm text-destructive md:col-span-full">{Object.values(opening.errors)[0]}</p>
                            )}
                        </form>
                    </LedgerCard>
                )}
                {canManage && (
                    <LedgerCard title="Transfer antar-akun" description="Debit dan kredit kas diposting atomik.">
                        <form onSubmit={submitTransfer} className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-1 text-sm font-semibold text-foreground">
                                Dari akun
                                <select
                                    className={fieldClass}
                                    value={transfer.data.from_account_id}
                                    onChange={(event) => transfer.setData('from_account_id', event.target.value)}
                                >
                                    {activeAccounts.map((account) => (
                                        <option key={account.public_id} value={account.public_id}>
                                            {account.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-1 text-sm font-semibold text-foreground">
                                Ke akun
                                <select
                                    className={fieldClass}
                                    value={transfer.data.to_account_id}
                                    onChange={(event) => transfer.setData('to_account_id', event.target.value)}
                                >
                                    {activeAccounts.map((account) => (
                                        <option key={account.public_id} value={account.public_id}>
                                            {account.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <FormCurrencyInput
                                id="transfer-amount"
                                name="amount"
                                label={translate('Nominal')}
                                value={transfer.data.amount}
                                onValueChange={(value) => transfer.setData('amount', value)}
                                min="0.0001"
                                required
                            />
                            <label className="space-y-1 text-sm font-semibold text-foreground">
                                Waktu
                                <input
                                    className={fieldClass}
                                    type="datetime-local"
                                    value={transfer.data.occurred_at}
                                    onChange={(event) => transfer.setData('occurred_at', event.target.value)}
                                    required
                                />
                            </label>
                            <Button size="touch" className="md:col-span-2" disabled={transfer.processing || activeAccounts.length < 2}>
                                Posting transfer
                            </Button>
                            {Object.keys(transfer.errors).length > 0 && (
                                <p className="text-sm text-destructive md:col-span-full">{Object.values(transfer.errors)[0]}</p>
                            )}
                        </form>
                    </LedgerCard>
                )}
            </div>
            <LedgerCard title="Posisi kas" description={`Total likuiditas ${money(totalBalance)}`}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {accounts.map((account) => (
                        <article key={account.public_id} className="rounded-2xl border border-border bg-muted p-4">
                            <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                {account.type.replace('_', ' ')}
                            </p>
                            <h3 className="mt-1 font-bold text-foreground">{account.name}</h3>
                            <p className="mt-5 font-sans text-2xl text-primary">{money(account.balance)}</p>
                        </article>
                    ))}
                </div>
            </LedgerCard>
            <LedgerCard title="Cash transaction terbaru">
                <div>
                    <table className="w-full text-left text-sm">
                        <thead className="hidden border-b border-border text-xs tracking-wider text-muted-foreground uppercase md:table-header-group">
                            <tr>
                                <th className="pb-3">Akun</th>
                                <th className="pb-3">Alasan</th>
                                <th className="pb-3">Arus</th>
                                <th className="pb-3">Nominal</th>
                                <th className="pb-3">Saldo akun</th>
                                <th className="pb-3">Waktu</th>
                            </tr>
                        </thead>
                        <tbody className="block divide-y divide-border md:table-row-group">
                            {transactions.data.map((item) => (
                                <tr key={item.public_id} className="grid grid-cols-2 gap-3 px-1 py-4 md:table-row md:px-0 md:py-0">
                                    <td className="col-span-2 p-0 font-semibold md:table-cell md:py-3">
                                        {item.account_name}
                                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground md:hidden">
                                            {translate(reasonLabels[item.reason] ?? item.reason)} ·{' '}
                                            {ledgerDateTime(item.occurred_at, timezone)}
                                        </span>
                                    </td>
                                    <td className="hidden md:table-cell">{translate(reasonLabels[item.reason] ?? item.reason)}</td>
                                    <td
                                        className={`p-0 md:table-cell ${item.direction === 'in' ? 'font-bold text-primary' : 'font-bold text-destructive'}`}
                                    >
                                        {item.direction === 'in' ? 'Arus masuk' : 'Arus keluar'}
                                    </td>
                                    <td className="p-0 text-right font-bold md:table-cell md:text-left">{money(item.amount)}</td>
                                    <td className="hidden md:table-cell">{money(item.balance_after)}</td>
                                    <td className="hidden md:table-cell">{ledgerDateTime(item.occurred_at, timezone)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {transactions.data.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">Belum ada transaksi kas.</p>
                    )}
                    <div className="mt-5">
                        <Pagination links={transactions.links} />
                    </div>
                </div>
            </LedgerCard>
        </OperationsShell>
    );
}
