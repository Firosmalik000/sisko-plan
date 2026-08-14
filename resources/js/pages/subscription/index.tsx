import { Head } from '@inertiajs/react';
import {
    Boxes,
    CalendarDays,
    CheckCircle2,
    CreditCard,
    Users,
} from 'lucide-react';
import { money } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';

type Subscription = {
    public_id: string;
    status: string;
    starts_at: string;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    plan: {
        name: string;
        description: string | null;
        monthly_price: string;
        max_products: number;
        max_members: number;
    };
};
type Usage = {
    can_write: boolean;
    reason: string | null;
    products_used: number;
    members_used: number;
    max_products: number;
    max_members: number;
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
};

export default function StoreSubscriptionPage({
    subscription,
    usage,
    payments,
}: {
    subscription: Subscription;
    usage: Usage;
    payments: { data: Payment[]; links: PaginationLink[]; total: number };
}) {
    const productPercentage = percentage(
        usage.products_used,
        usage.max_products,
    );
    const memberPercentage = percentage(usage.members_used, usage.max_members);

    return (
        <>
            <Head title="Paket & Langganan" />
            <main className="min-h-full bg-[radial-gradient(circle_at_82%_3%,rgba(215,169,65,.2),transparent_30%),linear-gradient(145deg,#fffdf7,#eff7f3)] p-4 md:p-8">
                <div className="mx-auto max-w-6xl space-y-6">
                    <header className="overflow-hidden rounded-[2rem] bg-[#102b31] px-6 py-8 text-white shadow-xl md:px-10 md:py-10">
                        <p className="text-xs font-bold tracking-[0.24em] text-amber-300 uppercase">
                            Akun toko / Subscription
                        </p>
                        <div className="mt-3 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                            <div>
                                <h1 className="font-serif text-4xl md:text-6xl">
                                    {subscription.plan.name}
                                </h1>
                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                                    {subscription.plan.description ??
                                        'Paket operasional toko Anda.'}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-white/10 px-5 py-4">
                                <p className="text-xs tracking-wider text-slate-300 uppercase">
                                    Harga per bulan
                                </p>
                                <p className="mt-1 font-serif text-3xl text-amber-300">
                                    {money(subscription.plan.monthly_price)}
                                </p>
                            </div>
                        </div>
                    </header>

                    <section className="grid gap-4 md:grid-cols-3">
                        <InfoCard
                            icon={CheckCircle2}
                            label="Status"
                            value={statusLabel(subscription.status)}
                            accent={usage.can_write ? 'green' : 'amber'}
                        />
                        <InfoCard
                            icon={CalendarDays}
                            label="Periode aktif"
                            value={
                                subscription.current_period_end
                                    ? `s.d. ${date(subscription.current_period_end)}`
                                    : subscription.trial_ends_at
                                      ? `Trial s.d. ${date(subscription.trial_ends_at)}`
                                      : 'Tanpa batas periode'
                            }
                            accent="stone"
                        />
                        <InfoCard
                            icon={CreditCard}
                            label="Pembayaran tercatat"
                            value={`${payments.total} pembayaran`}
                            accent="stone"
                        />
                    </section>

                    {!usage.can_write && (
                        <section className="rounded-2xl border border-amber-300 bg-amber-100 p-5 text-amber-950">
                            <h2 className="font-bold">
                                Toko dalam mode hanya-baca
                            </h2>
                            <p className="mt-1 text-sm">
                                {usage.reason} Hubungi pengelola platform untuk
                                mengaktifkan kembali subscription.
                            </p>
                        </section>
                    )}

                    <section className="grid gap-6 lg:grid-cols-2">
                        <UsageCard
                            icon={Boxes}
                            title="Produk aktif"
                            used={usage.products_used}
                            limit={usage.max_products}
                            percentage={productPercentage}
                        />
                        <UsageCard
                            icon={Users}
                            title="Anggota aktif"
                            used={usage.members_used}
                            limit={usage.max_members}
                            percentage={memberPercentage}
                        />
                    </section>

                    <section className="rounded-3xl border border-slate-900/10 bg-white/85 p-5 shadow-sm md:p-7">
                        <p className="text-xs font-bold tracking-[0.2em] text-[#8a681e] uppercase">
                            Billing history
                        </p>
                        <h2 className="mt-1 font-serif text-3xl">
                            Riwayat pembayaran
                        </h2>
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead className="border-b text-xs tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-3 py-3">Receipt</th>
                                        <th className="px-3 py-3">Dibayar</th>
                                        <th className="px-3 py-3">Periode</th>
                                        <th className="px-3 py-3">Metode</th>
                                        <th className="px-3 py-3 text-right">
                                            Nominal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900/8">
                                    {payments.data.map((payment) => (
                                        <tr key={payment.public_id}>
                                            <td className="px-3 py-4 font-mono font-semibold">
                                                {payment.receipt_number}
                                            </td>
                                            <td className="px-3 py-4">
                                                {date(payment.paid_at)}
                                            </td>
                                            <td className="px-3 py-4">
                                                {date(payment.period_start)} -{' '}
                                                {date(payment.period_end)}
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
                            {payments.data.length === 0 && (
                                <p className="py-12 text-center text-sm text-slate-500">
                                    Belum ada pembayaran subscription tercatat.
                                </p>
                            )}
                        </div>
                        <div className="mt-5">
                            <Pagination links={payments.links} />
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}

function InfoCard({
    icon: Icon,
    label,
    value,
    accent,
}: {
    icon: typeof CreditCard;
    label: string;
    value: string;
    accent: 'green' | 'amber' | 'stone';
}) {
    const colors = {
        green: 'bg-emerald-100 text-emerald-800',
        amber: 'bg-amber-100 text-amber-800',
        stone: 'bg-slate-200 text-slate-700',
    };

    return (
        <div className="rounded-3xl border border-slate-900/10 bg-white/85 p-5 shadow-sm">
            <div className={`w-fit rounded-xl p-3 ${colors[accent]}`}>
                <Icon className="size-5" />
            </div>
            <p className="mt-5 text-xs font-bold tracking-wide text-slate-500 uppercase">
                {label}
            </p>
            <p className="mt-1 font-serif text-2xl">{value}</p>
        </div>
    );
}

function UsageCard({
    icon: Icon,
    title,
    used,
    limit,
    percentage: fill,
}: {
    icon: typeof Boxes;
    title: string;
    used: number;
    limit: number;
    percentage: number;
}) {
    return (
        <div className="rounded-3xl border border-slate-900/10 bg-white/85 p-6 shadow-sm">
            <div className="flex items-center gap-3">
                <span className="rounded-xl bg-[#102b31] p-3 text-white">
                    <Icon className="size-5" />
                </span>
                <div>
                    <h2 className="font-serif text-2xl">{title}</h2>
                    <p className="text-sm text-slate-500">
                        {used} dari {limit === 0 ? 'tak terbatas' : limit}
                    </p>
                </div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                    className={`h-full rounded-full ${fill >= 90 ? 'bg-amber-600' : 'bg-teal-700'}`}
                    style={{ width: `${fill}%` }}
                />
            </div>
        </div>
    );
}

function percentage(used: number, limit: number) {
    return limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
}

function date(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(value),
    );
}

function statusLabel(status: string) {
    return (
        {
            trialing: 'Masa trial',
            active: 'Aktif',
            past_due: 'Jatuh tempo',
            suspended: 'Ditangguhkan',
            cancelled: 'Dibatalkan',
        }[status] ?? status
    );
}
