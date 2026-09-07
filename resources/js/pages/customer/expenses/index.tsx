import { Head, router, useForm } from '@inertiajs/react';
import {
    CalendarDays,
    CircleDollarSign,
    Filter,
    Plus,
    ReceiptText,
    Search,
    Tags,
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
    postingToken,
} from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { currencySymbol, localeTag } from '@/lib/currency';

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
    const selectedAccount = accounts.find(
        (item) => item.public_id === expense.data.account_id,
    );
    const amount = Number(expense.data.amount || 0);
    const remainingBalance = Number(selectedAccount?.balance ?? 0) - amount;
    const hasFilters = Object.values(filters).some((value) => value !== '');
    const canPost = activeCategories.length > 0 && accounts.length > 0;

    const submitCategory = (event: FormEvent) => {
        event.preventDefault();
        category.post('/expenses/categories', {
            preserveScroll: true,
            onSuccess: () => category.reset(),
        });
    };

    const submitExpense = (event: FormEvent) => {
        event.preventDefault();
        expense.post('/expenses', {
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
        router.get('/expenses', filter.data, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Biaya" />
            <main className="min-h-full bg-[linear-gradient(180deg,#f7faf8_0%,#f1f5f3_100%)] px-3 py-3 sm:px-5 lg:px-6">
                <div className="mx-auto max-w-7xl space-y-3">
                    <header className="relative overflow-hidden rounded-2xl border border-teal-950/10 bg-[var(--app-ink)] px-4 py-4 text-white shadow-[0_12px_32px_rgba(18,61,54,0.13)] sm:px-5">
                        <div className="absolute -top-16 right-0 size-44 rounded-full bg-teal-300/15 blur-2xl" />
                        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-xs font-black tracking-[0.18em] text-amber-300 uppercase">
                                    Operasional
                                </p>
                                <h1 className="mt-0.5 text-xl font-black tracking-[-0.04em] sm:text-2xl">
                                    Biaya toko
                                </h1>
                            </div>
                            <div className="grid grid-cols-1 gap-2 min-[375px]:grid-cols-2">
                                <button
                                    type="button"
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15"
                                    onClick={() => setCategoryOpen(true)}
                                >
                                    <Tags className="size-4" /> Kategori
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-sm font-black text-[var(--app-ink)] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={!canPost}
                                    onClick={() => setExpenseOpen(true)}
                                >
                                    <Plus className="size-4" /> Catat biaya
                                </button>
                            </div>
                        </div>
                    </header>

                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <MetricCard
                            icon={<CircleDollarSign className="size-5" />}
                            label="Total terfilter"
                            value={money(summary.total)}
                            tone="rose"
                        />
                        <MetricCard
                            icon={<ReceiptText className="size-5" />}
                            label="Transaksi"
                            value={summary.count.toLocaleString(localeTag())}
                            tone="teal"
                        />
                        <MetricCard
                            icon={<Tags className="size-5" />}
                            label="Kategori terbesar"
                            value={summary.largest_category?.name ?? '-'}
                            meta={
                                summary.largest_category
                                    ? money(summary.largest_category.total)
                                    : undefined
                            }
                            tone="amber"
                        />
                        <MetricCard
                            icon={<WalletCards className="size-5" />}
                            label="Saldo akun aktif"
                            value={money(summary.account_balance)}
                            tone="blue"
                        />
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
                        <form onSubmit={applyFilter} className="space-y-2.5">
                            <div className="flex items-center gap-2 text-sm font-black text-stone-800">
                                <Filter className="size-4 text-teal-700" />{' '}
                                Filter
                            </div>
                            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_150px_150px_auto]">
                                <label className="relative">
                                    <span className="sr-only">Cari biaya</span>
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
                                    <input
                                        className={`${fieldClass} pl-9`}
                                        placeholder="Cari dokumen atau catatan"
                                        value={filter.data.search}
                                        onChange={(event) =>
                                            filter.setData(
                                                'search',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <label>
                                    <span className="sr-only">Kategori</span>
                                    <select
                                        className={fieldClass}
                                        value={filter.data.category}
                                        onChange={(event) =>
                                            filter.setData(
                                                'category',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="">Semua kategori</option>
                                        {categories.map((item) => (
                                            <option
                                                key={item.public_id}
                                                value={item.public_id}
                                            >
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <Field label="Dari">
                                    <input
                                        className={fieldClass}
                                        type="date"
                                        value={filter.data.start_date}
                                        onChange={(event) =>
                                            filter.setData(
                                                'start_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Sampai">
                                    <input
                                        className={fieldClass}
                                        type="date"
                                        min={
                                            filter.data.start_date || undefined
                                        }
                                        value={filter.data.end_date}
                                        onChange={(event) =>
                                            filter.setData(
                                                'end_date',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <div className="flex gap-2 sm:col-span-2 lg:col-span-1 lg:self-end">
                                    {hasFilters && (
                                        <button
                                            type="button"
                                            className="h-10 flex-1 rounded-xl border border-stone-300 px-3 text-sm font-bold text-stone-700 hover:bg-stone-50 lg:flex-none"
                                            onClick={() =>
                                                router.get(
                                                    '/expenses',
                                                    {},
                                                    { replace: true },
                                                )
                                            }
                                        >
                                            Reset
                                        </button>
                                    )}
                                    <button
                                        className={`${buttonClass} flex-1 lg:flex-none`}
                                    >
                                        Terapkan
                                    </button>
                                </div>
                            </div>
                            <FormErrors errors={filter.errors} />
                        </form>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5">
                            <div>
                                <h2 className="text-lg font-black tracking-[-0.025em] text-stone-900">
                                    Riwayat biaya
                                </h2>
                                <p className="text-xs font-semibold text-stone-500">
                                    {expenses.total.toLocaleString(localeTag())}{' '}
                                    dokumen
                                </p>
                            </div>
                            <CalendarDays className="size-5 text-teal-700" />
                        </div>

                        <div className="divide-y divide-stone-100 md:hidden">
                            {expenses.data.map((item) => (
                                <article
                                    key={item.public_id}
                                    className="space-y-2.5 p-3.5"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-mono text-xs font-bold text-teal-800">
                                                {item.document_number}
                                            </p>
                                            <p className="mt-1 truncate text-sm font-bold text-stone-900">
                                                {item.category_name}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-black text-rose-700">
                                            -{money(item.amount)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                        <span>{item.account_name}</span>
                                        <span>
                                            {ledgerDateTime(
                                                item.occurred_at,
                                                timezone,
                                            )}
                                        </span>
                                    </div>
                                    {item.notes && (
                                        <p className="text-sm break-words text-stone-600">
                                            {item.notes}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-stone-50 text-xs font-black tracking-wide text-stone-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-2.5">Dokumen</th>
                                        <th className="px-3 py-2.5">
                                            Kategori
                                        </th>
                                        <th className="px-3 py-2.5">Akun</th>
                                        <th className="px-3 py-2.5">Waktu</th>
                                        <th className="px-4 py-2.5 text-right">
                                            Nominal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {expenses.data.map((item) => (
                                        <tr
                                            key={item.public_id}
                                            className="hover:bg-stone-50/70"
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-mono text-xs font-bold text-teal-800">
                                                    {item.document_number}
                                                </p>
                                                {item.notes && (
                                                    <p className="mt-1 max-w-64 truncate text-xs text-stone-500">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 font-semibold text-stone-900">
                                                {item.category_name}
                                            </td>
                                            <td className="px-3 py-3 text-stone-600">
                                                {item.account_name}
                                            </td>
                                            <td className="px-3 py-3 text-stone-600">
                                                {ledgerDateTime(
                                                    item.occurred_at,
                                                    timezone,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-rose-700">
                                                -{money(item.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {expenses.data.length === 0 && (
                            <div className="px-4 py-14 text-center">
                                <ReceiptText className="mx-auto size-8 text-stone-300" />
                                <p className="mt-3 text-sm font-bold text-stone-600">
                                    Belum ada biaya pada filter ini
                                </p>
                            </div>
                        )}
                        {expenses.links.length > 3 && (
                            <div className="border-t border-stone-200 px-4 py-4 sm:px-5">
                                <Pagination links={expenses.links} />
                            </div>
                        )}
                    </section>
                </div>
            </main>

            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-stone-200 bg-white p-0 shadow-2xl sm:max-w-lg">
                    <DialogHeader className="border-b border-stone-200 px-4 py-4 pr-12 text-left sm:px-5">
                        <DialogTitle className="text-lg font-black tracking-[-0.03em] text-[var(--app-ink)]">
                            Catat biaya
                        </DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={submitExpense}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5">
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-sm font-bold text-stone-700">
                                    Nominal
                                </label>
                                <div className="flex h-12 items-center overflow-hidden rounded-xl border border-stone-300 bg-white focus-within:border-teal-700 focus-within:ring-2 focus-within:ring-teal-700/15">
                                    <span className="border-r border-stone-200 bg-stone-50 px-3 text-sm font-black text-stone-600">
                                        {currencySymbol()}
                                    </span>
                                    <input
                                        className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-lg font-black text-stone-900 outline-none"
                                        type="number"
                                        min="0.0001"
                                        step="0.0001"
                                        required
                                        autoFocus
                                        placeholder="0"
                                        value={expense.data.amount}
                                        onChange={(event) =>
                                            expense.setData(
                                                'amount',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                            <Field label="Kategori">
                                <select
                                    className={fieldClass}
                                    required
                                    value={expense.data.category_id}
                                    onChange={(event) =>
                                        expense.setData(
                                            'category_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    {activeCategories.map((item) => (
                                        <option
                                            key={item.public_id}
                                            value={item.public_id}
                                        >
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Bayar dari akun">
                                <select
                                    className={fieldClass}
                                    required
                                    value={expense.data.account_id}
                                    onChange={(event) =>
                                        expense.setData(
                                            'account_id',
                                            event.target.value,
                                        )
                                    }
                                >
                                    {accounts.map((item) => (
                                        <option
                                            key={item.public_id}
                                            value={item.public_id}
                                        >
                                            {item.name} - {money(item.balance)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <div className="sm:col-span-2">
                                <Field label="Waktu">
                                    <input
                                        className={fieldClass}
                                        type="datetime-local"
                                        required
                                        value={expense.data.occurred_at}
                                        onChange={(event) =>
                                            expense.setData(
                                                'occurred_at',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </div>
                            <label className="space-y-1 text-sm font-bold text-stone-700 sm:col-span-2">
                                Catatan{' '}
                                <span className="font-normal text-stone-400">
                                    (opsional)
                                </span>
                                <textarea
                                    className={`${fieldClass} min-h-20 resize-y py-2.5`}
                                    maxLength={500}
                                    placeholder="Contoh: tagihan listrik Agustus"
                                    value={expense.data.notes}
                                    onChange={(event) =>
                                        expense.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <div className="grid grid-cols-1 divide-y divide-teal-900/10 rounded-xl border border-teal-900/10 bg-[#fff3ef] px-1 py-1 text-[var(--app-ink)] min-[375px]:grid-cols-3 min-[375px]:divide-x min-[375px]:divide-y-0 min-[375px]:py-3 sm:col-span-2">
                                <Calculation
                                    label="Saldo awal"
                                    value={money(selectedAccount?.balance ?? 0)}
                                />
                                <Calculation
                                    label="Biaya"
                                    value={`-${money(amount)}`}
                                />
                                <Calculation
                                    label="Saldo akhir"
                                    value={money(remainingBalance)}
                                    danger={remainingBalance < 0}
                                />
                            </div>
                            <FormErrors errors={expense.errors} />
                        </div>
                        <div className="flex flex-col-reverse gap-2 border-t border-stone-200 bg-white px-4 py-3 min-[375px]:flex-row min-[375px]:justify-end sm:px-5">
                            <button
                                type="button"
                                className="h-10 rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-700 hover:bg-stone-50"
                                onClick={() => setExpenseOpen(false)}
                            >
                                Batal
                            </button>
                            <button
                                className={buttonClass}
                                disabled={
                                    expense.processing || remainingBalance < 0
                                }
                            >
                                {expense.processing
                                    ? 'Menyimpan...'
                                    : 'Simpan biaya'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
                <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-stone-200 bg-white p-0 shadow-2xl sm:max-w-md">
                    <DialogHeader className="border-b border-stone-200 px-4 py-4 pr-12 text-left sm:px-5">
                        <DialogTitle className="text-lg font-black tracking-[-0.03em] text-[var(--app-ink)]">
                            Kategori biaya
                        </DialogTitle>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <form
                            onSubmit={submitCategory}
                            className="space-y-3 border-b border-stone-200 p-4 sm:p-5"
                        >
                            <div className="flex flex-col gap-3 min-[375px]:flex-row min-[375px]:items-end">
                                <div className="min-w-0 flex-1">
                                    <Field label="Nama kategori">
                                        <input
                                            className={fieldClass}
                                            required
                                            maxLength={120}
                                            placeholder="Contoh: Listrik"
                                            value={category.data.name}
                                            onChange={(event) =>
                                                category.setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                                <button
                                    className={`${buttonClass} inline-flex shrink-0 items-center justify-center gap-2`}
                                    disabled={category.processing}
                                >
                                    <Plus className="size-4" /> Tambah
                                </button>
                            </div>
                            <FormErrors errors={category.errors} />
                        </form>
                        <div className="divide-y divide-stone-100">
                            {categories.map((item) => (
                                <div
                                    key={item.public_id}
                                    className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-stone-900">
                                            {item.name}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className={`h-9 shrink-0 rounded-full px-3 text-xs font-black transition ${
                                            item.is_active
                                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                                        }`}
                                        onClick={() =>
                                            router.patch(
                                                `/expenses/categories/${item.public_id}`,
                                                {
                                                    name: item.name,
                                                    is_active: !item.is_active,
                                                },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                                    </button>
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <p className="px-5 py-10 text-center text-sm font-semibold text-stone-500">
                                    Belum ada kategori
                                </p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

function MetricCard({
    icon,
    label,
    value,
    meta,
    tone,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    meta?: string;
    tone: 'rose' | 'teal' | 'amber' | 'blue';
}) {
    const tones = {
        rose: 'bg-rose-50 text-rose-700',
        teal: 'bg-teal-50 text-teal-700',
        amber: 'bg-amber-50 text-amber-700',
        blue: 'bg-sky-50 text-sky-700',
    };

    return (
        <article className="min-w-0 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            <div className={`inline-flex rounded-lg p-1.5 ${tones[tone]}`}>
                {icon}
            </div>
            <p className="mt-2 text-[10px] font-black tracking-wide text-stone-500 uppercase">
                {label}
            </p>
            <p
                className="mt-0.5 truncate text-sm font-black tracking-[-0.025em] text-stone-900 sm:text-lg"
                title={value}
            >
                {value}
            </p>
            {meta && (
                <p className="mt-0.5 truncate text-xs font-bold text-stone-500">
                    {meta}
                </p>
            )}
        </article>
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
        <div className="flex min-w-0 items-center justify-between px-3 py-2 min-[375px]:block min-[375px]:px-2 min-[375px]:py-0 min-[375px]:text-center">
            <p className="text-[10px] font-bold tracking-wide text-stone-500 uppercase">
                {label}
            </p>
            <p
                className={`truncate text-xs font-black min-[375px]:mt-1 sm:text-sm ${danger ? 'text-rose-600' : 'text-[var(--app-ink)]'}`}
                title={value}
            >
                {value}
            </p>
        </div>
    );
}

function FormErrors({ errors }: { errors: Partial<Record<string, string>> }) {
    if (Object.keys(errors).length === 0) {
        return null;
    }

    return (
        <p className="text-sm font-semibold text-rose-700 sm:col-span-2">
            {Object.values(errors)[0]}
        </p>
    );
}
