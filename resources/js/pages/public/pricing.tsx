import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { m } from 'framer-motion';
import { ArrowRight, CalendarDays, Check, Clock3, CreditCard, LockKeyhole, ScanLine, ShieldCheck, Store, Users } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { publicEase, publicViewport, revealClip, revealLeft, revealRight, staggerGroup, staggerItem } from '@/components/public/motion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney, localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import { dashboard, register } from '@/routes';
import stores from '@/routes/stores';

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
    is_current: boolean;
    can_select: boolean;
    disabled_reason: string | null;
};

type OfferCategory = 'store_capacity' | 'staff_capacity' | 'scan_capacity' | 'product_capacity' | 'general';

const categoryCopy: Record<OfferCategory, { title: string; label: string; description: string }> = {
    store_capacity: {
        title: 'Tambah kapasitas toko',
        label: 'Toko',
        description: 'Buka ruang untuk toko berikutnya dalam akun yang sama.',
    },
    staff_capacity: { title: 'Tambah kapasitas staf', label: 'Staf', description: 'Perluas akses tim tanpa mengganti paket utama.' },
    scan_capacity: { title: 'Tambah kuota scan', label: 'Scan', description: 'Lanjutkan pemindaian ketika kuota bulan ini menipis.' },
    product_capacity: {
        title: 'Tambah kapasitas produk',
        label: 'Produk',
        description: 'Sediakan ruang untuk katalog produk yang terus bertambah.',
    },
    general: { title: 'Paket kapasitas gabungan', label: 'Gabungan', description: 'Tambahkan beberapa kapasitas akun dalam satu pilihan.' },
};

type Account = {
    has_store: boolean;
    has_subscription: boolean;
    can_access_dashboard: boolean;
    trial_used: boolean;
    current_plan_id: string | null;
    next_period_start: string | null;
};

