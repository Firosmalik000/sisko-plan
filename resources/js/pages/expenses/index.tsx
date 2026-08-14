import { Head, router, useForm } from '@inertiajs/react';
import { CircleDollarSign, Plus, Tags } from 'lucide-react';
import type { FormEvent } from 'react';
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

type Category = {
    public_id: string;
    name: string;
    description: string | null;
    is_active: boolean;
};
type Account = { public_id: string; name: string };
type Expense = {
    public_id: string;
    document_number: string;
    category_name: string;
    account_name: string;
    amount: string;
    occurred_at: string;
    notes: string | null;
};

export default function ExpensesPage({
    categories,
    accounts,
    expenses,
    search,
    categoryFilter,
    timezone,
}: {
    categories: Category[];
    accounts: Account[];
    expenses: { data: Expense[]; links: PaginationLink[]; total: number };
    search: string;
    categoryFilter: string;
    timezone: string;
}) {
    const activeCategories = categories.filter((item) => item.is_active);
    const category = useForm({ name: '', description: '', is_active: true });
    const expense = useForm({
        category_id: activeCategories[0]?.public_id ?? '',
        account_id: accounts[0]?.public_id ?? '',
        amount: '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
    });
    const filter = useForm({ search, category: categoryFilter });

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
            <Head title="Biaya Toko" />
            <main className="min-h-full bg-[radial-gradient(circle_at_8%_2%,rgba(245,158,11,.16),transparent_30%),linear-gradient(145deg,#fffdf6_0%,#f5faf7_52%,#eef8f4_100%)] p-4 md:p-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header className="relative overflow-hidden rounded-[2rem] bg-[#142f2b] px-6 py-8 text-white shadow-xl shadow-emerald-950/15 md:px-10 md:py-10">
                        <div className="absolute -top-24 -right-16 size-72 rounded-full border border-amber-300/20" />
                        <p className="text-xs font-bold tracking-[0.24em] text-amber-300 uppercase">
                            Operasional / Biaya
                        </p>
                        <h1 className="mt-3 max-w-3xl font-serif text-3xl tracking-tight md:text-5xl">
                            Catat uang keluar, pahami biaya sebenarnya.
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/75 md:text-base">
                            Setiap biaya langsung mengurangi akun pilihan dan
                            masuk ke estimasi laba usaha. Dokumen yang sudah
                            diposting tidak dapat diubah.
                        </p>
                    </header>

                    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
                        <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm md:p-7">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                                    <CircleDollarSign className="size-5" />
                                </div>
                                <div>
                                    <h2 className="font-serif text-2xl">
                                        Posting biaya toko
                                    </h2>
                                    <p className="text-sm text-stone-500">
                                        Saldo akun harus mencukupi.
                                    </p>
                                </div>
                            </div>
                            {activeCategories.length > 0 &&
                            accounts.length > 0 ? (
                                <form
                                    onSubmit={submitExpense}
                                    className="mt-6 grid gap-4 md:grid-cols-2"
                                >
                                    <Field label="Kategori">
                                        <select
                                            className={fieldClass}
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
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Nominal">
                                        <input
                                            className={fieldClass}
                                            type="number"
                                            min="0.0001"
                                            step="0.0001"
                                            required
                                            value={expense.data.amount}
                                            onChange={(event) =>
                                                expense.setData(
                                                    'amount',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                    <Field label="Waktu biaya">
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
                                    <label className="space-y-1 text-sm font-semibold text-stone-700 md:col-span-2">
                                        Catatan
                                        <textarea
                                            className={`${fieldClass} min-h-24 py-3`}
                                            value={expense.data.notes}
                                            onChange={(event) =>
                                                expense.setData(
                                                    'notes',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Contoh: listrik toko bulan Agustus"
                                        />
                                    </label>
                                    <FormErrors errors={expense.errors} />
                                    <button
                                        className={`${buttonClass} md:col-span-2`}
                                        disabled={expense.processing}
                                    >
                                        {expense.processing
                                            ? 'Memposting...'
                                            : 'Posting biaya'}
                                    </button>
                                </form>
                            ) : (
                                <div className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
                                    Tambahkan kategori biaya dan pastikan ada
                                    akun keuangan aktif sebelum memposting.
                                </div>
                            )}
                        </section>

                        <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm md:p-7">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-teal-100 p-3 text-teal-800">
                                    <Tags className="size-5" />
                                </div>
                                <div>
                                    <h2 className="font-serif text-2xl">
                                        Kategori biaya
                                    </h2>
                                    <p className="text-sm text-stone-500">
                                        Kelompokkan biaya dengan bahasa
                                        sederhana.
                                    </p>
                                </div>
                            </div>
                            <form
                                onSubmit={submitCategory}
                                className="mt-5 flex flex-col gap-3"
                            >
                                <input
                                    className={fieldClass}
                                    required
                                    maxLength={120}
                                    placeholder="Contoh: Listrik & internet"
                                    value={category.data.name}
                                    onChange={(event) =>
                                        category.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                />
                                <input
                                    className={fieldClass}
                                    maxLength={500}
                                    placeholder="Keterangan singkat (opsional)"
                                    value={category.data.description}
                                    onChange={(event) =>
                                        category.setData(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                />
                                <FormErrors errors={category.errors} />
                                <button
                                    className={`${buttonClass} inline-flex items-center justify-center gap-2`}
                                    disabled={category.processing}
                                >
                                    <Plus className="size-4" /> Tambah kategori
                                </button>
                            </form>
                            <div className="mt-5 space-y-2">
                                {categories.map((item) => (
                                    <div
                                        key={item.public_id}
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 p-3"
                                    >
                                        <div>
                                            <p className="font-semibold text-stone-900">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                {item.description ||
                                                    'Tanpa keterangan'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${item.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}
                                            onClick={() =>
                                                router.patch(
                                                    `/expenses/categories/${item.public_id}`,
                                                    {
                                                        name: item.name,
                                                        description:
                                                            item.description,
                                                        is_active:
                                                            !item.is_active,
                                                    },
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            {item.is_active
                                                ? 'Aktif'
                                                : 'Nonaktif'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm md:p-7">
                        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                            <div>
                                <p className="text-xs font-bold tracking-[0.2em] text-teal-700 uppercase">
                                    Dokumen posted
                                </p>
                                <h2 className="mt-1 font-serif text-3xl">
                                    Riwayat biaya
                                </h2>
                                <p className="text-sm text-stone-500">
                                    {expenses.total} transaksi tersimpan
                                    permanen.
                                </p>
                            </div>
                            <form
                                onSubmit={applyFilter}
                                className="flex flex-col gap-2 sm:flex-row"
                            >
                                <input
                                    className={fieldClass}
                                    placeholder="Cari dokumen/catatan"
                                    value={filter.data.search}
                                    onChange={(event) =>
                                        filter.setData(
                                            'search',
                                            event.target.value,
                                        )
                                    }
                                />
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
                                <button className={buttonClass}>
                                    Terapkan
                                </button>
                            </form>
                        </div>
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="border-b text-xs tracking-wide text-stone-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-3">Dokumen</th>
                                        <th className="px-3 py-3">Kategori</th>
                                        <th className="px-3 py-3">Akun</th>
                                        <th className="px-3 py-3">Waktu</th>
                                        <th className="px-3 py-3 text-right">
                                            Nominal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {expenses.data.map((item) => (
                                        <tr key={item.public_id}>
                                            <td className="px-3 py-4">
                                                <p className="font-mono font-semibold">
                                                    {item.document_number}
                                                </p>
                                                <p className="max-w-xs truncate text-xs text-stone-500">
                                                    {item.notes ||
                                                        'Tanpa catatan'}
                                                </p>
                                            </td>
                                            <td className="px-3 py-4 font-medium">
                                                {item.category_name}
                                            </td>
                                            <td className="px-3 py-4">
                                                {item.account_name}
                                            </td>
                                            <td className="px-3 py-4">
                                                {ledgerDateTime(
                                                    item.occurred_at,
                                                    timezone,
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-right font-bold text-rose-700">
                                                -{money(item.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {expenses.data.length === 0 && (
                                <p className="py-12 text-center text-sm text-stone-500">
                                    Belum ada biaya pada filter ini.
                                </p>
                            )}
                        </div>
                        <div className="mt-5">
                            <Pagination links={expenses.links} />
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="space-y-1 text-sm font-semibold text-stone-700">
            {label}
            {children}
        </label>
    );
}

function FormErrors({ errors }: { errors: Partial<Record<string, string>> }) {
    if (Object.keys(errors).length === 0) {
        return null;
    }

    return (
        <p className="text-sm text-rose-700 md:col-span-2">
            {Object.values(errors)[0]}
        </p>
    );
}
