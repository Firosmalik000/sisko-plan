import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { m } from 'framer-motion';
import {
    ArrowRight,
    CalendarDays,
    Check,
    Clock3,
    CreditCard,
    LockKeyhole,
    ScanLine,
    ShieldCheck,
    Store,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    publicEase,
    publicViewport,
    revealClip,
    revealLeft,
    revealRight,
    staggerGroup,
    staggerItem,
} from '@/components/public-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { dashboard, register } from '@/routes';
import stores from '@/routes/stores';

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
    is_current: boolean;
    can_select: boolean;
    disabled_reason: string | null;
};

type Account = {
    has_store: boolean;
    has_subscription: boolean;
    can_access_dashboard: boolean;
    trial_used: boolean;
    current_plan_id: string | null;
    next_period_start: string | null;
};

const currency = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export default function Pricing({
    plans,
    account,
}: {
    plans: Plan[];
    account: Account;
}) {
    const { auth } = usePage().props;
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const form = useForm({ plan_id: '' });
    const scheduled = Boolean(
        account.next_period_start &&
        new Date(`${account.next_period_start}T00:00:00`).getTime() >
            new Date().setHours(0, 0, 0, 0),
    );

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
            <Head title="Paket untuk Setiap Tahap Toko">
                <meta
                    name="description"
                    content="Pilih paket Sisko Plan berdasarkan jumlah toko, produk, dan anggota yang Anda kelola."
                />
            </Head>
            <section className="pricing-hero">
                <div className="ledger-container">
                    <m.div
                        className="pricing-hero-copy"
                        initial="hidden"
                        animate="visible"
                        variants={revealLeft}
                    >
                        <span className="scan-kicker">Paket Sisko Plan</span>
                        <h1>Pilih ruang tumbuh untuk toko Anda.</h1>
                        <p>
                            Mulai dari kebutuhan hari ini. Tingkatkan kapasitas
                            saat produk, anggota, dan toko bertambah.
                        </p>
                    </m.div>
                    <m.div
                        className="pricing-hero-aside"
                        initial="hidden"
                        animate="visible"
                        variants={revealRight}
                    >
                        <span className="pricing-proof-label">
                            Dalam satu akun
                        </span>
                        <m.div
                            className="pricing-proof-flow"
                            variants={staggerGroup}
                        >
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

            <section
                className="pricing-assurance"
                aria-label="Manfaat setiap paket"
            >
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

            <section
                className="pricing-offers"
                aria-labelledby="offers-title"
                id="offers"
            >
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
                                Sesuai cara toko Anda berkembang.
                            </h2>
                        </div>
                        <span>{plans.length} pilihan</span>
                    </m.div>
                    <m.div
                        className="pricing-card-grid"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {plans.map((plan) => (
                            <m.article
                                className={`${plan.is_trial ? 'is-trial' : ''} ${plan.is_current ? 'is-current' : ''} ${plan.disabled_reason ? 'is-disabled' : ''}`.trim()}
                                key={plan.public_id}
                                variants={staggerItem}
                                whileHover={
                                    plan.disabled_reason
                                        ? undefined
                                        : { y: -5, scale: 1.006 }
                                }
                                transition={{
                                    duration: 0.22,
                                    ease: publicEase,
                                }}
                            >
                                <div className="pricing-card-head">
                                    <div className="pricing-card-badges">
                                        {plan.is_trial && (
                                            <span>Trial 30 hari</span>
                                        )}
                                        {plan.is_current && (
                                            <span>Paket saat ini</span>
                                        )}
                                    </div>
                                    <h3>{plan.name}</h3>
                                    {plan.description && (
                                        <p>{plan.description}</p>
                                    )}
                                </div>
                                <div className="pricing-card-price">
                                    <strong>
                                        {Number(plan.monthly_price) === 0
                                            ? 'Gratis'
                                            : currency.format(
                                                  Number(plan.monthly_price),
                                              )}
                                    </strong>
                                    {Number(plan.monthly_price) > 0 && (
                                        <span>/ bulan</span>
                                    )}
                                </div>
                                <ul aria-label={`Kapasitas ${plan.name}`}>
                                    <li>
                                        <Clock3 />
                                        <span>
                                            Masa aktif{' '}
                                            <strong>{planTerm(plan)}</strong>
                                        </span>
                                    </li>
                                    <PlanLimit
                                        value={plan.max_stores}
                                        label="toko per akun"
                                    />
                                    <PlanLimit
                                        value={plan.max_products}
                                        label="produk aktif"
                                    />
                                    <PlanLimit
                                        value={plan.max_members}
                                        label="staf per akun"
                                    />
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
                    {plans.length === 0 && (
                        <div className="pricing-empty">
                            <p>Belum ada paket yang ditawarkan.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="pricing-close">
                <m.div
                    className="ledger-container"
                    initial="hidden"
                    whileInView="visible"
                    viewport={publicViewport}
                    variants={revealClip}
                >
                    <div>
                        <span className="scan-kicker">Mulai lebih rapi</span>
                        <h2>
                            Pilih paketnya. Jalankan toko tanpa catatan yang
                            tercecer.
                        </h2>
                    </div>
                    {account.can_access_dashboard ? (
                        <Link
                            className="ledger-button ledger-button-orange"
                            href={dashboard()}
                        >
                            Buka dashboard <ArrowRight />
                        </Link>
                    ) : (
                        <a
                            className="ledger-button ledger-button-orange"
                            href="#offers"
                        >
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
                <DialogContent className="w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-2xl border-[#d8cebb] bg-[#fffdf8] p-0 sm:max-w-md">
                    <DialogHeader className="border-b border-[#d8cebb] px-5 py-5 pr-12 text-left">
                        <DialogTitle className="text-xl font-black tracking-[-0.03em] text-[#022e27]">
                            Konfirmasi berlangganan
                        </DialogTitle>
                        <DialogDescription className="text-[#5e6964]">
                            {scheduled && account.next_period_start
                                ? `${selectedPlan?.name} akan dimulai ${date(account.next_period_start)} setelah periode sebelumnya selesai.`
                                : `${selectedPlan?.name} akan aktif mulai sekarang.`}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit}>
                        <div className="space-y-4 px-5 py-5">
                            <div className="flex items-end justify-between gap-4">
                                <strong className="text-lg text-[#022e27]">
                                    {selectedPlan?.name}
                                </strong>
                                <span className="font-bold text-[#022e27] tabular-nums">
                                    {selectedPlan &&
                                    Number(selectedPlan.monthly_price) === 0
                                        ? 'Gratis'
                                        : selectedPlan
                                          ? `${currency.format(Number(selectedPlan.monthly_price))}/bulan`
                                          : ''}
                                </span>
                            </div>
                            <p className="flex items-center gap-2 text-sm font-semibold text-[#214b43]">
                                <Clock3 className="size-4 text-[#f05a16]" />
                                Masa aktif{' '}
                                {selectedPlan ? planTerm(selectedPlan) : '—'}.
                            </p>
                            {scheduled && account.next_period_start && (
                                <p className="flex items-center gap-2 text-sm font-semibold text-[#214b43]">
                                    <CalendarDays className="size-4 text-[#f05a16]" />
                                    Mulai {date(account.next_period_start)}
                                </p>
                            )}
                            {form.errors.plan_id && (
                                <p
                                    role="alert"
                                    className="text-sm font-semibold text-red-700"
                                >
                                    {form.errors.plan_id}
                                </p>
                            )}
                        </div>
                        <DialogFooter className="border-t border-[#d8cebb] bg-[#fbf8ef] px-5 py-4 sm:justify-between">
                            <button
                                className="ledger-button border border-[#d8cebb] bg-white text-[#022e27]"
                                type="button"
                                disabled={form.processing}
                                onClick={() => setSelectedPlan(null)}
                            >
                                Batal
                            </button>
                            <button
                                className="ledger-button ledger-button-dark"
                                type="submit"
                                disabled={form.processing}
                            >
                                {form.processing
                                    ? scheduled
                                        ? 'Menjadwalkan...'
                                        : 'Mengaktifkan...'
                                    : scheduled
                                      ? 'Jadwalkan paket'
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
            <Link
                className="ledger-button ledger-button-dark"
                href={register()}
            >
                Buat akun <ArrowRight />
            </Link>
        );
    }

    if (!account.has_store) {
        return (
            <Link
                className="ledger-button ledger-button-dark"
                href={stores.create()}
            >
                Buat toko <ArrowRight />
            </Link>
        );
    }

    if (plan.is_current && account.can_access_dashboard && plan.is_trial) {
        return (
            <Link
                className="ledger-button ledger-button-dark"
                href={dashboard()}
            >
                Buka dashboard <ArrowRight />
            </Link>
        );
    }

    if (plan.can_select) {
        return (
            <button
                className="ledger-button ledger-button-orange"
                type="button"
                onClick={() => openConfirmation(plan)}
            >
                {plan.is_current && account.can_access_dashboard
                    ? 'Perpanjang paket'
                    : account.can_access_dashboard
                      ? 'Jadwalkan paket'
                      : 'Berlangganan'}{' '}
                <ArrowRight />
            </button>
        );
    }

    return (
        <button
            className="ledger-button pricing-disabled-action"
            type="button"
            disabled
        >
            <LockKeyhole /> {plan.disabled_reason ?? 'Tidak tersedia'}
        </button>
    );
}

function PlanLimit({ value, label }: { value: number; label: string }) {
    return (
        <li>
            <Check />
            <span>
                <strong>{formatLimit(value)}</strong> {label}
            </span>
        </li>
    );
}

function formatLimit(value: number) {
    return value === 0 ? 'Tak terbatas' : value.toLocaleString('id-ID');
}

function planTerm(plan: Pick<Plan, 'is_trial' | 'duration_months'>) {
    return plan.is_trial ? '30 hari' : `${plan.duration_months} bulan`;
}

function date(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
        new Date(`${value}T00:00:00`),
    );
}