export default function Pricing({
    plans,
    account,
    focus_category: focusCategory,
}: {
    plans: Plan[];
    account: Account;
    focus_category: OfferCategory | null;
}) {
    const { auth, branding } = usePage().props;
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const form = useForm({ plan_id: '' });
    const scheduled = Boolean(
        account.next_period_start && new Date(`${account.next_period_start}T00:00:00`).getTime() > new Date().setHours(0, 0, 0, 0),
    );
    const selectedScheduled = selectedPlan?.kind === 'base' && scheduled;
    const focusedCopy = focusCategory ? categoryCopy[focusCategory] : null;
    const offerGroups = [
        {
            key: 'base',
            title: 'Paket utama',
            description: 'Pilih paket berjangka untuk kapasitas operasional yang lebih besar.',
            plans: plans.filter((plan) => plan.kind === 'base'),
        },
        ...(['store_capacity', 'staff_capacity', 'scan_capacity', 'product_capacity', 'general'] as OfferCategory[]).map((category) => ({
            key: category,
            title: categoryCopy[category].title,
            description: categoryCopy[category].description,
            plans: plans.filter((plan) => plan.kind === 'addon' && (plan.offer_category ?? 'general') === category),
        })),
    ].filter((group) => group.plans.length > 0);
    const visibleChoiceCount = focusCategory
        ? plans.filter((plan) => plan.kind === 'addon' && (plan.offer_category ?? 'general') === focusCategory).length
        : plans.length;

    const openConfirmation = (plan: Plan) => {
        form.clearErrors();
        form.setData('plan_id', plan.public_id);
        setSelectedPlan(plan);
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/pricing/subscribe', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Paket untuk Setiap Tahap Toko" />
            <section className="pricing-hero">
                <div className="ledger-container">
                    <m.div className="pricing-hero-copy" initial="hidden" animate="visible" variants={revealLeft}>
                        <span className="scan-kicker">Paket {branding.brand_name}</span>
                        <h1>{focusedCopy ? focusedCopy.title : 'Pilih ruang tumbuh untuk toko Anda.'}</h1>
                        <p>
                            {focusedCopy
                                ? focusedCopy.description
                                : 'Mulai dari kebutuhan hari ini. Tingkatkan kapasitas saat produk, anggota, dan toko bertambah.'}
                        </p>
                    </m.div>
                    <m.div className="pricing-hero-aside" initial="hidden" animate="visible" variants={revealRight}>
                        <span className="pricing-proof-label">Dalam satu akun</span>
                        <m.div className="pricing-proof-flow" variants={staggerGroup}>
                            <m.span variants={staggerItem}>
                                <ScanLine /> Scan
                            </m.span>
                            <i />
                            <m.span variants={staggerItem}>
                                <Store /> Toko
                            </m.span>
                            <i />
                            <m.span variants={staggerItem}>
                                <Users /> Tim
                            </m.span>
                        </m.div>
                        <div className="pricing-proof-total">
                            <span>Operasional terhubung</span>
                            <strong>Kasir · Stok · Kas · Laporan</strong>
                        </div>
                    </m.div>
                </div>
            </section>

            <section className="pricing-assurance" aria-label="Manfaat setiap paket">
                <m.div
                    className="ledger-container"
                    initial="hidden"
                    whileInView="visible"
                    viewport={publicViewport}
                    variants={staggerGroup}
                >
                    <m.span variants={staggerItem}>
                        <ScanLine /> Alur kasir cepat
                    </m.span>
                    <m.span variants={staggerItem}>
                        <ShieldCheck /> Data toko terpisah
                    </m.span>
                    <m.span variants={staggerItem}>
                        <CreditCard /> Kapasitas tertulis jelas
                    </m.span>
                </m.div>
            </section>

            <section className="pricing-offers" aria-labelledby="offers-title" id="offers">
                <div className="ledger-container">
                    <m.div
                        className="pricing-offers-head"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealClip}
                    >
                        <div>
                            <span className="scan-kicker">Pilihan paket</span>
                            <h2 id="offers-title">
                                {focusedCopy ? `Pilihan untuk ${focusedCopy.label.toLowerCase()}` : 'Sesuai cara toko Anda berkembang.'}
                            </h2>
                        </div>
                        <span>
                            {visibleChoiceCount} {translate('pilihan')}
                        </span>
                    </m.div>
                    {offerGroups.length > 1 && (
                        <nav className="pricing-category-nav" aria-label="Kategori penawaran">
                            {offerGroups.map((group) => (
                                <Link
                                    key={group.key}
                                    href={
                                        group.key === 'base'
                                            ? '/pricing#category-base'
                                            : `/pricing?category=${group.key}#category-${group.key}`
                                    }
                                    aria-current={focusCategory === group.key ? 'location' : undefined}
                                >
                                    {group.key === 'base' ? 'Paket utama' : categoryCopy[group.key as OfferCategory].label}
                                </Link>
                            ))}
                        </nav>
                    )}
                    <div className="pricing-offer-groups">
                        {offerGroups.map((group) => (
                            <section
                                id={`category-${group.key}`}
                                className={`pricing-offer-group ${focusCategory === group.key ? 'is-focused' : ''}`}
                                key={group.key}
                                aria-labelledby={`category-${group.key}-title`}
                            >
                                <header className="pricing-offer-group-head">
                                    <div>
                                        <h3 id={`category-${group.key}-title`}>{group.title}</h3>
                                        <p>{group.description}</p>
                                    </div>
                                    <span>
                                        {group.plans.length} {translate('pilihan')}
                                    </span>
                                </header>
                                <m.div
                                    className="pricing-card-grid"
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={publicViewport}
                                    variants={staggerGroup}
                                >
                                    {group.plans.map((plan) => (
                                        <m.article
                                            className={`${plan.kind === 'addon' ? 'is-addon' : ''} ${plan.is_trial ? 'is-trial' : ''} ${plan.is_current ? 'is-current' : ''} ${plan.disabled_reason ? 'is-disabled' : ''}`.trim()}
                                            key={plan.public_id}
                                            variants={staggerItem}
                                            whileHover={plan.disabled_reason ? undefined : { y: -5, scale: 1.006 }}
                                            transition={{
                                                duration: 0.22,
                                                ease: publicEase,
                                            }}
                                        >
                                            <div className="pricing-card-head">
                                                <div className="pricing-card-badges">
                                                    {plan.is_trial && <span>Trial 30 hari</span>}
                                                    {plan.is_current && <span>Paket saat ini</span>}
                                                    {plan.kind === 'addon' && (
                                                        <span>{categoryCopy[plan.offer_category ?? 'general'].label}</span>
                                                    )}
                                                </div>
                                                <h3>{translate(plan.name)}</h3>
                                                {plan.description && <p>{plan.description}</p>}
                                            </div>
                                            <div className="pricing-card-price">
                                                <strong>{priceLabel(plan)}</strong>
                                                {Number(plan.monthly_price) > 0 && plan.billing_cycle === 'fixed' && <span>/ bulan</span>}
                                            </div>
                                            <ul aria-label={`${translate('Kapasitas')} ${translate(plan.name)}`}>
                                                <li>
                                                    <Clock3 />
                                                    <span>
                                                        Masa aktif <strong>{planTerm(plan)}</strong>
                                                    </span>
                                                </li>
                                                {(plan.kind === 'base' || plan.max_stores > 0) && (
                                                    <PlanLimit
                                                        value={plan.max_stores}
                                                        label="toko per akun"
                                                        additional={plan.kind === 'addon'}
                                                    />
                                                )}
                                                {(plan.kind === 'base' || plan.max_products > 0) && (
                                                    <PlanLimit
                                                        value={plan.max_products}
                                                        label="produk aktif"
                                                        additional={plan.kind === 'addon'}
                                                    />
                                                )}
                                                {(plan.kind === 'base' || plan.max_members > 0) && (
                                                    <PlanLimit
                                                        value={plan.max_members}
                                                        label="staf per akun"
                                                        additional={plan.kind === 'addon'}
                                                    />
                                                )}
                                                {(plan.kind === 'base' || plan.max_scans > 0) && (
                                                    <PlanLimit
                                                        value={plan.max_scans}
                                                        label="scan per bulan"
                                                        additional={plan.kind === 'addon'}
                                                    />
                                                )}
                                            </ul>
                                            <PlanAction
                                                plan={plan}
                                                signedIn={Boolean(auth.user)}
                                                account={account}
                                                openConfirmation={openConfirmation}
                                            />
                                        </m.article>
                                    ))}
                                </m.div>
                            </section>
                        ))}
                    </div>
                    {plans.length === 0 && (
                        <div className="pricing-empty">
                            <p>Belum ada paket yang ditawarkan.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="pricing-close">
                <m.div className="ledger-container" initial="hidden" whileInView="visible" viewport={publicViewport} variants={revealClip}>
                    <div>
                        <span className="scan-kicker">Mulai lebih rapi</span>
                        <h2>Pilih paketnya. Jalankan toko tanpa catatan yang tercecer.</h2>
                    </div>
                    {account.can_access_dashboard ? (
                        <Link className="ledger-button ledger-button-orange" href={dashboard()}>
                            Buka dashboard <ArrowRight />
                        </Link>
                    ) : (
                        <a className="ledger-button ledger-button-orange" href="#offers">
                            Lihat paket <ArrowRight />
                        </a>
                    )}
                </m.div>
            </section>

            <Dialog
                open={selectedPlan !== null}
                onOpenChange={(open) => {
                    if (!open && !form.processing) {
                        setSelectedPlan(null);
                    }
                }}
            >
                <DialogContent className="w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border-[#d8cebb] bg-[#fffaf7] p-0 sm:max-w-md">
                    <DialogHeader className="border-b border-[#d8cebb] px-5 py-5 pr-12 text-left">
                        <DialogTitle className="text-xl font-black tracking-[-0.03em] text-[#2d2928]">Konfirmasi berlangganan</DialogTitle>
                        <DialogDescription className="text-[#5e6964]">
                            {selectedScheduled && account.next_period_start
                                ? `${selectedPlan?.name} akan dimulai ${date(account.next_period_start)} setelah periode sebelumnya selesai.`
                                : selectedPlan?.kind === 'addon'
                                  ? `${selectedPlan?.name} akan menambah kapasitas akun mulai sekarang.`
                                  : `${selectedPlan?.name} akan aktif mulai sekarang.`}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="space-y-4 px-5 py-5">
                            <div className="flex items-end justify-between gap-4">
                                <strong className="text-lg text-[#2d2928]">{selectedPlan?.name}</strong>
                                <span className="font-bold text-[#2d2928] tabular-nums">
                                    {selectedPlan ? priceLabel(selectedPlan) : ''}
                                </span>
                            </div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-[#5f5754]">
                                <Clock3 className="size-4 text-[#ee4d2d]" />
                                Masa aktif {selectedPlan ? planTerm(selectedPlan) : '—'}.
                            </p>
                            {selectedScheduled && account.next_period_start && (
                                <p className="flex items-center gap-2 text-sm font-semibold text-[#5f5754]">
                                    <CalendarDays className="size-4 text-[#ee4d2d]" />
                                    Mulai {date(account.next_period_start)}
                                </p>
                            )}
                            {form.errors.plan_id && (
                                <p role="alert" className="text-sm font-semibold text-red-700">
                                    {form.errors.plan_id}
                                </p>
                            )}
                        </div>
                        <DialogFooter className="border-t border-[#d8cebb] bg-[#fbf8ef] px-5 py-4 sm:justify-between">
                            <button
                                className="ledger-button border border-[#d8cebb] bg-white text-[#2d2928]"
                                type="button"
                                disabled={form.processing}
                                onClick={() => setSelectedPlan(null)}
                            >
                                Batal
                            </button>
                            <button className="ledger-button ledger-button-dark" type="submit" disabled={form.processing}>
                                {form.processing
                                    ? selectedScheduled
                                        ? 'Menjadwalkan...'
                                        : 'Mengaktifkan...'
                                    : selectedScheduled
                                      ? 'Jadwalkan paket'
                                      : selectedPlan?.kind === 'addon'
                                        ? 'Tambahkan add-on'
                                        : 'Konfirmasi paket'}{' '}
                                <ArrowRight />
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function PlanAction({
    plan,
    signedIn,
    account,
    openConfirmation,
}: {
    plan: Plan;
    signedIn: boolean;
    account: Account;
    openConfirmation: (plan: Plan) => void;
}) {
    if (!signedIn) {
        return (
            <Link className="ledger-button ledger-button-dark" href={register()}>
                Buat akun <ArrowRight />
            </Link>
        );
    }

    if (!account.has_store) {
        return (
            <Link className="ledger-button ledger-button-dark" href={stores.create()}>
                Buat toko <ArrowRight />
            </Link>
        );
    }

    if (plan.is_current && account.can_access_dashboard && plan.billing_cycle === 'lifetime') {
        return (
            <Link className="ledger-button ledger-button-dark" href={dashboard()}>
                Buka dashboard <ArrowRight />
            </Link>
        );
    }

    if (plan.can_select) {
        return (
            <button className="ledger-button ledger-button-orange" type="button" onClick={() => openConfirmation(plan)}>
                {plan.kind === 'addon'
                    ? 'Tambah kapasitas'
                    : plan.is_current
                      ? 'Perpanjang paket'
                      : account.can_access_dashboard
                        ? 'Pilih paket'
                        : 'Berlangganan'}{' '}
                <ArrowRight />
            </button>
        );
    }

    return (
        <button className="ledger-button pricing-disabled-action" type="button" disabled>
            <LockKeyhole /> {plan.disabled_reason ?? 'Tidak tersedia'}
        </button>
    );
}

function PlanLimit({ value, label, additional = false }: { value: number; label: string; additional?: boolean }) {
    return (
        <li>
            <Check />
            <span>
                <strong>{additional ? `+${value.toLocaleString(localeTag())}` : formatLimit(value)}</strong> {translate(label)}
            </span>
        </li>
    );
}

function formatLimit(value: number) {
    return value === 0 ? 'Tak terbatas' : value.toLocaleString(localeTag());
}

function planTerm(plan: Pick<Plan, 'is_trial' | 'duration_months' | 'billing_cycle'>) {
    if (plan.billing_cycle === 'lifetime') {
        return translate('Selamanya');
    }

    if (plan.is_trial) {
        return translate('30 hari');
    }

    return `${plan.duration_months} ${translate('bulan')}`;
}

function priceLabel(plan: Pick<Plan, 'monthly_price' | 'billing_cycle'>) {
    if (Number(plan.monthly_price) === 0) {
        return translate('Gratis');
    }

    return `${formatMoney(plan.monthly_price)}${plan.billing_cycle === 'lifetime' ? ` ${translate('sekali')}` : ''}`;
}

function date(value: string) {
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`));
}
