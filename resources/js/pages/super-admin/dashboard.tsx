import { Head, Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    Building2,
    CircleCheck,
    ShieldAlert,
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
};
type Activity = {
    id: number;
    action: string;
    admin: string;
    created_at: string;
};

export default function SuperAdminDashboard({
    metrics,
    recent_activity,
}: {
    metrics: Metrics;
    recent_activity: Activity[];
}) {
    const cards = [
        {
            label: 'Total pengguna',
            value: metrics.users,
            detail: `${metrics.active_users} aktif`,
            icon: Users,
            href: '/super-admin/users',
        },
        {
            label: 'Total toko',
            value: metrics.stores,
            detail: `${metrics.active_stores} aktif`,
            icon: Building2,
            href: '/super-admin/stores',
        },
        {
            label: 'Subscription operasional',
            value: metrics.operational_subscriptions,
            detail: 'Active atau trialing',
            icon: ShieldAlert,
            href: '/super-admin/subscriptions',
        },
        {
            label: 'MRR aktif',
            value: new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
            }).format(Number(metrics.monthly_recurring_revenue)),
            detail: `Pembayaran bulan ini ${new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(Number(metrics.payments_this_month))}`,
            icon: CircleCheck,
            href: '/super-admin/subscriptions',
        },
    ];

    return (
        <>
            <Head title="Panel Super Admin" />
            <div className="mb-8">
                <p className="text-xs font-semibold tracking-[0.22em] text-[#8a681e] uppercase">
                    Platform overview
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    Kondisi platform hari ini
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                    Pantau akses pengguna dan status toko tanpa masuk ke data
                    operasional mereka.
                </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="group rounded-2xl border border-slate-900/10 bg-white/70 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                    >
                        <div className="flex items-start justify-between">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-[#102b31] text-white">
                                <card.icon className="size-5" />
                            </span>
                            <ArrowUpRight className="size-4 text-slate-400 group-hover:text-slate-900" />
                        </div>
                        <p className="mt-6 text-3xl font-semibold">
                            {card.value}
                        </p>
                        <p className="mt-1 text-sm font-medium">{card.label}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            {card.detail}
                        </p>
                    </Link>
                ))}
            </div>
            <section className="mt-8 rounded-2xl border border-slate-900/10 bg-white/70 p-5 md:p-7">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold">
                        Aktivitas administratif terbaru
                    </h2>
                    <p className="text-sm text-slate-500">
                        Perubahan sensitif yang tercatat oleh sistem.
                    </p>
                </div>
                {recent_activity.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-10 text-center text-sm text-slate-500">
                        Belum ada perubahan administratif.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-900/8">
                        {recent_activity.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between gap-4 py-4"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {item.action.replaceAll('.', ' · ')}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        oleh {item.admin}
                                    </p>
                                </div>
                                <time className="text-xs text-slate-500">
                                    {new Date(item.created_at).toLocaleString(
                                        'id-ID',
                                    )}
                                </time>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
