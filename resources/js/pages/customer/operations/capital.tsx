import { useForm } from '@inertiajs/react';
import { ArrowDownLeft, ArrowUpRight, Boxes, CircleDollarSign, Plus, ReceiptText, WalletCards } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { FormCurrencyInput } from '@/components/forms';
import { fieldClass, OperationsShell } from '@/components/operations-shell';
import { ResponsiveDialog } from '@/components/overlays';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { formatMoney as money, formatQuantity as quantity, localeTag } from '@/lib/currency';
import { currentDateTime, ledgerDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { postingToken } from '@/lib/posting-token';
import { capital as capitalIndex } from '@/routes/operations';
import { store as storeCapital } from '@/routes/operations/capital';

type CapitalType = 'cash_contribution' | 'cash_withdrawal' | 'inventory_contribution' | 'inventory_withdrawal';

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
        label: 'Add cash',
        icon: <ArrowDownLeft className="size-4" />,
    },
    {
        value: 'cash_withdrawal',
        label: 'Withdraw cash',
        icon: <ArrowUpRight className="size-4" />,
    },
    {
        value: 'inventory_contribution',
        label: 'Contribute inventory',
        icon: <Boxes className="size-4" />,
    },
    {
        value: 'inventory_withdrawal',
        label: 'Withdraw inventory',
        icon: <Boxes className="size-4" />,
    },
];

