import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import type { InertiaFormProps } from '@inertiajs/react';
import { CreditCard, PackagePlus, Pencil, Plus, ReceiptText, RefreshCw, Search, Store, Trash2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { postingToken } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { paginatedRowNumber, PlatformTableLeadCell, PlatformTableLeadHeader } from '@/components/platform-table-lead-cell';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatMoney, localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';

type Plan = {
    public_id: string;
    name: string;
    description: string | null;
    kind: 'base' | 'addon';
    offer_category: OfferCategory | null;
    billing_cycle: 'fixed' | 'lifetime';
    monthly_price: string;
    duration_months: number;
    max_stores: number;
    max_products: number;
    max_members: number;
    max_scans: number;
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
        max_stores: number;
        max_products: number;
        max_members: number;
        max_scans: number;
        is_active: boolean;
    };
    active_addons: Array<{
        public_id: string;
        plan_name: string;
        offer_category: OfferCategory | null;
        stores: number;
        products: number;
        members: number;
        scans: number;
        starts_on: string;
        ends_on: string | null;
    }>;
    scheduled_addons: Subscription['active_addons'];
    assigned_addons: Array<{
        public_id: string;
        plan_id: string;
        plan_name: string;
        plan_is_active: boolean;
        offer_category: OfferCategory | null;
        stores: number;
        products: number;
        members: number;
        scans: number;
        starts_on: string;
        ends_on: string | null;
    }>;
    scheduled_periods: Array<{
        public_id: string;
        plan_name: string;
        monthly_price: string;
        duration_months: number;
        is_trial: boolean;
        period_start: string;
        period_end: string | null;
    }>;
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
    kind: 'base' | 'addon';
    offer_category: OfferCategory | '';
    billing_cycle: 'fixed' | 'lifetime';
    duration_months: string;
    max_stores: string;
    max_products: string;
    max_members: string;
    max_scans: string;
    is_active: boolean;
};
type SubscriptionAddonData = {
    client_id: string;
    public_id: string | null;
    plan_id: string;
    starts_on: string;
    ends_on: string;
};
type SubscriptionFormData = {
    plan_id: string;
    status: string;
    starts_at: string;
    trial_ends_at: string;
    current_period_start: string;
    current_period_end: string;
    notes: string;
    addons: SubscriptionAddonData[];
};

type OfferCategory = 'store_capacity' | 'staff_capacity' | 'scan_capacity' | 'product_capacity' | 'general';

const offerCategoryLabels: Record<OfferCategory, string> = {
    store_capacity: 'Kapasitas toko',
    staff_capacity: 'Kapasitas staf',
    scan_capacity: 'Kuota scan AI',
    product_capacity: 'Kapasitas produk',
    general: 'Paket gabungan',
};

const inputClass =
    'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#b83219] focus:ring-2 focus:ring-[#ff7a59]/20 sm:text-sm';
