import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Building2,
    CheckCircle2,
    CreditCard,
    ReceiptText,
    ShieldCheck,
    Store,
    Users,
} from 'lucide-react';

type Metrics = {
    users: number;
    active_users: number;
    stores: number;
    active_stores: number;
    operational_subscriptions: number;
    monthly_recurring_revenue: string | number;
    payments_this_month: string | number;
    new_users_this_month: number;
    new_stores_this_month: number;
};
type Activity = {
    id: number;
    action: string;
    admin: string;
    created_at: string;
};
type Trend = { label: string; amount: string | number };
type RecentPayment = {
    public_id: string;
    receipt_number: string;
    store: string;
    amount: string;
    paid_at: string;
};
type Security = {
    platform_admins: number;
    super_admins: number;
    two_factor_enabled: number;
};

const currency = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});
const statusLabels: Record<string, string> = {
    trialing: 'Trial',
    active: 'Aktif',
    past_due: 'Jatuh tempo',
    suspended: 'Ditangguhkan',
    cancelled: 'Dibatalkan',
};
const statusColors: Record<string, string> = {
    trialing: 'bg-sky-500',
    active: 'bg-emerald-500',
    past_due: 'bg-amber-500',
    suspended: 'bg-rose-500',
    cancelled: 'bg-slate-400',
};
const actionLabels: Record<string, string> = {
    'platform_admin.created': 'Admin platform ditambahkan',
    'platform_admin.status_updated': 'Status admin diperbarui',
    'user.status_updated': 'Status pengguna diperbarui',
    'store.status_updated': 'Status toko diperbarui',
    'subscription.updated': 'Subscription diperbarui',
    'subscription.payment_posted': 'Pembayaran dicatat',
    'plan.created': 'Paket dibuat',
    'plan.updated': 'Paket diperbarui',
    'admin.2fa_enabled': '2FA admin diaktifkan',
    'admin.2fa_disabled': '2FA admin dinonaktifkan',
    'admin.login': 'Admin masuk',
    'admin.logout': 'Admin keluar',
};

