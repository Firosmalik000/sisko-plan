import { router, useForm } from '@inertiajs/react';
import { CircleDollarSign, Plus, ReceiptText, RotateCcw, Search, Tags, WalletCards } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import AlertError from '@/components/alert-error';
import { FormCurrencyInput, FormInput, FormSelect, FormTextarea } from '@/components/forms';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { DataToolbar, dataToolbarControlClass } from '@/components/page/data-toolbar';
import { EmptyState } from '@/components/page/empty-state';
import { RecordList, RecordListHeader, RecordListRow } from '@/components/page/record-list';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney as money, localeTag } from '@/lib/currency';
import { currentDateTime, ledgerDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { postingToken } from '@/lib/posting-token';
import { index as expensesIndex, store as storeExpense } from '@/routes/expenses';
import { store as storeExpenseCategory, update as updateExpenseCategory } from '@/routes/expenses/categories';

type Category = {
    public_id: string;
    name: string;
    is_active: boolean;
};
type Account = { public_id: string; name: string; balance: string };
type Expense = {
    public_id: string;
    document_number: string;
    category_name: string;
    account_name: string;
    amount: string;
    occurred_at: string;
    notes: string | null;
};
type Filters = {
    search: string;
    category: string;
    start_date: string;
    end_date: string;
};
type Summary = {
    total: string;
    count: number;
    largest_category: { name: string; total: string } | null;
    account_balance: string;
};

export default function ExpensesPage({
    categories,
    accounts,
    expenses,
    filters,
    summary,
    timezone,
}: {
    categories: Category[];
    accounts: Account[];
    expenses: { data: Expense[]; links: PaginationLink[]; total: number };
    filters: Filters;
    summary: Summary;
    timezone: string;
}) {
    const [expenseOpen, setExpenseOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const activeCategories = categories.filter((item) => item.is_active);
    const category = useForm({ name: '', is_active: true });
    const expense = useForm({
        category_id: activeCategories[0]?.public_id ?? '',
        account_id: accounts[0]?.public_id ?? '',
        amount: '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const filter = useForm(filters);
    const selectedAccount = accounts.find((item) => item.public_id === expense.data.account_id);
    const amount = Number(expense.data.amount || 0);
    const remainingBalance = Number(selectedAccount?.balance ?? 0) - amount;
    const hasFilters = Object.values(filters).some((value) => value !== '');
    const canPost = activeCategories.length > 0 && accounts.length > 0;

    const submitCategory = (event: FormEvent) => {
        event.preventDefault();
        category.post(storeExpenseCategory.url(), {
            preserveScroll: true,
            onSuccess: () => category.reset(),
        });
    };
    const submitExpense = (event: FormEvent) => {
        event.preventDefault();
        expense.post(storeExpense.url(), {
            preserveScroll: true,
            onSuccess: () => {
                expense.reset('amount', 'notes');
                expense.setData('idempotency_key', postingToken());
                setExpenseOpen(false);
            },
        });
    };
    const applyFilter = (event: FormEvent) => {
        event.preventDefault();
        router.get(expensesIndex.url(), filter.data, { preserveState: true, replace: true });
    };
    const resetFilters = () => router.get(expensesIndex.url(), {}, { preserveState: true, replace: true });

    return (
        <>
            <AppPage
                title={translate('Biaya toko')}
                icon={ReceiptText}
                headerSurface
                description={translate('Catat pengeluaran dan pantau penggunaan saldo toko.')}
                actions={
                    <>
                        <Button size="touch" variant="outline" onClick={() => setCategoryOpen(true)}>
                            <Tags className="size-4" aria-hidden="true" /> {translate('Kategori')}
                        </Button>
                        <Button size="touch" disabled={!canPost} onClick={() => setExpenseOpen(true)}>
                            <Plus className="size-4" aria-hidden="true" /> {translate('Catat biaya')}
                        </Button>
                    </>
                }
            >
                <section className="grid grid-cols-2 overflow-hidden rounded-2xl bg-secondary text-secondary-foreground lg:grid-cols-4">
                    <SummaryItem icon={CircleDollarSign} label="Total terfilter" value={money(summary.total)} />
                    <SummaryItem icon={ReceiptText} label="Transaksi" value={summary.count.toLocaleString(localeTag())} />
                    <SummaryItem
                        icon={Tags}
                        label="Kategori terbesar"
                        value={summary.largest_category?.name ?? '-'}
                        meta={summary.largest_category ? money(summary.largest_category.total) : undefined}
                    />
                    <SummaryItem icon={WalletCards} label="Saldo akun aktif" value={money(summary.account_balance)} />
                </section>

                <RecordList className="-mx-3 rounded-none border-y border-border min-[375px]:-mx-4 sm:mx-0 sm:rounded-2xl sm:border-0">
                    <DataToolbar
                        onSubmit={applyFilter}
                        search={
                            <div className="relative">
                                <Search
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    placeholder={translate('Cari dokumen atau catatan')}
                                    aria-label={translate('Cari biaya')}
                                    value={filter.data.search}
                                    onChange={(event) => filter.setData('search', event.target.value)}
                                    className="h-11 rounded-xl bg-background pl-9 text-base sm:text-sm"
                                />
                            </div>
                        }
                        filters={
                            <>
                                <select
                                    className={dataToolbarControlClass}
                                    value={filter.data.category}
                                    onChange={(event) => filter.setData('category', event.target.value)}
                                    aria-label={translate('Kategori')}
                                >
                                    <option value="">{translate('Semua kategori')}</option>
                                    {categories.map((item) => (
                                        <option key={item.public_id} value={item.public_id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                                <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                    {translate('Dari')}
                                    <input
                                        className={dataToolbarControlClass}
                                        type="date"
                                        value={filter.data.start_date}
                                        onChange={(event) => filter.setData('start_date', event.target.value)}
                                    />
                                </label>
                                <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                    {translate('Sampai')}
                                    <input
                                        className={dataToolbarControlClass}
                                        type="date"
                                        min={filter.data.start_date || undefined}
                                        value={filter.data.end_date}
                                        onChange={(event) => filter.setData('end_date', event.target.value)}
                                    />
                                </label>
                            </>
                        }
                        actions={
                            <>
                                {hasFilters && (
                                    <Button type="button" size="touch" variant="ghost" onClick={resetFilters}>
                                        <RotateCcw className="size-4" aria-hidden="true" /> {translate('Reset')}
                                    </Button>
                                )}
                                <Button type="submit" size="touch" variant="outline">
                                    {translate('Terapkan')}
                                </Button>
                            </>
                        }
                    />

                    {expenses.data.length > 0 && (
                        <RecordListHeader className="grid-cols-[minmax(14rem,1fr)_11rem_11rem_9rem] gap-4">
                            <span>{translate('Dokumen')}</span>
                            <span>{translate('Akun')}</span>
                            <span>{translate('Waktu')}</span>
                            <span className="text-right">{translate('Nominal')}</span>
                        </RecordListHeader>
                    )}

                    {expenses.data.length === 0 ? (
                        <EmptyState
                            icon={ReceiptText}
                            title={translate('Belum ada biaya pada filter ini')}
                            description={hasFilters ? translate('Coba ubah kata kunci atau filter yang digunakan.') : undefined}
                            action={
                                hasFilters ? (
                                    <Button type="button" size="touch" variant="outline" onClick={resetFilters}>
                                        {translate('Reset filter')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div>
                            {expenses.data.map((item) => (
                                <RecordListRow
                                    key={item.public_id}
                                    className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_11rem_11rem_9rem] md:items-center"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-mono text-xs font-semibold text-primary">{item.document_number}</p>
                                        <p className="mt-1 truncate text-sm font-semibold text-foreground">{item.category_name}</p>
                                        {item.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>}
                                    </div>
                                    <div className="flex justify-between gap-3 text-sm md:block">
                                        <span className="text-xs text-muted-foreground md:hidden">{translate('Akun')}</span>
                                        <span className="text-foreground">{item.account_name}</span>
                                    </div>
                                    <div className="flex justify-between gap-3 text-sm md:block">
                                        <span className="text-xs text-muted-foreground md:hidden">{translate('Waktu')}</span>
                                        <span className="text-muted-foreground">{ledgerDateTime(item.occurred_at, timezone)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 md:block md:text-right">
                                        <span className="text-xs text-muted-foreground md:hidden">{translate('Nominal')}</span>
                                        <span className="font-semibold text-destructive tabular-nums">-{money(item.amount)}</span>
                                    </div>
                                </RecordListRow>
                            ))}
                        </div>
                    )}

                    {expenses.links.length > 3 && (
                        <div className="border-t border-border px-3 py-3 sm:px-4">
                            <Pagination links={expenses.links} />
                        </div>
                    )}
                </RecordList>
            </AppPage>

            <ResponsiveDialog
                open={expenseOpen}
                onOpenChange={setExpenseOpen}
                title={translate('Catat biaya')}
                size="md"
                footer={
                    <>
                        <Button type="button" size="touch" variant="outline" onClick={() => setExpenseOpen(false)}>
                            {translate('Batal')}
                        </Button>
                        <Button type="submit" form="expense-form" disabled={expense.processing || remainingBalance < 0} size="touch">
                            {translate(expense.processing ? 'Menyimpan...' : 'Simpan biaya')}
                        </Button>
                    </>
                }
            >
                <form id="expense-form" onSubmit={submitExpense} className="grid gap-4 sm:grid-cols-2">
                    <FormCurrencyInput
                        id="expense-amount"
                        name="amount"
                        label={translate('Nominal')}
                        value={expense.data.amount}
                        onValueChange={(value) => expense.setData('amount', value)}
                        min="0.0001"
                        required
                        error={expense.errors.amount}
                        className="text-lg font-semibold"
                    />
                    <FormSelect
                        id="expense-category"
                        name="category_id"
                        label={translate('Kategori')}
                        required
                        value={expense.data.category_id}
                        onChange={(event) => expense.setData('category_id', event.target.value)}
                        error={expense.errors.category_id}
                    >
                        {activeCategories.map((item) => (
                            <option key={item.public_id} value={item.public_id}>
                                {item.name}
                            </option>
                        ))}
                    </FormSelect>
                    <FormSelect
                        id="expense-account"
                        name="account_id"
                        label={translate('Bayar dari akun')}
                        required
                        value={expense.data.account_id}
                        onChange={(event) => expense.setData('account_id', event.target.value)}
                        error={expense.errors.account_id}
                    >
                        {accounts.map((item) => (
                            <option key={item.public_id} value={item.public_id}>
                                {item.name} · {money(item.balance)}
                            </option>
                        ))}
                    </FormSelect>
                    <FormInput
                        id="expense-occurred-at"
                        name="occurred_at"
                        type="datetime-local"
                        label={translate('Waktu')}
                        required
                        value={expense.data.occurred_at}
                        onChange={(event) => expense.setData('occurred_at', event.target.value)}
                        error={expense.errors.occurred_at}
                    />
                    <FormTextarea
                        id="expense-notes"
                        name="notes"
                        label={translate('Catatan')}
                        description={translate('Opsional')}
                        maxLength={500}
                        placeholder={translate('Contoh: tagihan listrik Agustus')}
                        value={expense.data.notes}
                        onChange={(event) => expense.setData('notes', event.target.value)}
                        error={expense.errors.notes}
                        className="min-h-20"
                    />
                    <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl bg-secondary sm:col-span-2">
                        <Calculation label="Saldo awal" value={money(selectedAccount?.balance ?? 0)} />
                        <Calculation label="Biaya" value={`-${money(amount)}`} />
                        <Calculation label="Saldo akhir" value={money(remainingBalance)} danger={remainingBalance < 0} />
                    </div>
                    <div className="sm:col-span-2">
                        <AlertError errors={Object.values(expense.errors)} />
                    </div>
                </form>
            </ResponsiveDialog>

            <ResponsiveDialog open={categoryOpen} onOpenChange={setCategoryOpen} title={translate('Kategori biaya')} size="sm">
                <form onSubmit={submitCategory} className="flex items-end gap-2 border-b border-border pb-5">
                    <div className="min-w-0 flex-1">
                        <FormInput
                            id="expense-category-name"
                            name="name"
                            label={translate('Nama kategori')}
                            required
                            maxLength={120}
                            placeholder={translate('Contoh: Listrik')}
                            value={category.data.name}
                            onChange={(event) => category.setData('name', event.target.value)}
                            error={category.errors.name}
                        />
                    </div>
                    <Button size="touch" disabled={category.processing} className="shrink-0">
                        <Plus className="size-4" aria-hidden="true" /> {translate('Tambah')}
                    </Button>
                </form>
                <div className="divide-y divide-border">
                    {categories.map((item) => (
                        <div key={item.public_id} className="flex min-h-14 items-center justify-between gap-3">
                            <p className="min-w-0 truncate text-sm font-medium text-foreground">{item.name}</p>
                            <Button
                                type="button"
                                variant={item.is_active ? 'secondary' : 'outline'}
                                size="touch"
                                className="shrink-0"
                                onClick={() =>
                                    router.patch(
                                        updateExpenseCategory.url(item.public_id),
                                        { name: item.name, is_active: !item.is_active },
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                {translate(item.is_active ? 'Aktif' : 'Nonaktif')}
                            </Button>
                        </div>
                    ))}
                    {categories.length === 0 && (
                        <p className="py-10 text-center text-sm text-muted-foreground">{translate('Belum ada kategori')}</p>
                    )}
                </div>
            </ResponsiveDialog>
        </>
    );
}

function SummaryItem({ icon: Icon, label, value, meta }: { icon: typeof ReceiptText; label: string; value: string; meta?: string }) {
    return (
        <div className="min-w-0 border-border p-4 odd:border-r max-lg:border-b lg:border-r lg:last:border-r-0 lg:[&:nth-child(n+3)]:border-b-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="size-4 text-primary" aria-hidden="true" /> {translate(label)}
            </div>
            <p className="mt-2 truncate text-lg font-semibold text-foreground tabular-nums" title={value}>
                {value}
            </p>
            {meta && <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>}
        </div>
    );
}

function Calculation({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
    return (
        <div className="min-w-0 px-2 py-3 text-center">
            <p className="truncate text-xs text-muted-foreground">{translate(label)}</p>
            <p
                className={`mt-1 truncate text-sm font-semibold tabular-nums ${danger ? 'text-destructive' : 'text-foreground'}`}
                title={value}
            >
                {value}
            </p>
        </div>
    );
}