const labels: Record<CapitalType, string> = {
    cash_contribution: 'Contribute cash as capital',
    cash_withdrawal: 'Withdraw capital cash',
    inventory_contribution: 'Contribute inventory as capital',
    inventory_withdrawal: 'Withdraw capital inventory',
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
    const selectedAccount = accounts.find((account) => account.public_id === form.data.account_id);
    const selectedProduct = products.find((product) => product.public_id === form.data.items[0].product_id);
    const enteredValue = Number(isCash ? form.data.amount : form.data.items[0].quantity);
    const currentAssetValue = Number(isCash ? selectedAccount?.balance : selectedProduct?.quantity);
    const projectedAssetValue = currentAssetValue + (isContribution ? enteredValue : -enteredValue);
    const insufficientBalance = !isContribution && enteredValue > currentAssetValue;
    const hasReferenceOptions = isCash ? accounts.length > 0 : products.length > 0;

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
        form.post(storeCapital.url(), {
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
            <OperationsShell active={capitalIndex.url()} title="Owner capital" icon={CircleDollarSign}>
                <section className="overflow-hidden rounded-2xl bg-[var(--app-ink)] text-white shadow-[0_14px_34px_-24px_var(--app-shadow)]">
                    <div className="relative px-4 py-5 sm:px-6">
                        <div className="absolute -top-20 right-0 size-52 rounded-full bg-[var(--app-primary)]/15 blur-3xl" />
                        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-amber-300 uppercase">
                                    <CircleDollarSign className="size-4" /> Net capital
                                </div>
                                <p className="mt-2 text-3xl font-bold tracking-[-0.05em] sm:text-4xl">{money(capitalBalance)}</p>
                            </div>
                            {canManage && (
                                <Button type="button" size="touch" className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
                                    <Plus className="size-4" /> Record capital
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="grid border-t border-white/10 bg-white/5 sm:grid-cols-3">
                        <HeroMetric icon={<ArrowDownLeft className="size-4" />} label="Total added" value={money(contributionTotal)} />
                        <HeroMetric icon={<ArrowUpRight className="size-4" />} label="Total withdrawn" value={money(withdrawalTotal)} />
                        <HeroMetric
                            icon={<ReceiptText className="size-4" />}
                            label="Document"
                            value={transactions.total.toLocaleString(localeTag())}
                        />
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                        <div>
                            <h2 className="text-lg font-bold tracking-[-0.025em] text-foreground">Capital history</h2>
                            <p className="text-xs font-semibold text-muted-foreground">
                                {transactions.total.toLocaleString(localeTag())} document
                            </p>
                        </div>
                        <WalletCards className="size-5 text-primary" />
                    </div>

                    <div className="divide-y divide-border md:hidden">
                        {transactions.data.map((item) => (
                            <CapitalCard key={item.public_id} item={item} timezone={timezone} />
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-muted/80 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-5 py-3">Document</th>
                                    <th className="px-3 py-3">Type</th>
                                    <th className="px-3 py-3">Assets</th>
                                    <th className="px-3 py-3 text-right">Value</th>
                                    <th className="px-3 py-3">Time</th>
                                    <th className="px-5 py-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {transactions.data.map((item) => {
                                    const withdrawal = item.type.endsWith('withdrawal');

                                    return (
                                        <tr key={item.public_id} className="transition hover:bg-muted/70">
                                            <td className="px-5 py-3 font-mono text-xs font-bold text-foreground">
                                                {item.document_number}
                                            </td>
                                            <td className="px-3 py-3">
                                                <TypeBadge type={item.type} />
                                            </td>
                                            <td className="px-3 py-3 text-muted-foreground">{item.account_name || 'Item'}</td>
                                            <td
                                                className={`px-3 py-3 text-right font-bold ${withdrawal ? 'text-destructive' : 'text-primary'}`}
                                            >
                                                {withdrawal ? '- ' : '+ '}
                                                {money(item.total_value)}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                                                {ledgerDateTime(item.occurred_at, timezone)}
                                            </td>
                                            <td className="max-w-48 px-5 py-3 text-muted-foreground">
                                                <span className="block truncate">{item.notes || '-'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {transactions.data.length === 0 && (
                        <div className="px-4 py-12 text-center">
                            <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-[var(--app-soft)] text-primary">
                                <WalletCards className="size-5" />
                            </div>
                            <p className="mt-3 text-sm font-bold text-foreground">No capital transactions yet</p>
                            {canManage && (
                                <Button type="button" variant="link" className="mt-3" onClick={() => setDialogOpen(true)}>
                                    Record first capital entry
                                </Button>
                            )}
                        </div>
                    )}

                    {transactions.links.length > 3 && (
                        <div className="border-t border-border px-4 py-4 sm:px-5">
                            <Pagination links={transactions.links} />
                        </div>
                    )}
                </section>
            </OperationsShell>

            <ResponsiveDialog
                open={dialogOpen}
                onOpenChange={changeDialog}
                title={translate('Record capital')}
                description={translate('Record addition or withdrawal capital owner.')}
                footer={
                    <>
                        <Button type="button" size="touch" variant="outline" onClick={() => changeDialog(false)}>
                            {translate('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            size="touch"
                            form="capital-form"
                            disabled={form.processing || insufficientBalance || !hasReferenceOptions}
                        >
                            {translate(form.processing ? 'Saving...' : 'Save capital')}
                        </Button>
                    </>
                }
            >
                <form id="capital-form" onSubmit={submit} className="space-y-4">
                    <fieldset>
                        <legend className="mb-2 text-sm font-bold text-foreground">Transaction type</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {transactionTypes.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-sm font-bold transition ${
                                        form.data.type === option.value
                                            ? 'border-primary bg-[var(--app-soft)] text-[var(--app-ink)] ring-2 ring-ring/10'
                                            : 'border-border bg-card text-muted-foreground hover:border-input hover:bg-muted'
                                    }`}
                                    aria-pressed={form.data.type === option.value}
                                    onClick={() => setType(option.value)}
                                >
                                    {option.icon}
                                    {translate(option.label)}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {isCash ? (
                            <Field label="Account cash/bank">
                                <select
                                    className={fieldClass}
                                    value={form.data.account_id}
                                    required
                                    onChange={(event) => form.setData('account_id', event.target.value)}
                                >
                                    {accounts.map((account) => (
                                        <option key={account.public_id} value={account.public_id}>
                                            {account.name} · {money(account.balance)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        ) : (
                            <Field label="Item">
                                <select
                                    className={fieldClass}
                                    value={form.data.items[0].product_id}
                                    required
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
                                        <option key={product.public_id} value={product.public_id}>
                                            {product.name} · stock {quantity(product.quantity)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}

                        {isCash ? (
                            <FormCurrencyInput
                                id="capital-amount"
                                name="amount"
                                label={translate('Amount')}
                                value={form.data.amount}
                                onValueChange={(value) => form.setData('amount', value)}
                                min="0.0001"
                                required
                            />
                        ) : (
                            <Field label="Item quantity">
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
                                                quantity: event.target.value,
                                            },
                                        ])
                                    }
                                />
                            </Field>
                        )}

                        {!isCash && isContribution && (
                            <FormCurrencyInput
                                id="capital-unit-cost"
                                name="unit_cost"
                                label={translate('Expense per item')}
                                value={form.data.items[0].unit_cost}
                                onValueChange={(value) => form.setData('items', [{ ...form.data.items[0], unit_cost: value }])}
                                min="0"
                                required
                            />
                        )}

                        <Field label="Time">
                            <input
                                className={fieldClass}
                                type="datetime-local"
                                required
                                value={form.data.occurred_at}
                                onChange={(event) => form.setData('occurred_at', event.target.value)}
                            />
                        </Field>

                        <label className="space-y-1 text-sm font-bold text-foreground sm:col-span-2">
                            Notes <span className="font-normal text-muted-foreground">(optional)</span>
                            <textarea
                                className={`${fieldClass} min-h-20 resize-y py-2.5`}
                                maxLength={500}
                                value={form.data.notes}
                                onChange={(event) => form.setData('notes', event.target.value)}
                            />
                        </label>
                    </div>

                    {hasReferenceOptions && (
                        <div className="grid grid-cols-2 divide-x divide-border rounded-xl border border-border bg-secondary py-3 text-[var(--app-ink)]">
                            <Calculation
                                label={isCash ? 'Current balance' : 'Current stock'}
                                value={isCash ? money(currentAssetValue) : quantity(currentAssetValue)}
                            />
                            <Calculation
                                label={isCash ? 'Balance setelahnya' : 'Stock setelahnya'}
                                value={isCash ? money(projectedAssetValue) : quantity(projectedAssetValue)}
                                danger={insufficientBalance}
                            />
                        </div>
                    )}

                    {insufficientBalance && (
                        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm font-bold text-destructive">
                            {isCash
                                ? 'The account balance is too low for this withdrawal.'
                                : 'There is not enough stock for this withdrawal.'}
                        </p>
                    )}

                    {Object.keys(form.errors).length > 0 && (
                        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm font-bold text-destructive">
                            {Object.values(form.errors)[0]}
                        </p>
                    )}
                </form>
            </ResponsiveDialog>
        </>
    );
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:px-6 sm:last:border-r-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">{icon}</span>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-white/60">{translate(label)}</p>
                <p className="truncate text-sm font-bold">{value}</p>
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
                    <p className="mt-2 truncate font-mono text-xs font-bold text-muted-foreground">{item.document_number}</p>
                </div>
                <p className={`shrink-0 text-sm font-bold ${withdrawal ? 'text-destructive' : 'text-primary'}`}>
                    {withdrawal ? '- ' : '+ '}
                    {money(item.total_value)}
                </p>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate font-semibold">{item.account_name || 'Item'}</span>
                <span className="shrink-0">{ledgerDateTime(item.occurred_at, timezone)}</span>
            </div>
            {item.notes && <p className="truncate text-xs text-muted-foreground">{item.notes}</p>}
        </article>
    );
}

function TypeBadge({ type }: { type: CapitalType }) {
    const withdrawal = type.endsWith('withdrawal');

    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                withdrawal ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary'
            }`}
        >
            {translate(labels[type])}
        </span>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="space-y-1 text-sm font-bold text-foreground">
            {translate(label)}
            {children}
        </label>
    );
}

function Calculation({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
    return (
        <div className="min-w-0 px-3 text-center">
            <p className="truncate text-[11px] font-bold text-muted-foreground">{translate(label)}</p>
            <p className={`mt-0.5 truncate text-sm font-bold ${danger ? 'text-destructive' : ''}`}>{value}</p>
        </div>
    );
}