const primaryButton =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ee4d2d] px-4 text-sm font-bold text-white transition hover:bg-[#d83f22] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b83219] disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b83219] disabled:cursor-not-allowed disabled:opacity-50';
const dialogClass =
    'flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-2xl';
const subscriptionDialogClass =
    'flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-4xl';
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
    const basePlans = plans.filter((plan) => plan.kind === 'base');
    const addonPlans = plans.filter((plan) => plan.kind === 'addon');
    const filterActive = filters.search !== '' || filters.status !== '';
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
            <header className="platform-enter flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                    <h1 className="text-3xl font-black tracking-[-0.03em] text-[#3b211b] sm:text-4xl">Subscription & paket</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold text-slate-500">
                        <span>{localizedQuantity(basePlans.length, 'paket dasar')}</span>
                        <span className="size-1 rounded-full bg-[#ee4d2d]" aria-hidden="true" />
                        <span>{localizedQuantity(addonPlans.length, 'add-on')}</span>
                        <span className="size-1 rounded-full bg-[#ee4d2d]" aria-hidden="true" />
                        <span>{localizedQuantity(subscriptions.total, 'akun')}</span>
                    </div>
                </div>
                <div className="grid gap-2 min-[480px]:grid-cols-2 sm:flex sm:flex-wrap xl:justify-end">
                    {access.activate_all && <ActivateAllDialog />}
                    {access.view_payments && (
                        <Link href="/super-admin/payments" className={secondaryButton}>
                            <ReceiptText className="size-4" />
                            Riwayat pembayaran
                        </Link>
                    )}
                    {access.manage_plans && <CreatePlanDialog />}
                </div>
            </header>

            <section className="platform-panel mt-5 overflow-hidden">
                <SectionHeader title="Katalog paket" count={localizedQuantity(plans.length, 'paket')} />
                {plans.length ? (
                    <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
                        <div className="min-w-0 border-b border-slate-200 lg:border-r lg:border-b-0">
                            <PlanGroupHeader title="Paket dasar" count={basePlans.length} />
                            <div className="divide-y divide-slate-200">
                                {basePlans.map((plan) => (
                                    <PlanRow key={plan.public_id} plan={plan} canManage={access.manage_plans} />
                                ))}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <PlanGroupHeader title="Penawaran add-on" count={addonPlans.length} />
                            <div className="divide-y divide-slate-200">
                                {addonPlans.map((plan) => (
                                    <PlanRow key={plan.public_id} plan={plan} canManage={access.manage_plans} compact />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <Empty label="Belum ada paket" />
                )}
            </section>

            <section className="platform-panel mt-5 overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-slate-200 bg-[#fffdfc] px-4 py-4 sm:px-5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-[#3b211b]">Subscription akun</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{localizedQuantity(subscriptions.total, 'akun')}</p>
                    </div>
                    <form onSubmit={submitFilter} className="grid gap-2 sm:grid-cols-[minmax(15rem,1fr)_11rem_auto] xl:w-auto">
                        <label className="relative min-w-0">
                            <span className="sr-only">Cari akun</span>
                            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-slate-400" />
                            <input
                                className={`${inputClass} pl-9`}
                                placeholder="Cari nama, email, atau toko"
                                value={filter.data.search}
                                onChange={(event) => filter.setData('search', event.target.value)}
                            />
                        </label>
                        <label>
                            <span className="sr-only">Status subscription</span>
                            <select
                                className={inputClass}
                                value={filter.data.status}
                                onChange={(event) => filter.setData('status', event.target.value)}
                            >
                                <option value="">Semua status</option>
                                {Object.entries(statusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {translate(label)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="flex gap-2 sm:contents">
                            <button className={`${primaryButton} flex-1`}>Terapkan</button>
                            {filterActive && (
                                <Link href="/super-admin/subscriptions" className={`${secondaryButton} flex-1 sm:col-span-3`}>
                                    Reset filter
                                </Link>
                            )}
                        </div>
                    </form>
                </div>
                {subscriptions.data.length ? (
                    <div>
                        <table className="w-full text-left text-sm">
                            <caption className="sr-only">Daftar subscription akun</caption>
                            <thead className="hidden bg-[#fff3ef] text-xs font-black tracking-[0.04em] text-[#7c392c] uppercase 2xl:table-header-group">
                                <tr>
                                    <PlatformTableLeadHeader />
                                    <th className="px-5 py-3.5">Akun</th>
                                    <th className="px-5 py-3.5">Paket</th>
                                    <th className="px-5 py-3.5">Berlaku</th>
                                    <th className="px-5 py-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="grid gap-3 bg-slate-50/70 p-3 2xl:table-row-group 2xl:divide-y 2xl:divide-slate-200 2xl:bg-transparent 2xl:p-0">
                                {subscriptions.data.map((subscription, index) => (
                                    <SubscriptionRow
                                        key={subscription.public_id}
                                        subscription={subscription}
                                        plans={plans}
                                        canManage={access.manage_subscriptions}
                                        canCreatePayment={access.create_payments}
                                        index={paginatedRowNumber(subscriptions.current_page, subscriptions.per_page, index)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty label="Tidak ada subscription pada filter ini" icon />
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
            <h2 className="text-lg font-black text-[#3b211b]">{translate(title)}</h2>
            <span className="text-sm font-bold text-slate-500">{count}</span>
        </div>
    );
}

function PlanGroupHeader({ title, count }: { title: string; count: number }) {
    return (
        <div className="flex items-center justify-between gap-3 bg-slate-50/80 px-4 py-2.5 sm:px-5">
            <h3 className="text-xs font-black tracking-[0.04em] text-slate-500 uppercase">{translate(title)}</h3>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-600 shadow-sm">{count}</span>
        </div>
    );
}

function Empty({ label, icon = false }: { label: string; icon?: boolean }) {
    return (
        <div className="px-4 py-12 text-center sm:px-5">
            {icon && <Store className="mx-auto size-8 text-slate-300" />}
            <p className={`${icon ? 'mt-3' : ''}text-sm font-bold text-slate-600`}>{translate(label)}</p>
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
                    <DialogTitle className="text-lg font-black text-[#3b211b]">Aktifkan semua subscription?</DialogTitle>
                    <DialogDescription className="mt-2 text-sm text-slate-600">
                        Periode seluruh subscription akan dimulai ulang dari hari ini.
                    </DialogDescription>
                </DialogHeader>
                <Form action="/super-admin/subscriptions/activate-all" method="post" onSuccess={() => setOpen(false)}>
                    {({ processing }) => (
                        <DialogFooter className="px-5 py-4">
                            <button type="button" className={secondaryButton} disabled={processing} onClick={() => setOpen(false)}>
                                Batal
                            </button>
                            <button className={primaryButton} disabled={processing}>
                                {processing ? 'Mengaktifkan...' : 'Aktifkan mulai hari ini'}
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
        kind: 'base',
        offer_category: '',
        billing_cycle: 'fixed',
        duration_months: '1',
        max_stores: '1',
        max_products: '100',
        max_members: '5',
        max_scans: '100',
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
                kindLocked={false}
                defaultPlan={false}
            />
        </Dialog>
    );
}

function PlanRow({ plan, canManage, compact = false }: { plan: Plan; canManage: boolean; compact?: boolean }) {
    const [open, setOpen] = useState(false);
    const form = useForm<PlanData>({
        name: plan.name,
        description: plan.description ?? '',
        monthly_price: plan.monthly_price,
        kind: plan.kind,
        offer_category: plan.offer_category ?? '',
        billing_cycle: plan.billing_cycle,
        duration_months: String(plan.duration_months),
        max_stores: String(plan.max_stores),
        max_products: String(plan.max_products),
        max_members: String(plan.max_members),
        max_scans: String(plan.max_scans),
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
        <div
            className={`grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 ${compact ? 'hover:bg-violet-50/40' : 'bg-[#fffaf7] hover:bg-[#fff3ef]'}`}
        >
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="min-w-0 truncate text-base font-black text-[#3b211b]">{translate(plan.name)}</h3>
                    {plan.is_default && <Badge className="bg-[#ffe1d8] text-[#9f2f19]">Default</Badge>}
                    {plan.is_trial && <Badge className="bg-sky-100 text-sky-800">Trial</Badge>}
                    {plan.kind === 'addon' && (
                        <Badge className="bg-violet-100 text-violet-800">
                            {translate(plan.offer_category ? offerCategoryLabels[plan.offer_category] : 'Add-on')}
                        </Badge>
                    )}
                    {plan.billing_cycle === 'lifetime' && <Badge className="bg-emerald-100 text-emerald-800">Selamanya</Badge>}
                    {!plan.is_active && <Badge className="bg-slate-200 text-slate-700">Nonaktif</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
                    <span className="font-black text-[#3b211b]">
                        {formatMoney(plan.monthly_price)}
                        {plan.billing_cycle === 'fixed' ? translate('/bulan') : ''}
                    </span>
                    <span>{planTerm(plan)}</span>
                    <span>{localizedQuantity(plan.subscriptions_count, plan.kind === 'addon' ? 'aktivasi' : 'akun')}</span>
                    {(plan.kind === 'base' || plan.max_stores > 0) && <span>{localizedCapacity(plan, plan.max_stores, 'toko')}</span>}
                    {(plan.kind === 'base' || plan.max_products > 0) && <span>{localizedCapacity(plan, plan.max_products, 'produk')}</span>}
                    {(plan.kind === 'base' || plan.max_members > 0) && <span>{localizedCapacity(plan, plan.max_members, 'staf')}</span>}
                    {(plan.kind === 'base' || plan.max_scans > 0) && (
                        <span>{localizedCapacity(plan, plan.max_scans, 'scan AI / bulan')}</span>
                    )}
                </div>
            </div>
            {canManage && (
                <Dialog open={open} onOpenChange={changeOpen}>
                    <DialogTrigger asChild>
                        <button className={`${secondaryButton} w-full sm:w-auto`}>
                            <Pencil className="size-4" />
                            Edit paket
                        </button>
                    </DialogTrigger>
                    <PlanModal
                        title={`${translate('Edit')} ${translate(plan.name)}`}
                        form={form}
                        submit={submit}
                        close={() => changeOpen(false)}
                        submitLabel="Simpan paket"
                        trial={plan.is_trial}
                        kindLocked={plan.is_default || plan.subscriptions_count > 0}
                        defaultPlan={plan.is_default}
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
    kindLocked,
    defaultPlan,
}: {
    title: string;
    form: InertiaFormProps<PlanData>;
    submit: (event: FormEvent) => void;
    close: () => void;
    submitLabel: string;
    trial: boolean;
    kindLocked: boolean;
    defaultPlan: boolean;
}) {
    const addon = form.data.kind === 'addon';

    return (
        <DialogContent className={dialogClass}>
            <ModalHeader title={title} description="Form pengaturan paket subscription." />
            <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5">
                    <Field label="Nama paket">
                        <input
                            className={inputClass}
                            required
                            maxLength={120}
                            autoFocus
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                        />
                    </Field>
                    <Field label="Jenis penawaran">
                        <select
                            className={inputClass}
                            required
                            disabled={kindLocked}
                            value={form.data.kind}
                            onChange={(event) => {
                                const kind = event.target.value as PlanData['kind'];
                                form.setData({
                                    ...form.data,
                                    kind,
                                    offer_category: kind === 'addon' ? form.data.offer_category || 'general' : '',
                                });
                            }}
                        >
                            <option value="base">Paket utama</option>
                            <option value="addon">Add-on kapasitas</option>
                        </select>
                    </Field>
                    {addon && (
                        <Field label="Kategori add-on">
                            <select
                                className={inputClass}
                                required
                                value={form.data.offer_category}
                                onChange={(event) => {
                                    const category = event.target.value as OfferCategory;
                                    const primaryFields: Partial<
                                        Record<
                                            OfferCategory,
                                            keyof Pick<PlanData, 'max_stores' | 'max_products' | 'max_members' | 'max_scans'>
                                        >
                                    > = {
                                        store_capacity: 'max_stores',
                                        product_capacity: 'max_products',
                                        staff_capacity: 'max_members',
                                        scan_capacity: 'max_scans',
                                    };
                                    const primaryField = primaryFields[category];
                                    form.setData({
                                        ...form.data,
                                        offer_category: category,
                                        ...(primaryField
                                            ? {
                                                  max_stores:
                                                      primaryField === 'max_stores' && Number(form.data.max_stores) > 0
                                                          ? form.data.max_stores
                                                          : primaryField === 'max_stores'
                                                            ? '1'
                                                            : '0',
                                                  max_products:
                                                      primaryField === 'max_products' && Number(form.data.max_products) > 0
                                                          ? form.data.max_products
                                                          : primaryField === 'max_products'
                                                            ? '1'
                                                            : '0',
                                                  max_members:
                                                      primaryField === 'max_members' && Number(form.data.max_members) > 0
                                                          ? form.data.max_members
                                                          : primaryField === 'max_members'
                                                            ? '1'
                                                            : '0',
                                                  max_scans:
                                                      primaryField === 'max_scans' && Number(form.data.max_scans) > 0
                                                          ? form.data.max_scans
                                                          : primaryField === 'max_scans'
                                                            ? '1'
                                                            : '0',
                                              }
                                            : {}),
                                    });
                                }}
                            >
                                <option value="" disabled>
                                    Pilih kategori
                                </option>
                                {Object.entries(offerCategoryLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {translate(label)}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}
                    <Field label={form.data.billing_cycle === 'lifetime' ? 'Harga sekali' : 'Harga bulanan'}>
                        <input
                            className={inputClass}
                            type="number"
                            min="0"
                            step="0.0001"
                            required
                            disabled={trial || defaultPlan}
                            value={form.data.monthly_price}
                            onChange={(event) => form.setData('monthly_price', event.target.value)}
                        />
                    </Field>
                    <Field label="Masa berlaku">
                        <select
                            className={inputClass}
                            required
                            disabled={trial || defaultPlan}
                            value={form.data.billing_cycle}
                            onChange={(event) => form.setData('billing_cycle', event.target.value as PlanData['billing_cycle'])}
                        >
                            <option value="fixed">Berperiode</option>
                            <option value="lifetime">Selamanya</option>
                        </select>
                    </Field>
                    {form.data.billing_cycle === 'fixed' && (
                        <Field label={trial ? 'Durasi trial' : 'Periode paket'}>
                            <select
                                className={inputClass}
                                required
                                disabled={trial}
                                value={form.data.duration_months}
                                onChange={(event) => form.setData('duration_months', event.target.value)}
                            >
                                {trial ? (
                                    <option value="1">30 hari</option>
                                ) : (
                                    Array.from({ length: 12 }, (_, index) => {
                                        const months = index + 1;

                                        return (
                                            <option key={months} value={months}>
                                                {localizedQuantity(months, 'bulan')}
                                            </option>
                                        );
                                    })
                                )}
                            </select>
                        </Field>
                    )}
                    {(!addon || ['general', 'store_capacity'].includes(form.data.offer_category)) && (
                        <Field label={addon ? 'Tambahan toko' : 'Maksimum toko per akun'}>
                            <input
                                className={inputClass}
                                type="number"
                                min="0"
                                max="4294967295"
                                required
                                value={form.data.max_stores}
                                onChange={(event) => form.setData('max_stores', event.target.value)}
                            />
                        </Field>
                    )}
                    {(!addon || ['general', 'product_capacity'].includes(form.data.offer_category)) && (
                        <Field label={addon ? 'Tambahan produk' : 'Maksimum produk per akun'}>
                            <input
                                className={inputClass}
                                type="number"
                                min="0"
                                max="4294967295"
                                required
                                value={form.data.max_products}
                                onChange={(event) => form.setData('max_products', event.target.value)}
                            />
                        </Field>
                    )}
                    {(!addon || ['general', 'staff_capacity'].includes(form.data.offer_category)) && (
                        <Field label={addon ? 'Tambahan staf' : 'Maksimum staf per akun'}>
                            <input
                                className={inputClass}
                                type="number"
                                min="0"
                                max="4294967295"
                                required
                                value={form.data.max_members}
                                onChange={(event) => form.setData('max_members', event.target.value)}
                            />
                        </Field>
                    )}
                    {(!addon || ['general', 'scan_capacity'].includes(form.data.offer_category)) && (
                        <Field label={addon ? 'Tambahan scan per bulan' : 'Maksimum scan per bulan'}>
                            <input
                                className={inputClass}
                                type="number"
                                min="0"
                                max="4294967295"
                                required
                                value={form.data.max_scans}
                                onChange={(event) => form.setData('max_scans', event.target.value)}
                            />
                        </Field>
                    )}
                    {!trial && (
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 sm:self-end sm:pb-2">
                            <Check label="Paket aktif" checked={form.data.is_active} change={(value) => form.setData('is_active', value)} />
                        </div>
                    )}
                    <div className="sm:col-span-2">
                        <Field label="Deskripsi (opsional)">
                            <textarea
                                className={`${inputClass} min-h-24 resize-y py-2.5`}
                                maxLength={500}
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                            />
                        </Field>
                    </div>
                    <Errors errors={form.errors} />
                </div>
                <Footer processing={form.processing} close={close} label={submitLabel} />
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
        (plan) => plan.kind === 'base' && (plan.is_active || plan.public_id === subscription.plan.public_id),
    );
    const form = useForm<SubscriptionFormData>({
        plan_id: subscription.plan.public_id,
        status: subscription.status,
        starts_at: dateInput(subscription.starts_at),
        trial_ends_at: dateInput(subscription.trial_ends_at),
        current_period_start: dateInput(subscription.current_period_start),
        current_period_end: dateInput(subscription.current_period_end),
        notes: subscription.notes ?? '',
        addons: subscription.assigned_addons.map((addon) => ({
            client_id: addon.public_id,
            public_id: addon.public_id,
            plan_id: addon.plan_id,
            starts_on: addon.starts_on,
            ends_on: addon.ends_on ?? '',
        })),
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
        payment.post(`/super-admin/subscriptions/${subscription.public_id}/payments`, {
            preserveScroll: true,
            onSuccess: () => changePayment(false),
        });
    };
    const groupedAddons = groupAddons(subscription.active_addons);
    const groupedScheduledAddons = groupAddons(subscription.scheduled_addons);
    const totalLimits = accountLimits(subscription.plan, subscription.active_addons);

    return (
        <tr className="align-middle transition-colors hover:bg-slate-50/70 max-2xl:grid max-2xl:grid-cols-[minmax(0,1fr)_auto] max-2xl:overflow-hidden max-2xl:rounded-xl max-2xl:border max-2xl:border-slate-200 max-2xl:bg-white max-2xl:shadow-sm">
            <PlatformTableLeadCell
                index={index}
                label={subscription.account.name}
                className="max-2xl:col-start-2 max-2xl:row-start-1 max-2xl:w-auto max-2xl:px-4 max-2xl:py-4"
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
            <td className="px-5 py-4 max-2xl:col-start-1 max-2xl:row-start-1 max-2xl:min-w-0 max-2xl:px-4">
                <p className="max-w-64 truncate text-base font-black text-[#3b211b]">{subscription.account.name}</p>
                <p className="mt-1 max-w-64 truncate text-xs font-semibold text-slate-500">{subscription.account.email}</p>
                <p className="mt-1 max-w-64 text-xs font-bold text-[#b83219]">
                    {localizedQuantity(subscription.account.stores_count, 'toko aktif')}
                </p>
            </td>
            <td className="px-5 py-4 max-2xl:col-span-2 max-2xl:border-t max-2xl:border-slate-200 max-2xl:px-4">
                <p className="mb-2 text-xs font-black tracking-[0.04em] text-slate-400 uppercase 2xl:hidden">Paket & add-on</p>
                <p className="font-black text-slate-800">{translate(subscription.plan.name)}</p>
                {!subscription.plan.is_active && <p className="mt-1 text-xs font-bold text-amber-700">Paket nonaktif</p>}
                {subscription.scheduled_periods.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                        {subscription.scheduled_periods.map((period) => (
                            <div key={period.public_id} className="flex min-w-0 items-center gap-2">
                                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                                    Terjadwal
                                </span>
                                <span className="min-w-0 truncate text-sm font-bold text-slate-700">{translate(period.plan_name)}</span>
                            </div>
                        ))}
                    </div>
                )}
                {groupedAddons.length > 0 && (
                    <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
                        <p className="text-xs font-black text-violet-700">
                            {localizedQuantity(subscription.active_addons.length, 'add-on aktif')}
                        </p>
                        {groupedAddons.map((addon) => (
                            <div key={addon.key} className="min-w-0 rounded-lg bg-violet-50 px-3 py-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    {addon.quantity > 1 && (
                                        <span className="shrink-0 rounded-md bg-violet-700 px-1.5 py-0.5 text-xs font-black text-white">
                                            {addon.quantity}×
                                        </span>
                                    )}
                                    <span className="min-w-0 truncate text-sm font-black text-violet-950">
                                        {translate(addon.plan_name)}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs font-semibold text-violet-700">
                                    {addonCapacity(addon)} · {periodLabel(addon.starts_on, addon.ends_on)}
                                </p>
                            </div>
                        ))}
                        <p className="text-xs font-semibold text-slate-500">
                            {translate('Total kapasitas:')} {capacitySummary(totalLimits)}
                        </p>
                    </div>
                )}
                {groupedScheduledAddons.length > 0 && (
                    <div className="mt-3 space-y-2.5 border-t border-slate-200 pt-3">
                        <p className="text-xs font-black text-amber-700">
                            {localizedQuantity(subscription.scheduled_addons.length, 'add-on terjadwal')}
                        </p>
                        {groupedScheduledAddons.map((addon) => (
                            <div key={addon.key} className="min-w-0 rounded-lg bg-amber-50 px-3 py-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    {addon.quantity > 1 && (
                                        <span className="shrink-0 rounded-md bg-amber-700 px-1.5 py-0.5 text-xs font-black text-white">
                                            {addon.quantity}×
                                        </span>
                                    )}
                                    <span className="min-w-0 truncate text-sm font-black text-amber-950">{translate(addon.plan_name)}</span>
                                </div>
                                <p className="mt-1 text-xs font-semibold text-amber-700">
                                    {addonCapacity(addon)} · {periodLabel(addon.starts_on, addon.ends_on)}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </td>
            <td className="px-5 py-4 text-slate-600 max-2xl:border-t max-2xl:border-slate-200 max-2xl:px-4">
                <p className="mb-2 text-xs font-black tracking-[0.04em] text-slate-400 uppercase 2xl:hidden">Masa berlaku</p>
                <p className="font-semibold text-slate-800">
                    {periodLabel(
                        subscription.status === 'trialing' ? subscription.starts_at : subscription.current_period_start,
                        subscription.status === 'trialing' ? subscription.trial_ends_at : subscription.current_period_end,
                    )}
                </p>
                <p className="mt-1 text-xs">{translate(subscription.status === 'trialing' ? 'Masa trial' : 'Periode langganan')}</p>
                {subscription.scheduled_periods.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                        {subscription.scheduled_periods.map((period) => (
                            <div key={period.public_id}>
                                <p className="font-semibold text-amber-800">{periodLabel(period.period_start, period.period_end)}</p>
                                <p className="mt-0.5 text-xs text-amber-700">
                                    {translate(period.plan_name)} ·{' '}
                                    {period.is_trial ? translate('30 hari trial') : localizedQuantity(period.duration_months, 'bulan')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </td>
            <td className="px-5 py-4 max-2xl:flex max-2xl:items-start max-2xl:justify-end max-2xl:border-t max-2xl:border-slate-200 max-2xl:px-4">
                <Badge className={`${statusClasses[subscription.status] ?? statusClasses.cancelled} px-2.5 py-1`}>
                    {translate(statusLabels[subscription.status] ?? subscription.status)}
                </Badge>
                <Dialog open={editOpen} onOpenChange={changeEdit}>
                    <DialogContent className={subscriptionDialogClass}>
                        <ModalHeader title={`Edit subscription ${subscription.account.name}`} description="Pengaturan subscription akun." />
                        <form onSubmit={submitEdit} className="flex min-h-0 flex-1 flex-col">
                            <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5">
                                <Field label="Paket">
                                    <select
                                        className={inputClass}
                                        required
                                        autoFocus
                                        value={form.data.plan_id}
                                        onChange={(event) => form.setData('plan_id', event.target.value)}
                                    >
                                        {eligiblePlans.map((plan) => (
                                            <option key={plan.public_id} value={plan.public_id}>
                                                {translate(plan.name)}
                                                {!plan.is_active ? ' (nonaktif)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Status">
                                    <select
                                        className={inputClass}
                                        required
                                        value={form.data.status}
                                        onChange={(event) => form.setData('status', event.target.value)}
                                    >
                                        {Object.entries(statusLabels).map(([value, label]) => (
                                            <option key={value} value={value}>
                                                {translate(label)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <DateField
                                    label={form.data.status === 'trialing' ? 'Trial mulai' : 'Tanggal mulai subscription'}
                                    required
                                    value={form.data.starts_at}
                                    change={(value) => form.setData('starts_at', value)}
                                />
                                {form.data.status === 'trialing' ? (
                                    <DateField
                                        label="Trial selesai"
                                        required
                                        value={form.data.trial_ends_at}
                                        change={(value) => form.setData('trial_ends_at', value)}
                                    />
                                ) : (
                                    <>
                                        <DateField
                                            label={form.data.status === 'active' ? 'Periode mulai' : 'Periode mulai (opsional)'}
                                            required={form.data.status === 'active'}
                                            value={form.data.current_period_start}
                                            change={(value) => form.setData('current_period_start', value)}
                                        />
                                        <DateField
                                            label="Periode selesai (opsional)"
                                            value={form.data.current_period_end}
                                            change={(value) => form.setData('current_period_end', value)}
                                        />
                                    </>
                                )}
                                <div className="sm:col-span-2">
                                    <Field label="Catatan internal (opsional)">
                                        <textarea
                                            className={`${inputClass} min-h-24 resize-y py-2.5`}
                                            maxLength={500}
                                            value={form.data.notes}
                                            onChange={(event) => form.setData('notes', event.target.value)}
                                        />
                                    </Field>
                                </div>
                                <AddonEditor form={form} plans={plans} />
                                <Errors errors={form.errors} />
                            </div>
                            <Footer processing={form.processing} close={() => changeEdit(false)} label="Simpan subscription" />
                        </form>
                    </DialogContent>
                </Dialog>
                <Dialog open={paymentOpen} onOpenChange={changePayment}>
                    <DialogContent className={dialogClass}>
                        <ModalHeader title={`Catat pembayaran ${subscription.account.name}`} description="Pembayaran subscription akun." />
                        <form onSubmit={submitPayment} className="flex min-h-0 flex-1 flex-col">
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
                                        onChange={(event) => payment.setData('amount', event.target.value)}
                                    />
                                </Field>
                                <Field label="Metode pembayaran">
                                    <select
                                        className={inputClass}
                                        required
                                        value={payment.data.payment_method}
                                        onChange={(event) => payment.setData('payment_method', event.target.value)}
                                    >
                                        <option value="bank_transfer">Transfer bank</option>
                                        <option value="qris">QRIS</option>
                                        <option value="cash">Tunai</option>
                                        <option value="other">Lainnya</option>
                                    </select>
                                </Field>
                                <DateField
                                    label="Periode mulai"
                                    required
                                    value={payment.data.period_start}
                                    change={(value) => payment.setData('period_start', value)}
                                />
                                <DateField
                                    label="Periode selesai"
                                    required
                                    value={payment.data.period_end}
                                    change={(value) => payment.setData('period_end', value)}
                                />
                                <Field label="Waktu pembayaran">
                                    <input
                                        className={inputClass}
                                        type="datetime-local"
                                        required
                                        value={payment.data.paid_at}
                                        onChange={(event) => payment.setData('paid_at', event.target.value)}
                                    />
                                </Field>
                                <Field label="Referensi eksternal (opsional)">
                                    <input
                                        className={inputClass}
                                        maxLength={120}
                                        value={payment.data.external_reference}
                                        onChange={(event) => payment.setData('external_reference', event.target.value)}
                                    />
                                </Field>
                                <div className="sm:col-span-2">
                                    <Field label="Catatan (opsional)">
                                        <textarea
                                            className={`${inputClass} min-h-24 resize-y py-2.5`}
                                            maxLength={500}
                                            value={payment.data.notes}
                                            onChange={(event) => payment.setData('notes', event.target.value)}
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

function AddonEditor({ form, plans }: { form: InertiaFormProps<SubscriptionFormData>; plans: Plan[] }) {
    const activePlans = plans.filter((plan) => plan.kind === 'addon' && plan.is_active);
    const errors = form.errors as Partial<Record<string, string>>;
    const changeAddon = (index: number, changes: Partial<SubscriptionAddonData>) => {
        form.setData(
            'addons',
            form.data.addons.map((addon, addonIndex) => (addonIndex === index ? { ...addon, ...changes } : addon)),
        );
    };
    const addAddon = () => {
        const plan = activePlans[0];

        if (!plan) {
            return;
        }

        const startsOn = todayInput();
        form.setData('addons', [
            ...form.data.addons,
            {
                client_id: crypto.randomUUID(),
                public_id: null,
                plan_id: plan.public_id,
                starts_on: startsOn,
                ends_on: addonEndDate(startsOn, plan),
            },
        ]);
    };
    const previewAddons = form.data.addons.flatMap((addon) => {
        const plan = plans.find((candidate) => candidate.public_id === addon.plan_id);

        return plan
            ? [
                  {
                      ...plan,
                      public_id: addon.client_id,
                      plan_name: plan.name,
                      stores: plan.max_stores,
                      products: plan.max_products,
                      members: plan.max_members,
                      scans: plan.max_scans,
                      starts_on: addon.starts_on,
                      ends_on: addon.ends_on || null,
                  },
              ]
            : [];
    });
    const basePlan = plans.find((plan) => plan.public_id === form.data.plan_id);
    const activePreviewAddons = previewAddons.filter((addon) => activeOn(addon, todayInput()));
    const previewLimits = basePlan ? accountLimits(basePlan, activePreviewAddons) : null;
    const scheduledCount = previewAddons.length - activePreviewAddons.length;

    return (
        <section className="sm:col-span-2" aria-labelledby="subscription-addons-title">
            <div className="flex flex-col gap-3 rounded-xl bg-[#fff3ef] px-4 py-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#ee4d2d] text-white">
                        <PackagePlus className="size-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 id="subscription-addons-title" className="font-black text-[#3b211b]">
                            Add-on akun
                        </h3>
                        <p className="text-xs font-bold text-[#8b4a3a]">
                            {form.data.addons.filter((addon) => addon.public_id).length} tersimpan
                            {form.data.addons.some((addon) => !addon.public_id)
                                ? ` · ${form.data.addons.filter((addon) => !addon.public_id).length} baru`
                                : ''}
                        </p>
                    </div>
                </div>
                <button type="button" className={secondaryButton} disabled={!activePlans.length || form.processing} onClick={addAddon}>
                    <Plus className="size-4" />
                    Tambah add-on
                </button>
            </div>

            {previewLimits && (
                <div className="mt-3 flex flex-col gap-1 rounded-xl border border-[#f0d8d1] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-bold text-slate-500">
                        Kapasitas aktif saat ini{scheduledCount > 0 ? ` · ${scheduledCount} terjadwal` : ''}
                    </p>
                    <p className="text-sm font-black text-[#3b211b]">{capacitySummary(previewLimits)}</p>
                </div>
            )}

            {form.data.addons.length > 0 ? (
                <div className="mt-3 grid gap-3">
                    {form.data.addons.map((addon, index) => {
                        const selectedPlan = plans.find((plan) => plan.public_id === addon.plan_id);
                        const eligiblePlans = plans.filter(
                            (plan) => plan.kind === 'addon' && (plan.is_active || plan.public_id === addon.plan_id),
                        );

                        return (
                            <article key={addon.client_id} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className="text-xs font-black text-slate-500">Add-on {index + 1}</p>
                                    <span
                                        className={`rounded-md px-2 py-1 text-xs font-black ${addon.public_id ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                                    >
                                        {addon.public_id ? 'Tersimpan' : 'Belum disimpan'}
                                    </span>
                                </div>
                                <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                                    <Field label="Paket add-on">
                                        <select
                                            className={inputClass}
                                            required
                                            value={addon.plan_id}
                                            onChange={(event) => {
                                                const nextPlan = plans.find((plan) => plan.public_id === event.target.value);
                                                changeAddon(index, {
                                                    plan_id: event.target.value,
                                                    ends_on: nextPlan ? addonEndDate(addon.starts_on, nextPlan) : addon.ends_on,
                                                });
                                            }}
                                        >
                                            {eligiblePlans.map((plan) => (
                                                <option key={plan.public_id} value={plan.public_id}>
                                                    {translate(plan.name)}
                                                    {!plan.is_active ? ' (nonaktif)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <DateField
                                        label="Mulai"
                                        required
                                        value={addon.starts_on}
                                        change={(startsOn) =>
                                            changeAddon(index, {
                                                starts_on: startsOn,
                                                ends_on: selectedPlan ? addonEndDate(startsOn, selectedPlan) : addon.ends_on,
                                            })
                                        }
                                    />
                                    <DateField
                                        label="Selesai (opsional)"
                                        value={addon.ends_on}
                                        change={(endsOn) => changeAddon(index, { ends_on: endsOn })}
                                    />
                                    <button
                                        type="button"
                                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:opacity-50"
                                        disabled={form.processing}
                                        onClick={() =>
                                            form.setData(
                                                'addons',
                                                form.data.addons.filter((_, addonIndex) => addonIndex !== index),
                                            )
                                        }
                                        aria-label={`Hapus add-on ${index + 1}`}
                                    >
                                        <Trash2 className="size-4" />
                                        <span className="lg:sr-only">Hapus</span>
                                    </button>
                                </div>
                                {selectedPlan && (
                                    <p className="mt-2 text-xs font-semibold text-slate-500">
                                        {addonPlanCapacity(selectedPlan)} · {planTerm(selectedPlan)}
                                    </p>
                                )}
                                {(errors[`addons.${index}.plan_id`] ||
                                    errors[`addons.${index}.starts_on`] ||
                                    errors[`addons.${index}.ends_on`]) && (
                                    <p className="mt-2 text-sm font-semibold text-rose-700">
                                        {errors[`addons.${index}.plan_id`] ??
                                            errors[`addons.${index}.starts_on`] ??
                                            errors[`addons.${index}.ends_on`]}
                                    </p>
                                )}
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                    Belum ada add-on
                </div>
            )}
            <p className="mt-2 text-xs font-semibold text-slate-500">Perubahan kapasitas berlaku setelah subscription disimpan.</p>
            {errors.addons && <p className="mt-2 text-sm font-semibold text-rose-700">{errors.addons}</p>}
        </section>
    );
}

function ModalHeader({ title, description }: { title: string; description: string }) {
    return (
        <DialogHeader className="border-b border-slate-200 px-4 py-4 pr-12 text-left sm:px-5">
            <DialogTitle className="text-lg font-black tracking-[-0.03em] text-[#3b211b]">{translate(title)}</DialogTitle>
            <DialogDescription className="sr-only">{translate(description)}</DialogDescription>
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
            <button type="button" className={secondaryButton} disabled={processing} onClick={close}>
                Batal
            </button>
            <button className={primaryButton} disabled={processing}>
                {translate(processing ? busyLabel : label)}
            </button>
        </DialogFooter>
    );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            <span>{translate(label)}</span>
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
            <input className={inputClass} type="date" required={required} value={value} onChange={(event) => change(event.target.value)} />
        </Field>
    );
}
function Check({ label, checked, change }: { label: string; checked: boolean; change: (value: boolean) => void }) {
    return (
        <label className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700">
            <input
                type="checkbox"
                className="size-4 accent-[#ee4d2d]"
                checked={checked}
                onChange={(event) => change(event.target.checked)}
            />
            {translate(label)}
        </label>
    );
}
function Badge({ className, children }: { className: string; children: ReactNode }) {
    return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${className}`}>{children}</span>;
}
function Errors({ errors }: { errors: Partial<Record<string, string>> }) {
    const messages = [...new Set(Object.values(errors).filter((value): value is string => Boolean(value)))];

    return messages.length ? (
        <div role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 sm:col-span-2">
            {messages.map((message) => (
                <p key={message}>{message}</p>
            ))}
        </div>
    ) : null;
}
function modalChange<T extends Record<string, unknown>>(setOpen: (open: boolean) => void, form: InertiaFormProps<T>) {
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
    const last = new Date(Date.UTC(Number(part.year), Number(part.month), 0)).getUTCDate().toString().padStart(2, '0');

    return {
        start: `${part.year}-${part.month}-01`,
        end: `${part.year}-${part.month}-${last}`,
    };
}
function todayInput() {
    const part = dateParts(new Date());

    return `${part.year}-${part.month}-${part.day}`;
}
function addonEndDate(startsOn: string, plan: Pick<Plan, 'billing_cycle' | 'duration_months'>) {
    if (!startsOn || plan.billing_cycle === 'lifetime') {
        return '';
    }

    const [year, month, day] = startsOn.split('-').map(Number);
    const targetMonthIndex = month - 1 + plan.duration_months;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const targetMonth = targetMonthIndex % 12;
    const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const anniversary = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
    anniversary.setUTCDate(anniversary.getUTCDate() - 1);

    return anniversary.toISOString().slice(0, 10);
}
function formatDate(value: string | null) {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat(localeTag(), {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}
function periodLabel(start: string | null, end: string | null) {
    if (!start && !end) {
        return translate('Belum ditetapkan');
    }

    return `${formatDate(start)} – ${end ? formatDate(end) : translate('tanpa batas akhir')}`;
}
function limit(value: number) {
    return value === 0 ? translate('Tak terbatas') : value.toLocaleString(localeTag());
}
function planTerm(plan: Pick<Plan, 'is_trial' | 'duration_months' | 'billing_cycle'>) {
    return plan.billing_cycle === 'lifetime'
        ? translate('Selamanya')
        : plan.is_trial
          ? translate('30 hari')
          : localizedQuantity(plan.duration_months, 'bulan');
}

function localizedQuantity(value: number, unit: string) {
    return `${value.toLocaleString(localeTag())} ${translate(unit)}`;
}

function localizedCapacity(plan: Pick<Plan, 'kind'>, value: number, unit: string) {
    return `${capacity(plan, value)} ${translate(unit)}`;
}

function capacity(plan: Pick<Plan, 'kind'>, value: number) {
    if (plan.kind === 'addon') {
        return `+${value.toLocaleString(localeTag())}`;
    }

    return limit(value);
}

function addonCapacity(addon: Subscription['active_addons'][number]) {
    return [
        addon.stores > 0 ? `+${localizedQuantity(addon.stores, 'toko')}` : null,
        addon.products > 0 ? `+${localizedQuantity(addon.products, 'produk')}` : null,
        addon.members > 0 ? `+${localizedQuantity(addon.members, 'staf')}` : null,
        addon.scans > 0 ? `+${localizedQuantity(addon.scans, 'scan/bulan')}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
}
function groupAddons(addons: Subscription['active_addons']) {
    const grouped = new Map<string, Subscription['active_addons'][number] & { key: string; quantity: number }>();

    for (const addon of addons) {
        const key = `${addon.plan_name}|${addon.starts_on}|${addon.ends_on ?? ''}`;
        const current = grouped.get(key);

        if (current) {
            current.quantity += 1;
            current.stores += addon.stores;
            current.products += addon.products;
            current.members += addon.members;
            current.scans += addon.scans;
        } else {
            grouped.set(key, { ...addon, key, quantity: 1 });
        }
    }

    return [...grouped.values()];
}
function accountLimits(
    basePlan: Pick<Plan, 'max_stores' | 'max_products' | 'max_members' | 'max_scans'>,
    addons: Array<Pick<Subscription['active_addons'][number], 'stores' | 'products' | 'members' | 'scans'>>,
) {
    const additional = addons.reduce(
        (total, addon) => ({
            stores: total.stores + addon.stores,
            products: total.products + addon.products,
            members: total.members + addon.members,
            scans: total.scans + addon.scans,
        }),
        { stores: 0, products: 0, members: 0, scans: 0 },
    );

    return {
        stores: basePlan.max_stores === 0 ? 0 : basePlan.max_stores + additional.stores,
        products: basePlan.max_products === 0 ? 0 : basePlan.max_products + additional.products,
        members: basePlan.max_members === 0 ? 0 : basePlan.max_members + additional.members,
        scans: basePlan.max_scans === 0 ? 0 : basePlan.max_scans + additional.scans,
    };
}
function activeOn(addon: { starts_on: string; ends_on: string | null }, date: string) {
    return addon.starts_on <= date && (!addon.ends_on || addon.ends_on >= date);
}
function capacitySummary(limits: { stores: number; products: number; members: number; scans: number }) {
    return [
        `${limit(limits.stores)} ${translate('toko')}`,
        `${limit(limits.members)} ${translate('staf')}`,
        `${limit(limits.products)} ${translate('produk')}`,
        `${limit(limits.scans)} ${translate('scan/bulan')}`,
    ].join(' · ');
}
function addonPlanCapacity(plan: Plan) {
    return [
        plan.max_stores > 0 ? `+${localizedQuantity(plan.max_stores, 'toko')}` : null,
        plan.max_products > 0 ? `+${localizedQuantity(plan.max_products, 'produk')}` : null,
        plan.max_members > 0 ? `+${localizedQuantity(plan.max_members, 'staf')}` : null,
        plan.max_scans > 0 ? `+${localizedQuantity(plan.max_scans, 'scan/bulan')}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
}