export default function SuperAdminDashboard({
    metrics,
    recent_activity,
    subscription_breakdown,
    payment_trend,
    recent_payments,
    security,
}: {
    metrics: Metrics;
    recent_activity: Activity[];
    subscription_breakdown: Record<string, number>;
    payment_trend: Trend[];
    recent_payments: RecentPayment[];
    security: Security;
}) {
    const maxTrend = Math.max(
        ...payment_trend.map((item) => Number(item.amount)),
        1,
    );
    const totalSubscriptions = Object.values(subscription_breakdown).reduce(
        (total, value) => total + value,
        0,
    );
    const securityCoverage =
        security.platform_admins === 0
            ? 0
            : Math.round(
                  (security.two_factor_enabled / security.platform_admins) *
                      100,
              );

    const cards = [
        {
            label: 'Pengguna',
            value: metrics.users,
            meta: `+${metrics.new_users_this_month} bulan ini`,
            icon: Users,
            href: '/super-admin/users',
        },
        {
            label: 'Tenant toko',
            value: metrics.stores,
            meta: `+${metrics.new_stores_this_month} bulan ini`,
            icon: Building2,
            href: '/super-admin/stores',
        },
        {
            label: 'Subscription operasional',
            value: metrics.operational_subscriptions,
            meta: `${totalSubscriptions} total subscription`,
            icon: CreditCard,
            href: '/super-admin/subscriptions',
        },
        {
            label: 'MRR terhitung',
            value: currency.format(Number(metrics.monthly_recurring_revenue)),
            meta: 'Internal projection',
            icon: Store,
            href: '/super-admin/subscriptions',
        },
    ];

    return (
        <div className="platform-enter">
            <Head title="Dashboard Platform" />
            <section className="relative overflow-hidden rounded-2xl bg-[#0b292f] p-6 text-white shadow-xl shadow-[#0b292f]/15 sm:p-8">
                <div className="absolute -top-24 -right-20 size-72 rounded-full border border-white/10" />
                <div className="absolute -right-8 -bottom-24 size-52 rounded-full bg-[#e3b84f]/10" />
                <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <p className="text-[11px] font-black tracking-[0.2em] text-[#e3b84f] uppercase">
                            Platform command center
                        </p>
                        <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                            Kondisi bisnis dalam satu pandangan.
                        </h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                            Pantau pertumbuhan tenant, kesiapan subscription,
                            penerimaan, dan keamanan operasional platform.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:flex">
                        <HeroMetric
                            label="Penerimaan bulan ini"
                            value={currency.format(
                                Number(metrics.payments_this_month),
                            )}
                        />
                        <HeroMetric
                            label="2FA admin"
                            value={`${securityCoverage}%`}
                        />
                    </div>
                </div>
            </section>

            <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {cards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="platform-panel group p-4 transition hover:-translate-y-0.5 hover:border-[#e3b84f]/60 sm:p-5"
                    >
                        <div className="flex items-start justify-between">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-[#0b292f] text-white">
                                <card.icon className="size-5" />
                            </span>
                            <ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-[#9b741e]" />
                        </div>
                        <p className="mt-5 truncate text-2xl font-black tracking-tight text-[#0b292f]">
                            {card.value}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                            {card.label}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-400">
                            {card.meta}
                        </p>
                    </Link>
                ))}
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
                <article className="platform-panel p-5 sm:p-6">
                    <PanelHeader
                        kicker="Revenue pulse"
                        title="Tren penerimaan 6 bulan"
                        href="/super-admin/payments"
                    />
                    <div className="mt-6 flex h-52 items-end gap-3 border-b border-[#0b292f]/10 px-1">
                        {payment_trend.map((item) => {
                            const height = Math.max(
                                (Number(item.amount) / maxTrend) * 100,
                                Number(item.amount) > 0 ? 8 : 2,
                            );

                            return (
                                <div
                                    key={item.label}
                                    className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                                >
                                    <span className="hidden text-[10px] font-bold text-[#0b292f] group-hover:block">
                                        {currency.format(Number(item.amount))}
                                    </span>
                                    <div
                                        className="w-full max-w-14 rounded-t-lg bg-[#0b292f] transition group-hover:bg-[#e3b84f]"
                                        style={{ height: `${height}%` }}
                                    />
                                    <span className="pb-3 text-[11px] font-bold text-slate-500">
                                        {item.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </article>

                <article className="platform-panel p-5 sm:p-6">
                    <PanelHeader
                        kicker="Billing state"
                        title="Status subscription"
                        href="/super-admin/subscriptions"
                    />
                    <div className="mt-5 space-y-4">
                        {Object.entries(subscription_breakdown).map(
                            ([status, count]) => {
                                const width =
                                    totalSubscriptions === 0
                                        ? 0
                                        : (count / totalSubscriptions) * 100;

                                return (
                                    <div key={status}>
                                        <div className="mb-1.5 flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-600">
                                                {statusLabels[status] ?? status}
                                            </span>
                                            <span className="font-black text-[#0b292f]">
                                                {count}
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-full rounded-full ${statusColors[status] ?? 'bg-slate-400'}`}
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            },
                        )}
                    </div>
                </article>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_.72fr]">
                <article className="platform-panel overflow-hidden">
                    <div className="p-5 pb-3">
                        <PanelHeader
                            kicker="Cash in"
                            title="Pembayaran terbaru"
                            href="/super-admin/payments"
                        />
                    </div>
                    {recent_payments.length === 0 ? (
                        <EmptyState text="Belum ada pembayaran." />
                    ) : (
                        <div className="divide-y divide-[#0b292f]/8">
                            {recent_payments.map((payment) => (
                                <div
                                    key={payment.public_id}
                                    className="flex items-center gap-3 px-5 py-3.5"
                                >
                                    <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                        <ReceiptText className="size-4" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold">
                                            {payment.store}
                                        </p>
                                        <p className="truncate font-mono text-[10px] text-slate-400">
                                            {payment.receipt_number}
                                        </p>
                                    </div>
                                    <p className="text-sm font-black text-[#0b292f]">
                                        {currency.format(
                                            Number(payment.amount),
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </article>

                <article className="platform-panel overflow-hidden">
                    <div className="p-5 pb-3">
                        <PanelHeader
                            kicker="Audit stream"
                            title="Aktivitas admin"
                        />
                    </div>
                    {recent_activity.length === 0 ? (
                        <EmptyState text="Belum ada aktivitas." />
                    ) : (
                        <div className="divide-y divide-[#0b292f]/8">
                            {recent_activity.slice(0, 5).map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 px-5 py-3.5"
                                >
                                    <span className="size-2 rounded-full bg-[#e3b84f]" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold">
                                            {actionLabels[item.action] ??
                                                item.action}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            {item.admin} ·{' '}
                                            {relativeDate(item.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </article>

                <article className="overflow-hidden rounded-2xl bg-[#0b292f] p-5 text-white shadow-lg shadow-[#0b292f]/10">
                    <p className="text-[10px] font-black tracking-[.18em] text-[#e3b84f] uppercase">
                        Security posture
                    </p>
                    <div className="mt-5 flex items-center justify-between">
                        <ShieldCheck className="size-9 text-[#e3b84f]" />
                        <span className="text-3xl font-black">
                            {securityCoverage}%
                        </span>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full rounded-full bg-[#e3b84f]"
                            style={{ width: `${securityCoverage}%` }}
                        />
                    </div>
                    <div className="mt-5 space-y-2 text-xs text-slate-300">
                        <p className="flex justify-between">
                            <span>Admin platform</span>
                            <strong className="text-white">
                                {security.platform_admins}
                            </strong>
                        </p>
                        <p className="flex justify-between">
                            <span>Super Admin</span>
                            <strong className="text-white">
                                {security.super_admins}
                            </strong>
                        </p>
                        <p className="flex justify-between">
                            <span>2FA aktif</span>
                            <strong className="text-white">
                                {security.two_factor_enabled}
                            </strong>
                        </p>
                    </div>
                    <Link
                        href="/super-admin/security"
                        className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold hover:bg-white/15"
                    >
                        <CheckCircle2 className="size-4" />
                        Kelola keamanan
                    </Link>
                </article>
            </section>
        </div>
    );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-36 rounded-xl border border-white/10 bg-white/8 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
                {label}
            </p>
            <p className="mt-2 text-xl font-black text-white">{value}</p>
        </div>
    );
}
function PanelHeader({
    kicker,
    title,
    href,
}: {
    kicker: string;
    title: string;
    href?: string;
}) {
    return (
        <div className="flex items-end justify-between gap-3">
            <div>
                <p className="platform-kicker">{kicker}</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-[#0b292f]">
                    {title}
                </h2>
            </div>
            {href && (
                <Link
                    href={href}
                    className="text-xs font-bold text-[#8a681e] hover:underline"
                >
                    Lihat semua
                </Link>
            )}
        </div>
    );
}
function EmptyState({ text }: { text: string }) {
    return (
        <p className="px-5 py-12 text-center text-sm text-slate-400">{text}</p>
    );
}
function relativeDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}
