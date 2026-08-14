import { Head, router, useForm } from '@inertiajs/react';
import { CreditCard, Plus, ReceiptText, Search, Settings2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { postingToken } from '@/components/operations-shell';
import { money } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';

type Plan = {
    public_id: string;
    code: string;
    name: string;
    description: string | null;
    monthly_price: string;
    max_products: number;
    max_members: number;
    is_default: boolean;
    is_active: boolean;
    subscriptions_count: number;
};
type Subscription = {
    public_id: string;
    status: string;
    starts_at: string;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    notes: string | null;
    store: {
        public_id: string;
        name: string;
        owner_name: string;
        owner_email: string;
    };
    plan: { public_id: string; name: string };
};
type Payment = {
    public_id: string;
    receipt_number: string;
    amount: string;
    period_start: string;
    period_end: string;
    payment_method: string;
    external_reference: string | null;
    paid_at: string;
    store: { public_id: string; name: string };
};
type Paginated<T> = {
    data: T[];
    links: PaginationLink[];
    total: number;
};

const inputClass =
    'h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#9b741e] focus:ring-2 focus:ring-[#d7a941]/20';
const buttonClass =
    'h-10 rounded-xl bg-[#102b31] px-4 text-sm font-bold text-white transition hover:bg-[#173e46] disabled:opacity-50';

export default function AdminSubscriptions({
    plans,
    subscriptions,
    payments,
    filters,
}: {
    plans: Plan[];
    subscriptions: Paginated<Subscription>;
    payments: Payment[];
    filters: { search: string; status: string };
}) {
    const create = useForm({
        code: '',
        name: '',
        description: '',
        monthly_price: '0',
        max_products: '100',
        max_members: '5',
        is_default: false,
        is_active: true,
    });
    const filter = useForm(filters);
    const submitCreate = (event: FormEvent) => {
        event.preventDefault();
        create.post('/super-admin/plans', {
            preserveScroll: true,
            onSuccess: () => create.reset(),
        });
    };
    const submitFilter = (event: FormEvent) => {
        event.preventDefault();
        router.get('/super-admin/subscriptions', filter.data, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Subscription Platform" />
            <header className="overflow-hidden rounded-3xl bg-[#102b31] px-6 py-8 text-white md:px-9">
                <p className="text-xs font-bold tracking-[0.24em] text-[#e9c96f] uppercase">
                    Commercial control
                </p>
                <h1 className="mt-3 max-w-3xl font-serif text-4xl tracking-tight md:text-5xl">
                    Paket, akses, dan pembayaran dalam satu jejak.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                    Kelola metadata komersial tanpa membuka data operasional
                    tenant. Semua perubahan sensitif tercatat pada audit
                    platform.
                </p>
            </header>

            <section className="mt-7 grid gap-6 xl:grid-cols-[.7fr_1.3fr]">
                <form
                    onSubmit={submitCreate}
                    className="rounded-3xl border border-slate-900/10 bg-white/75 p-5 md:p-6"
                >
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-[#d7a941]/20 p-3 text-[#725515]">
                            <Plus className="size-5" />
                        </span>
                        <div>
                            <h2 className="font-serif text-2xl">Paket baru</h2>
                            <p className="text-xs text-slate-500">
                                Nilai 0 pada limit berarti tak terbatas.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <Field label="Kode">
                            <input
                                className={inputClass}
                                required
                                value={create.data.code}
                                onChange={(event) =>
                                    create.setData('code', event.target.value)
                                }
                                placeholder="starter"
                            />
                        </Field>
                        <Field label="Nama">
                            <input
                                className={inputClass}
                                required
                                value={create.data.name}
                                onChange={(event) =>
                                    create.setData('name', event.target.value)
                                }
                                placeholder="Starter"
                            />
                        </Field>
                        <Field label="Harga bulanan">
                            <input
                                className={inputClass}
                                type="number"
                                min="0"
                                step="0.0001"
                                required
                                value={create.data.monthly_price}
                                onChange={(event) =>
                                    create.setData(
                                        'monthly_price',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field label="Maks. produk">
                            <input
                                className={inputClass}
                                type="number"
                                min="0"
                                required
                                value={create.data.max_products}
                                onChange={(event) =>
                                    create.setData(
                                        'max_products',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field label="Maks. anggota">
                            <input
                                className={inputClass}
                                type="number"
                                min="0"
                                required
                                value={create.data.max_members}
                                onChange={(event) =>
                                    create.setData(
                                        'max_members',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                        <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
                            <input
                                type="checkbox"
                                checked={create.data.is_default}
                                onChange={(event) =>
                                    create.setData(
                                        'is_default',
                                        event.target.checked,
                                    )
                                }
                            />{' '}
                            Jadikan default
                        </label>
                        <label className="space-y-1 text-sm font-semibold sm:col-span-2">
                            Deskripsi
                            <textarea
                                className={`${inputClass} min-h-20 py-2`}
                                value={create.data.description}
                                onChange={(event) =>
                                    create.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <Error errors={create.errors} />
                    <button
                        className={`${buttonClass} mt-4 w-full`}
                        disabled={create.processing}
                    >
                        Buat paket
                    </button>
                </form>

                <div className="rounded-3xl border border-slate-900/10 bg-white/75 p-5 md:p-6">
                    <div className="flex items-center gap-3">
                        <Settings2 className="size-5 text-[#8a681e]" />
                        <div>
                            <h2 className="font-serif text-2xl">
                                Katalog paket
                            </h2>
                            <p className="text-xs text-slate-500">
                                {plans.length} paket tersedia.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        {plans.map((plan) => (
                            <PlanEditor key={plan.public_id} plan={plan} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-7 rounded-3xl border border-slate-900/10 bg-white/75 p-5 md:p-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold tracking-[.2em] text-[#8a681e] uppercase">
                            Tenant billing
                        </p>
                        <h2 className="mt-1 font-serif text-3xl">
                            Subscription toko
                        </h2>
                        <p className="text-sm text-slate-500">
                            {subscriptions.total} subscription terdaftar.
                        </p>
                    </div>
                    <form
                        onSubmit={submitFilter}
                        className="flex flex-col gap-2 sm:flex-row"
                    >
                        <div className="relative">
                            <Search className="absolute top-3 left-3 size-4 text-slate-400" />
                            <input
                                className={`${inputClass} pl-9`}
                                placeholder="Cari toko"
                                value={filter.data.search}
                                onChange={(event) =>
                                    filter.setData('search', event.target.value)
                                }
                            />
                        </div>
                        <select
                            className={inputClass}
                            value={filter.data.status}
                            onChange={(event) =>
                                filter.setData('status', event.target.value)
                            }
                        >
                            <option value="">Semua status</option>
                            {[
                                'trialing',
                                'active',
                                'past_due',
                                'suspended',
                                'cancelled',
                            ].map((status) => (
                                <option key={status}>{status}</option>
                            ))}
                        </select>
                        <button className={buttonClass}>Terapkan</button>
                    </form>
                </div>
                <div className="mt-6 space-y-4">
                    {subscriptions.data.map((subscription) => (
                        <SubscriptionEditor
                            key={subscription.public_id}
                            subscription={subscription}
                            plans={plans.filter((plan) => plan.is_active)}
                        />
                    ))}
                </div>
                <div className="mt-6">
                    <Pagination links={subscriptions.links} />
                </div>
            </section>

            <section className="mt-7 rounded-3xl border border-slate-900/10 bg-white/75 p-5 md:p-7">
                <div className="flex items-center gap-3">
                    <ReceiptText className="size-5 text-[#8a681e]" />
                    <div>
                        <h2 className="font-serif text-3xl">
                            Pembayaran terbaru
                        </h2>
                        <p className="text-sm text-slate-500">
                            20 receipt terakhir lintas tenant.
                        </p>
                    </div>
                </div>
                <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b text-xs text-slate-500 uppercase">
                            <tr>
                                <th className="px-3 py-3">Receipt</th>
                                <th className="px-3 py-3">Toko</th>
                                <th className="px-3 py-3">Periode</th>
                                <th className="px-3 py-3">Metode</th>
                                <th className="px-3 py-3 text-right">
                                    Nominal
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/8">
                            {payments.map((payment) => (
                                <tr key={payment.public_id}>
                                    <td className="px-3 py-4 font-mono font-semibold">
                                        {payment.receipt_number}
                                    </td>
                                    <td className="px-3 py-4">
                                        {payment.store.name}
                                    </td>
                                    <td className="px-3 py-4">
                                        {shortDate(payment.period_start)} -{' '}
                                        {shortDate(payment.period_end)}
                                    </td>
                                    <td className="px-3 py-4">
                                        {payment.payment_method.replaceAll(
                                            '_',
                                            ' ',
                                        )}
                                    </td>
                                    <td className="px-3 py-4 text-right font-bold">
                                        {money(payment.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function PlanEditor({ plan }: { plan: Plan }) {
    const form = useForm({
        code: plan.code,
        name: plan.name,
        description: plan.description ?? '',
        monthly_price: plan.monthly_price,
        max_products: String(plan.max_products),
        max_members: String(plan.max_members),
        is_default: plan.is_default,
        is_active: plan.is_active,
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(`/super-admin/plans/${plan.public_id}`, {
            preserveScroll: true,
        });
    };

    return (
        <form
            onSubmit={submit}
            className={`rounded-2xl border p-4 ${plan.is_default ? 'border-[#d7a941] bg-[#fff9e8]' : 'border-slate-200 bg-white'}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-serif text-xl">{plan.name}</p>
                    <p className="font-mono text-xs text-slate-500">
                        {plan.code} · {plan.subscriptions_count} toko
                    </p>
                </div>
                {plan.is_default && (
                    <span className="rounded-full bg-[#d7a941] px-2 py-1 text-[10px] font-bold uppercase">
                        Default
                    </span>
                )}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <input
                    className={inputClass}
                    value={form.data.name}
                    onChange={(event) =>
                        form.setData('name', event.target.value)
                    }
                />
                <input
                    className={inputClass}
                    value={form.data.code}
                    onChange={(event) =>
                        form.setData('code', event.target.value)
                    }
                />
                <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.0001"
                    value={form.data.monthly_price}
                    onChange={(event) =>
                        form.setData('monthly_price', event.target.value)
                    }
                />
                <input
                    className={inputClass}
                    type="number"
                    min="0"
                    value={form.data.max_products}
                    onChange={(event) =>
                        form.setData('max_products', event.target.value)
                    }
                />
                <input
                    className={inputClass}
                    type="number"
                    min="0"
                    value={form.data.max_members}
                    onChange={(event) =>
                        form.setData('max_members', event.target.value)
                    }
                />
                <div className="flex flex-col justify-center gap-1 text-xs">
                    <label>
                        <input
                            type="checkbox"
                            checked={form.data.is_default}
                            onChange={(event) =>
                                form.setData('is_default', event.target.checked)
                            }
                        />{' '}
                        Default
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(event) =>
                                form.setData('is_active', event.target.checked)
                            }
                        />{' '}
                        Aktif
                    </label>
                </div>
            </div>
            <textarea
                className={`${inputClass} mt-2 min-h-16 py-2`}
                value={form.data.description}
                onChange={(event) =>
                    form.setData('description', event.target.value)
                }
            />
            <Error errors={form.errors} />
            <button
                className={`${buttonClass} mt-3 w-full`}
                disabled={form.processing}
            >
                Simpan paket
            </button>
        </form>
    );
}

function SubscriptionEditor({
    subscription,
    plans,
}: {
    subscription: Subscription;
    plans: Plan[];
}) {
    const form = useForm({
        plan_id: subscription.plan.public_id,
        status: subscription.status,
        starts_at: dateInput(subscription.starts_at),
        trial_ends_at: dateInput(subscription.trial_ends_at),
        current_period_start: dateInput(subscription.current_period_start),
        current_period_end: dateInput(subscription.current_period_end),
        notes: subscription.notes ?? '',
    });
    const today = new Date().toISOString().slice(0, 10);
    const payment = useForm({
        amount:
            plans.find((plan) => plan.public_id === form.data.plan_id)
                ?.monthly_price ?? '0',
        period_start: today,
        period_end: today,
        payment_method: 'bank_transfer',
        external_reference: '',
        paid_at: `${today}T12:00`,
        notes: '',
        idempotency_key: postingToken(),
    });
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(`/super-admin/subscriptions/${subscription.public_id}`, {
            preserveScroll: true,
        });
    };
    const submitPayment = (event: FormEvent) => {
        event.preventDefault();
        payment.post(
            `/super-admin/subscriptions/${subscription.public_id}/payments`,
            {
                preserveScroll: true,
                onSuccess: () => {
                    payment.reset('external_reference', 'notes');
                    payment.setData('idempotency_key', postingToken());
                },
            },
        );
    };

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-2 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="font-serif text-xl">
                        {subscription.store.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                        {subscription.store.owner_name} ·{' '}
                        {subscription.store.owner_email}
                    </p>
                </div>
                <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${subscription.status === 'active' || subscription.status === 'trialing' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                >
                    {subscription.status}
                </span>
            </div>
            <div className="mt-4 grid gap-5 xl:grid-cols-2">
                <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
                    <select
                        className={inputClass}
                        value={form.data.plan_id}
                        onChange={(event) =>
                            form.setData('plan_id', event.target.value)
                        }
                    >
                        {plans.map((plan) => (
                            <option key={plan.public_id} value={plan.public_id}>
                                {plan.name}
                            </option>
                        ))}
                    </select>
                    <select
                        className={inputClass}
                        value={form.data.status}
                        onChange={(event) =>
                            form.setData('status', event.target.value)
                        }
                    >
                        {[
                            'trialing',
                            'active',
                            'past_due',
                            'suspended',
                            'cancelled',
                        ].map((status) => (
                            <option key={status}>{status}</option>
                        ))}
                    </select>
                    <DateField
                        label="Mulai"
                        value={form.data.starts_at}
                        onChange={(value) => form.setData('starts_at', value)}
                    />
                    <DateField
                        label="Trial selesai"
                        value={form.data.trial_ends_at}
                        onChange={(value) =>
                            form.setData('trial_ends_at', value)
                        }
                    />
                    <DateField
                        label="Periode mulai"
                        value={form.data.current_period_start}
                        onChange={(value) =>
                            form.setData('current_period_start', value)
                        }
                    />
                    <DateField
                        label="Periode selesai"
                        value={form.data.current_period_end}
                        onChange={(value) =>
                            form.setData('current_period_end', value)
                        }
                    />
                    <input
                        className={`${inputClass} sm:col-span-2`}
                        placeholder="Catatan internal"
                        value={form.data.notes}
                        onChange={(event) =>
                            form.setData('notes', event.target.value)
                        }
                    />
                    <Error errors={form.errors} />
                    <button
                        className={`${buttonClass} sm:col-span-2`}
                        disabled={form.processing}
                    >
                        Perbarui subscription
                    </button>
                </form>
                <form
                    onSubmit={submitPayment}
                    className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2"
                >
                    <p className="text-xs font-bold tracking-wide text-[#8a681e] uppercase sm:col-span-2">
                        Posting pembayaran
                    </p>
                    <input
                        className={inputClass}
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={payment.data.amount}
                        onChange={(event) =>
                            payment.setData('amount', event.target.value)
                        }
                        placeholder="Nominal"
                    />
                    <select
                        className={inputClass}
                        value={payment.data.payment_method}
                        onChange={(event) =>
                            payment.setData(
                                'payment_method',
                                event.target.value,
                            )
                        }
                    >
                        <option value="bank_transfer">Transfer bank</option>
                        <option value="qris">QRIS</option>
                        <option value="cash">Tunai</option>
                        <option value="other">Lainnya</option>
                    </select>
                    <DateField
                        label="Periode mulai"
                        value={payment.data.period_start}
                        onChange={(value) =>
                            payment.setData('period_start', value)
                        }
                    />
                    <DateField
                        label="Periode selesai"
                        value={payment.data.period_end}
                        onChange={(value) =>
                            payment.setData('period_end', value)
                        }
                    />
                    <input
                        className={inputClass}
                        type="datetime-local"
                        value={payment.data.paid_at}
                        onChange={(event) =>
                            payment.setData('paid_at', event.target.value)
                        }
                    />
                    <input
                        className={inputClass}
                        placeholder="Referensi eksternal"
                        value={payment.data.external_reference}
                        onChange={(event) =>
                            payment.setData(
                                'external_reference',
                                event.target.value,
                            )
                        }
                    />
                    <Error errors={payment.errors} />
                    <button
                        className={`${buttonClass} sm:col-span-2`}
                        disabled={payment.processing}
                    >
                        <CreditCard className="mr-2 inline size-4" />
                        Posting pembayaran
                    </button>
                </form>
            </div>
        </article>
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
        <label className="space-y-1 text-sm font-semibold text-slate-700">
            {label}
            {children}
        </label>
    );
}
function DateField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="space-y-1 text-xs font-semibold text-slate-600">
            {label}
            <input
                className={inputClass}
                type="date"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}
function Error({ errors }: { errors: Partial<Record<string, string>> }) {
    const first = Object.values(errors)[0];

    return first ? (
        <p className="text-xs text-rose-700 sm:col-span-2">{first}</p>
    ) : null;
}
function dateInput(value: string | null) {
    return value?.slice(0, 10) ?? '';
}
function shortDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(value),
    );
}
