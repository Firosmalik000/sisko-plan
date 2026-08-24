import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import {
    CreditCard,
    PackagePlus,
    Pencil,
    ReceiptText,
    RefreshCw,
    Search,
    Store,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { postingToken } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import {
    paginatedRowNumber,
    PlatformTableLeadCell,
    PlatformTableLeadHeader,
} from '@/components/platform-table-lead-cell';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type Plan = {
    public_id: string;
    name: string;
    description: string | null;
    monthly_price: string;
    duration_months: number;
    max_stores: number;
    max_products: number;
    max_members: number;
    is_default: boolean;
    is_trial: boolean;
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
    account: {
        name: string;
        email: string;
        stores_count: number;
    };
    plan: {
        public_id: string;
        name: string;
        monthly_price: string;
        duration_months: number;
        is_active: boolean;
    };
};
type Paginated<T> = {
    data: T[];
    links: PaginationLink[];
    total: number;
    current_page: number;
    per_page: number;
};
type PlanData = {
    name: string;
    description: string;
    monthly_price: string;
    duration_months: string;
    max_stores: string;
    max_products: string;
    max_members: string;
    is_active: boolean;
};

const inputClass =
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8a681e] focus:ring-2 focus:ring-[#d7a941]/20 sm:text-sm';
const primaryButton =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#102b31] px-4 text-sm font-bold text-white transition hover:bg-[#173e46] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a681e] disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a681e] disabled:cursor-not-allowed disabled:opacity-50';
const dialogClass =
    'flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-2xl';
const statusLabels: Record<string, string> = {
    trialing: 'Trial',
    active: 'Aktif',
    past_due: 'Jatuh tempo',
    suspended: 'Ditangguhkan',
    cancelled: 'Dibatalkan',
};
const statusClasses: Record<string, string> = {
    trialing: 'bg-sky-100 text-sky-800',
    active: 'bg-emerald-100 text-emerald-800',
    past_due: 'bg-amber-100 text-amber-800',
    suspended: 'bg-rose-100 text-rose-800',
    cancelled: 'bg-slate-200 text-slate-700',
};
const currency = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export default function AdminSubscriptions({
    plans,
    subscriptions,
    filters,
    access,
}: {
    plans: Plan[];
    subscriptions: Paginated<Subscription>;
    filters: { search: string; status: string };
    access: {
        manage_plans: boolean;
        manage_subscriptions: boolean;
        create_payments: boolean;
        view_payments: boolean;
        activate_all: boolean;
    };
}) {
    const filter = useForm(filters);
    const submitFilter = (event: FormEvent) => {
        event.preventDefault();
        router.get('/super-admin/subscriptions', filter.data, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Subscription & Paket" />
            <header className="platform-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-3xl font-black tracking-tight text-[#0b292f]">
                        Subscription & paket
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {plans.length} paket · {subscriptions.total} akun
                    </p>
                </div>
                <div className="flex flex-col gap-2 min-[480px]:flex-row">
                    {access.activate_all && <ActivateAllDialog />}
                    {access.view_payments && (
                        <Link
                            href="/super-admin/payments"
                            className={secondaryButton}
                        >
                            <ReceiptText className="size-4" />
                            Riwayat pembayaran
                        </Link>
                    )}
                    {access.manage_plans && <CreatePlanDialog />}
                </div>
            </header>

            <section className="platform-panel mt-5 overflow-hidden">
                <SectionHeader
                    title="Katalog paket"
                    count={`${plans.length} paket`}
                />
                {plans.length ? (
                    <div className="divide-y divide-slate-200">
                        {plans.map((plan) => (
                            <PlanRow
                                key={plan.public_id}
                                plan={plan}
                                canManage={access.manage_plans}
                            />
                        ))}
                    </div>
                ) : (
                    <Empty label="Belum ada paket" />
                )}
            </section>

            <section className="platform-panel mt-5 overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-[#0b292f]">
                            Subscription akun
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            {subscriptions.total} akun
                        </p>
                    </div>
                    <form
                        onSubmit={submitFilter}
                        className="flex flex-col gap-2 sm:flex-row"
                    >
                        <label className="relative min-w-0 sm:w-64">
                            <span className="sr-only">Cari akun</span>
                            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-slate-400" />
                            <input
                                className={`${inputClass} pl-9`}
                                placeholder="Cari nama, email, atau toko"
                                value={filter.data.search}
                                onChange={(event) =>
                                    filter.setData('search', event.target.value)
                                }
                            />
                        </label>
                        <label>
                            <span className="sr-only">Status subscription</span>
                            <select
                                className={inputClass}
                                value={filter.data.status}
                                onChange={(event) =>
                                    filter.setData('status', event.target.value)
                                }
                            >
                                <option value="">Semua status</option>
                                {Object.entries(statusLabels).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <button className={primaryButton}>Terapkan</button>
                    </form>
                </div>
                {subscriptions.data.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-sm">
                            <caption className="sr-only">
                                Daftar subscription akun
                            </caption>
                            <thead className="platform-table-head">
                                <tr>
                                    <PlatformTableLeadHeader />
                                    <th className="px-5 py-3.5">Akun</th>
                                    <th className="px-5 py-3.5">Paket</th>
                                    <th className="px-5 py-3.5">Berlaku</th>
                                    <th className="px-5 py-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {subscriptions.data.map(
                                    (subscription, index) => (
                                        <SubscriptionRow
                                            key={subscription.public_id}
                                            subscription={subscription}
                                            plans={plans}
                                            canManage={
                                                access.manage_subscriptions
                                            }
                                            canCreatePayment={
                                                access.create_payments
                                            }
                                            index={paginatedRowNumber(
                                                subscriptions.current_page,
                                                subscriptions.per_page,
                                                index,
                                            )}
                                        />
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty
                        label="Tidak ada subscription pada filter ini"
                        icon
                    />
                )}
                {subscriptions.links.length > 3 && (
                    <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
                        <Pagination links={subscriptions.links} />
                    </div>
                )}
            </section>
        </>
    );
}

function SectionHeader({ title, count }: { title: string; count: string }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-lg font-black text-[#0b292f]">{title}</h2>
            <span className="text-sm font-bold text-slate-500">{count}</span>
        </div>
    );
}

function Empty({ label, icon = false }: { label: string; icon?: boolean }) {
    return (
        <div className="px-4 py-12 text-center sm:px-5">
            {icon && <Store className="mx-auto size-8 text-slate-300" />}
            <p
                className={`${icon ? 'mt-3' : ''}text-sm font-bold text-slate-600`}
            >
                {label}
            </p>
        </div>
    );
}

function ActivateAllDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className={secondaryButton}>
                    <RefreshCw className="size-4" />
                    Aktifkan semua
                </button>
            </DialogTrigger>
            <DialogContent className="gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-md">
                <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 text-left">
                    <DialogTitle className="text-lg font-black text-[#0b292f]">
                        Aktifkan semua subscription?
                    </DialogTitle>
                    <DialogDescription className="mt-2 text-sm text-slate-600">
                        Periode seluruh subscription akan dimulai ulang dari
                        hari ini.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action="/super-admin/subscriptions/activate-all"
                    method="post"
                    onSuccess={() => setOpen(false)}
                >
                    {({ processing }) => (
                        <DialogFooter className="px-5 py-4">
                            <button
                                type="button"
                                className={secondaryButton}
                                disabled={processing}
                                onClick={() => setOpen(false)}
                            >
                                Batal
                            </button>
                            <button
                                className={primaryButton}
                                disabled={processing}
                            >
                                {processing
                                    ? 'Mengaktifkan...'
                                    : 'Aktifkan mulai hari ini'}
                            </button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CreatePlanDialog() {
    const [open, setOpen] = useState(false);
    const form = useForm<PlanData>({
        name: '',
        description: '',
        monthly_price: '0',
        duration_months: '1',
        max_stores: '1',
        max_products: '100',
        max_members: '5',
        is_active: true,
    });
    const changeOpen = modalChange(setOpen, form);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/super-admin/plans', {
            preserveScroll: true,
            onSuccess: () => changeOpen(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogTrigger asChild>
                <button className={primaryButton}>
                    <PackagePlus className="size-4" />
                    Tambah paket
                </button>
            </DialogTrigger>
            <PlanModal
                title="Tambah paket"
                form={form}
                submit={submit}
                close={() => changeOpen(false)}
                submitLabel="Buat paket"
                trial={false}
            />
        </Dialog>
    );
}

function PlanRow({ plan, canManage }: { plan: Plan; canManage: boolean }) {
    const [open, setOpen] = useState(false);
    const form = useForm<PlanData>({
        name: plan.name,
        description: plan.description ?? '',
        monthly_price: plan.monthly_price,
        duration_months: String(plan.duration_months),
        max_stores: String(plan.max_stores),
        max_products: String(plan.max_products),
        max_members: String(plan.max_members),
        is_active: plan.is_active,
    });
    const changeOpen = modalChange(setOpen, form);
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(`/super-admin/plans/${plan.public_id}`, {
            preserveScroll: true,
            onSuccess: () => setOpen(false),
        });
    };

    return (
        <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-black text-[#0b292f]">
                        {plan.name}
                    </h3>
                    {plan.is_default && (
                        <Badge className="bg-[#f5e6b9] text-[#725515]">
                            Default
                        </Badge>
                    )}
                    {plan.is_trial && (
                        <Badge className="bg-sky-100 text-sky-800">Trial</Badge>
                    )}
                    {!plan.is_active && (
                        <Badge className="bg-slate-200 text-slate-700">
                            Nonaktif
                        </Badge>
                    )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="font-semibold">
                        {currency.format(Number(plan.monthly_price))}/bulan
                    </span>
                    <span>{planTerm(plan)}</span>
                    <span>{plan.subscriptions_count} akun</span>
                    <span>{limit(plan.max_stores)} toko / akun</span>
                    <span>{limit(plan.max_products)} produk / akun</span>
                    <span>{limit(plan.max_members)} staf / akun</span>
                </div>
            </div>
            {canManage && (
                <Dialog open={open} onOpenChange={changeOpen}>
                    <DialogTrigger asChild>
                        <button className={secondaryButton}>
                            <Pencil className="size-4" />
                            Edit paket
                        </button>
                    </DialogTrigger>
                    <PlanModal
                        title={`Edit ${plan.name}`}
                        form={form}
                        submit={submit}
                        close={() => changeOpen(false)}
                        submitLabel="Simpan paket"
                        trial={plan.is_trial}
                    />
                </Dialog>
            )}
        </div>
    );
}

function PlanModal({
    title,
    form,
    submit,
    close,
    submitLabel,
    trial,
}: {
    title: string;
    form: InertiaFormProps<PlanData>;
    submit: (event: FormEvent) => void;
    close: () => void;
    submitLabel: string;
    trial: boolean;
}) {
    return (
        <DialogContent className={dialogClass}>
            <ModalHeader
                title={title}
                description="Form pengaturan paket subscription."
            />
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5">
                    <Field label="Nama paket">
                        <input
                            className={inputClass}
                            required
                            maxLength={120}
                            autoFocus
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                        />
                    </Field>
                    <Field label="Harga bulanan">
                        <input
                            className={inputClass}
                            type="number"
                            min="0"
                            step="0.0001"
                            required
                            disabled={trial}
                            value={form.data.monthly_price}
                            onChange={(event) =>
                                form.setData(
                                    'monthly_price',
                                    event.target.value,
                                )
                            }
                        />
                    </Field>
                    <Field label={trial ? 'Durasi trial' : 'Periode paket'}>
                        <select
                            className={inputClass}
                            required
                            disabled={trial}
                            value={form.data.duration_months}
                            onChange={(event) =>
                                form.setData(
                                    'duration_months',
                                    event.target.value,
                                )
                            }
                        >
                            {trial ? (
                                <option value="1">30 hari</option>
                            ) : (
                                Array.from({ length: 12 }, (_, index) => {
                                    const months = index + 1;

                                    return (
                                        <option key={months} value={months}>
                                            {months} bulan
                                        </option>
                                    );
                                })
                            )}
                        </select>
                    </Field>
                    <Field label="Maksimum toko per akun">
                        <input
                            className={inputClass}
                            type="number"
                            min="0"
                            max="4294967295"
                            required
                            value={form.data.max_stores}
                            onChange={(event) =>
                                form.setData('max_stores', event.target.value)
                            }
                        />
                    </Field>
                    <Field label="Maksimum produk per akun">
                        <input
                            className={inputClass}
                            type="number"
                            min="0"
                            max="4294967295"
                            required
                            value={form.data.max_products}
                            onChange={(event) =>
                                form.setData('max_products', event.target.value)
                            }
                        />
                    </Field>
                    <Field label="Maksimum staf per akun">
                        <input
                            className={inputClass}
                            type="number"
                            min="0"
                            max="4294967295"
                            required
                            value={form.data.max_members}
                            onChange={(event) =>
                                form.setData('max_members', event.target.value)
                            }
                        />
                    </Field>
                    {!trial && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 sm:self-end sm:pb-2">
                            <Check
                                label="Paket aktif"
                                checked={form.data.is_active}
                                change={(value) =>
                                    form.setData('is_active', value)
                                }
                            />
                        </div>
                    )}
                    <div className="sm:col-span-2">
                        <Field label="Deskripsi (opsional)">
                            <textarea
                                className={`${inputClass} min-h-24 resize-y py-2.5`}
                                maxLength={500}
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>
                    <Errors errors={form.errors} />
                </div>
                <Footer
                    processing={form.processing}
                    close={close}
                    label={submitLabel}
                />
            </form>
        </DialogContent>
    );
}

function SubscriptionRow({
    subscription,
    plans,
    index,
    canManage,
    canCreatePayment,
}: {
    subscription: Subscription;
    plans: Plan[];
    index: number;
    canManage: boolean;
    canCreatePayment: boolean;
}) {
    const [editOpen, setEditOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const eligiblePlans = plans.filter(
        (plan) =>
            plan.is_active || plan.public_id === subscription.plan.public_id,
    );
    const form = useForm({
        plan_id: subscription.plan.public_id,
        status: subscription.status,
        starts_at: dateInput(subscription.starts_at),
        trial_ends_at: dateInput(subscription.trial_ends_at),
        current_period_start: dateInput(subscription.current_period_start),
        current_period_end: dateInput(subscription.current_period_end),
        notes: subscription.notes ?? '',
    });
    const billing = billingPeriod();
    const payment = useForm({
        amount: subscription.plan.monthly_price,
        period_start: billing.start,
        period_end: billing.end,
        payment_method: 'bank_transfer',
        external_reference: '',
        paid_at: localDateTime(),
        notes: '',
        idempotency_key: postingToken(),
    });
    const changeEdit = modalChange(setEditOpen, form);
    const changePayment = (next: boolean) => {
        if (!next && !payment.processing) {
            payment.reset();
            payment.clearErrors();
            payment.setData('idempotency_key', postingToken());
        }

        setPaymentOpen(next);
    };
    const submitEdit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(`/super-admin/subscriptions/${subscription.public_id}`, {
            preserveScroll: true,
            onSuccess: () => setEditOpen(false),
        });
    };
    const submitPayment = (event: FormEvent) => {
        event.preventDefault();
        payment.post(
            `/super-admin/subscriptions/${subscription.public_id}/payments`,
            { preserveScroll: true, onSuccess: () => changePayment(false) },
        );
    };

    return (
        <tr className="align-middle transition-colors hover:bg-slate-50/70">
            <PlatformTableLeadCell
                index={index}
                label={subscription.account.name}
                actions={[
                    ...(canManage
                        ? [
                              {
                                  label: 'Edit subscription',
                                  icon: Pencil,
                                  onSelect: () => setEditOpen(true),
                              },
                          ]
                        : []),
                    ...(canCreatePayment
                        ? [
                              {
                                  label: 'Catat pembayaran',
                                  icon: CreditCard,
                                  onSelect: () => setPaymentOpen(true),
                              },
                          ]
                        : []),
                ]}
            />
            <td className="px-5 py-4">
                <p className="max-w-64 truncate font-black text-[#0b292f]">
                    {subscription.account.name}
                </p>
                <p className="mt-1 max-w-64 truncate text-xs text-slate-500">
                    {subscription.account.email}
                </p>
                <p className="max-w-64 text-xs text-slate-500">
                    {subscription.account.stores_count} toko
                </p>
            </td>
            <td className="px-5 py-4">
                <p className="font-bold text-slate-800">
                    {subscription.plan.name}
                </p>
                {!subscription.plan.is_active && (
                    <p className="mt-1 text-xs font-bold text-amber-700">
                        Paket nonaktif
                    </p>
                )}
            </td>
            <td className="px-5 py-4 text-slate-600">
                <p className="font-semibold text-slate-800">
                    {periodLabel(
                        subscription.status === 'trialing'
                            ? subscription.starts_at
                            : subscription.current_period_start,
                        subscription.status === 'trialing'
                            ? subscription.trial_ends_at
                            : subscription.current_period_end,
                    )}
                </p>
                <p className="mt-1 text-xs">
                    {subscription.status === 'trialing'
                        ? 'Masa trial'
                        : 'Periode langganan'}
                </p>
            </td>
            <td className="px-5 py-4">
                <Badge
                    className={
                        statusClasses[subscription.status] ??
                        statusClasses.cancelled
                    }
                >
                    {statusLabels[subscription.status] ?? subscription.status}
                </Badge>
                <Dialog open={editOpen} onOpenChange={changeEdit}>
                    <DialogContent className={dialogClass}>
                        <ModalHeader
                            title={`Edit subscription ${subscription.account.name}`}
                            description="Pengaturan subscription akun."
                        />
                        <form
                            onSubmit={submitEdit}
                            className="flex min-h-0 flex-1 flex-col"
                        >
                            <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5">
                                <Field label="Paket">
                                    <select
                                        className={inputClass}
                                        required
                                        autoFocus
                                        value={form.data.plan_id}
                                        onChange={(event) =>
                                            form.setData(
                                                'plan_id',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {eligiblePlans.map((plan) => (
                                            <option
                                                key={plan.public_id}
                                                value={plan.public_id}
                                            >
                                                {plan.name}
                                                {!plan.is_active
                                                    ? ' (nonaktif)'
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Status">
                                    <select
                                        className={inputClass}
                                        required
                                        value={form.data.status}
                                        onChange={(event) =>
                                            form.setData(
                                                'status',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {Object.entries(statusLabels).map(
                                            ([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </Field>
                                <DateField
                                    label={
                                        form.data.status === 'trialing'
                                            ? 'Trial mulai'
                                            : 'Tanggal mulai subscription'
                                    }
                                    required
                                    value={form.data.starts_at}
                                    change={(value) =>
                                        form.setData('starts_at', value)
                                    }
                                />
                                {form.data.status === 'trialing' ? (
                                    <DateField
                                        label="Trial selesai"
                                        required
                                        value={form.data.trial_ends_at}
                                        change={(value) =>
                                            form.setData('trial_ends_at', value)
                                        }
                                    />
                                ) : (
                                    <>
                                        <DateField
                                            label={
                                                form.data.status === 'active'
                                                    ? 'Periode mulai'
                                                    : 'Periode mulai (opsional)'
                                            }
                                            required={
                                                form.data.status === 'active'
                                            }
                                            value={
                                                form.data.current_period_start
                                            }
                                            change={(value) =>
                                                form.setData(
                                                    'current_period_start',
                                                    value,
                                                )
                                            }
                                        />
                                        <DateField
                                            label="Periode selesai (opsional)"
                                            value={form.data.current_period_end}
                                            change={(value) =>
                                                form.setData(
                                                    'current_period_end',
                                                    value,
                                                )
                                            }
                                        />
                                    </>
                                )}
                                <div className="sm:col-span-2">
                                    <Field label="Catatan internal (opsional)">
                                        <textarea
                                            className={`${inputClass} min-h-24 resize-y py-2.5`}
                                            maxLength={500}
                                            value={form.data.notes}
                                            onChange={(event) =>
                                                form.setData(
                                                    'notes',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                                <Errors errors={form.errors} />
                            </div>
                            <Footer
                                processing={form.processing}
                                close={() => changeEdit(false)}
                                label="Simpan subscription"
                            />
                        </form>
                    </DialogContent>
                </Dialog>
                <Dialog open={paymentOpen} onOpenChange={changePayment}>
                    <DialogContent className={dialogClass}>
                        <ModalHeader
                            title={`Catat pembayaran ${subscription.account.name}`}
                            description="Pembayaran subscription akun."
                        />
                        <form
                            onSubmit={submitPayment}
                            className="flex min-h-0 flex-1 flex-col"
                        >
                            <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5">
                                <Field label="Nominal">
                                    <input
                                        className={inputClass}
                                        type="number"
                                        min="0.0001"
                                        step="0.0001"
                                        required
                                        autoFocus
                                        value={payment.data.amount}
                                        onChange={(event) =>
                                            payment.setData(
                                                'amount',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Metode pembayaran">
                                    <select
                                        className={inputClass}
                                        required
                                        value={payment.data.payment_method}
                                        onChange={(event) =>
                                            payment.setData(
                                                'payment_method',
                                                event.target.value,
                                            )
                                        }
                                    >
                                        <option value="bank_transfer">
                                            Transfer bank
                                        </option>
                                        <option value="qris">QRIS</option>
                                        <option value="cash">Tunai</option>
                                        <option value="other">Lainnya</option>
                                    </select>
                                </Field>
                                <DateField
                                    label="Periode mulai"
                                    required
                                    value={payment.data.period_start}
                                    change={(value) =>
                                        payment.setData('period_start', value)
                                    }
                                />
                                <DateField
                                    label="Periode selesai"
                                    required
                                    value={payment.data.period_end}
                                    change={(value) =>
                                        payment.setData('period_end', value)
                                    }
                                />
                                <Field label="Waktu pembayaran">
                                    <input
                                        className={inputClass}
                                        type="datetime-local"
                                        required
                                        value={payment.data.paid_at}
                                        onChange={(event) =>
                                            payment.setData(
                                                'paid_at',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field label="Referensi eksternal (opsional)">
                                    <input
                                        className={inputClass}
                                        maxLength={120}
                                        value={payment.data.external_reference}
                                        onChange={(event) =>
                                            payment.setData(
                                                'external_reference',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Field label="Catatan (opsional)">
                                        <textarea
                                            className={`${inputClass} min-h-24 resize-y py-2.5`}
                                            maxLength={500}
                                            value={payment.data.notes}
                                            onChange={(event) =>
                                                payment.setData(
                                                    'notes',
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </Field>
                                </div>
                                <Errors errors={payment.errors} />
                            </div>
                            <Footer
                                processing={payment.processing}
                                close={() => changePayment(false)}
                                label="Posting pembayaran"
                                busyLabel="Memposting..."
                            />
                        </form>
                    </DialogContent>
                </Dialog>
            </td>
        </tr>
    );
}

function ModalHeader({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <DialogHeader className="border-b border-slate-200 px-4 py-4 pr-12 text-left sm:px-5">
            <DialogTitle className="text-lg font-black tracking-[-0.03em] text-[#0b292f]">
                {title}
            </DialogTitle>
            <DialogDescription className="sr-only">
                {description}
            </DialogDescription>
        </DialogHeader>
    );
}
function Footer({
    processing,
    close,
    label,
    busyLabel = 'Menyimpan...',
}: {
    processing: boolean;
    close: () => void;
    label: string;
    busyLabel?: string;
}) {
    return (
        <DialogFooter className="border-t border-slate-200 bg-white px-4 py-3 sm:px-5">
            <button
                type="button"
                className={secondaryButton}
                disabled={processing}
                onClick={close}
            >
                Batal
            </button>
            <button className={primaryButton} disabled={processing}>
                {processing ? busyLabel : label}
            </button>
        </DialogFooter>
    );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            <span>{label}</span>
            {children}
        </label>
    );
}
function DateField({
    label,
    value,
    change,
    required = false,
}: {
    label: string;
    value: string;
    change: (value: string) => void;
    required?: boolean;
}) {
    return (
        <Field label={label}>
            <input
                className={inputClass}
                type="date"
                required={required}
                value={value}
                onChange={(event) => change(event.target.value)}
            />
        </Field>
    );
}
function Check({
    label,
    checked,
    change,
}: {
    label: string;
    checked: boolean;
    change: (value: boolean) => void;
}) {
    return (
        <label className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700">
            <input
                type="checkbox"
                className="size-4 accent-[#102b31]"
                checked={checked}
                onChange={(event) => change(event.target.checked)}
            />
            {label}
        </label>
    );
}
function Badge({
    className,
    children,
}: {
    className: string;
    children: ReactNode;
}) {
    return (
        <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-black ${className}`}
        >
            {children}
        </span>
    );
}
function Errors({ errors }: { errors: Partial<Record<string, string>> }) {
    const messages = [
        ...new Set(
            Object.values(errors).filter((value): value is string =>
                Boolean(value),
            ),
        ),
    ];

    return messages.length ? (
        <div
            role="alert"
            className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2"
        >
            {messages.map((message) => (
                <p key={message}>{message}</p>
            ))}
        </div>
    ) : null;
}
function modalChange<T extends Record<string, unknown>>(
    setOpen: (open: boolean) => void,
    form: InertiaFormProps<T>,
) {
    return (next: boolean) => {
        if (!next && !form.processing) {
            form.reset();
            form.clearErrors();
        }

        setOpen(next);
    };
}
function dateInput(value: string | null) {
    return value?.slice(0, 10) ?? '';
}
function dateParts(value: Date) {
    return Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        })
            .formatToParts(value)
            .map((part) => [part.type, part.value]),
    );
}
function localDateTime() {
    const part = dateParts(new Date());

    return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`;
}
function billingPeriod() {
    const part = dateParts(new Date());
    const last = new Date(Date.UTC(Number(part.year), Number(part.month), 0))
        .getUTCDate()
        .toString()
        .padStart(2, '0');

    return {
        start: `${part.year}-${part.month}-01`,
        end: `${part.year}-${part.month}-${last}`,
    };
}
function formatDate(value: string | null) {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}
function periodLabel(start: string | null, end: string | null) {
    if (!start && !end) {
        return 'Belum ditetapkan';
    }

    return `${formatDate(start)} – ${end ? formatDate(end) : 'tanpa batas akhir'}`;
}
function limit(value: number) {
    return value === 0 ? 'Tak terbatas' : value.toLocaleString('id-ID');
}
function planTerm(plan: Pick<Plan, 'is_trial' | 'duration_months'>) {
    return plan.is_trial ? '30 hari' : `${plan.duration_months} bulan`;
}
