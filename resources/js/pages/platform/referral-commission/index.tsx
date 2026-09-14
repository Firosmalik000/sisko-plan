import { Form, Head, Link, router, useForm } from '@inertiajs/react';
import { BadgeCheck, Banknote, CircleDollarSign, Gift, Search, Users, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatMoney, localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';

type Access = {
    view_referrals: boolean;
    view_commissions: boolean;
    view_payouts: boolean;
    manage_commissions: boolean;
    manage_payouts: boolean;
};
type Commission = {
    public_id: string;
    plan_name: string;
    plan_kind: string;
    payment_receipt_number: string;
    commissionable_amount: string;
    commission_rate: string;
    commission_amount: string;
    status: string;
    earned_at: string;
    reversal_reason: string | null;
    referrer: { name: string; email: string };
    referred: { name: string; email: string };
};
type Page<T> = { data: T[]; links: PaginationLink[]; total: number; current_page: number; last_page: number };
type Payout = {
    public_id: string;
    total_amount: string;
    status: string;
    reference: string | null;
    notes: string | null;
    created_at: string;
    paid_at: string | null;
    referrer: { name: string; email: string };
    created_by: string;
    paid_by: string | null;
    items: Array<{ amount: string; commission: Commission }>;
};
type Props = {
    tab: 'overview' | 'referrals' | 'commissions' | 'payouts';
    access: Access;
    metrics?: Record<string, string | number>;
    recent_commissions?: Commission[];
    top_referrers?: Array<{ name: string; email: string; referrals_count: number; commission_total: string }>;
    referrers?: Page<{
        public_id: string;
        name: string;
        email: string;
        code: string;
        referrals_count: number;
        referral_revenue: string;
        commission_total: string;
    }>;
    selected_referrer?: {
        name: string;
        users: Array<{
            name: string;
            email: string;
            attributed_at: string;
            plan: string | null;
            revenue: string;
            commission_total: string;
        }>;
    } | null;
    commissions?: Page<Commission>;
    commission_total?: string;
    filters?: Record<string, string>;
    payable?: Array<{ referrer_id: string; name: string; email: string; total: string; commissions: Commission[] }>;
    payouts?: Page<Payout>;
};

const statusLabels: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', paid: 'Dibayar', reversed: 'Dibalikkan' };
const statusClasses: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-sky-100 text-sky-800',
    paid: 'bg-emerald-100 text-emerald-800',
    reversed: 'bg-slate-200 text-slate-700',
};

export default function ReferralCommissionPage(props: Props) {
    return (
        <div className="platform-enter">
            <Head title="Referral & Commission" />
            <header>
                <p className="platform-kicker">Commercial ledger</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3b211b]">{translate('Referral & Commission')}</h1>
                <p className="mt-2 text-sm text-slate-600">
                    {translate('Lacak hubungan rujukan, komisi per pembayaran, dan pembayaran komisi dengan jejak pemeriksaan.')}
                </p>
            </header>
            <Tabs tab={props.tab} access={props.access} />
            {props.tab === 'overview' && <Overview {...props} />}
            {props.tab === 'referrals' && <Referrals {...props} />}
            {props.tab === 'commissions' && <Commissions {...props} />}
            {props.tab === 'payouts' && <Payouts {...props} />}
        </div>
    );
}

function Tabs({ tab, access }: { tab: Props['tab']; access: Access }) {
    const tabs = [
        access.view_referrals && ['overview', 'Overview', '/super-admin/referral-commission'],
        access.view_referrals && ['referrals', 'Referrals', '/super-admin/referral-commission/referrals'],
        access.view_commissions && ['commissions', 'Commissions', '/super-admin/referral-commission/commissions'],
        access.view_payouts && ['payouts', 'Payouts', '/super-admin/referral-commission/payouts'],
    ].filter(Boolean) as string[][];

    return (
        <nav
            className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1"
            aria-label={translate('Navigasi referral dan commission')}
        >
            {tabs.map(([key, label, href]) => (
                <Link
                    key={key}
                    href={href}
                    className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold ${tab === key ? 'bg-[#ee4d2d] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    {translate(label)}
                </Link>
            ))}
        </nav>
    );
}

function Overview({ metrics = {}, recent_commissions = [], top_referrers = [] }: Props) {
    const cards = [
        ['Total hubungan referral', metrics.relationships ?? 0, Users],
        ['Referrer aktif', metrics.active_referrers ?? 0, Gift],
        ['Commission bulan ini', formatMoney(metrics.this_month ?? 0), CircleDollarSign],
        ['Commission menunggu', formatMoney(metrics.pending ?? 0), WalletCards],
        ['Siap dipayout', formatMoney(metrics.approved ?? 0), BadgeCheck],
        ['Commission dibayar', formatMoney(metrics.paid ?? 0), Banknote],
    ] as const;

    return (
        <>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map(([label, value, Icon]) => (
                    <article key={label} className="platform-panel flex items-center gap-4 p-4">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-[#ee4d2d] text-white">
                            <Icon className="size-5" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold text-slate-500">{translate(label)}</p>
                            <p className="mt-1 text-xl font-black text-[#3b211b]">{value}</p>
                        </div>
                    </article>
                ))}
            </section>
            <section className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <LedgerTable commissions={recent_commissions} />
                <div className="platform-panel overflow-hidden">
                    <SectionTitle title="Top referrer" />
                    <div className="divide-y divide-slate-100">
                        {top_referrers.map((item) => (
                            <div key={item.email} className="flex items-center justify-between gap-4 p-4">
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-[#3b211b]">{item.name}</p>
                                    <p className="truncate text-xs text-slate-500">
                                        {item.email} · {item.referrals_count} {translate('referral')}
                                    </p>
                                </div>
                                <p className="font-black">{formatMoney(item.commission_total)}</p>
                            </div>
                        ))}
                        {!top_referrers.length && <Empty />}
                    </div>
                </div>
            </section>
        </>
    );
}

function Referrals({ referrers, selected_referrer, filters = {} }: Props) {
    if (!referrers) {
        return null;
    }

    return (
        <>
            <section className="platform-panel mt-5 overflow-hidden">
                <Form action="/super-admin/referral-commission/referrals" method="get" className="flex gap-2 border-b p-4">
                    <div className="relative flex-1">
                        <Search className="absolute top-3 left-3 size-4 text-slate-400" />
                        <Input
                            name="search"
                            defaultValue={filters.search ?? ''}
                            placeholder={translate('Cari nama, email, atau kode referral')}
                            className="pl-9"
                        />
                    </div>
                    <Button className="bg-[#ee4d2d] hover:bg-[#d83f22]">{translate('Terapkan')}</Button>
                </Form>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <th className="px-5 py-4">{translate('Referrer')}</th>
                                <th className="px-5 py-4">{translate('Kode rujukan')}</th>
                                <th className="px-5 py-4 text-right">{translate('Pengguna rujukan')}</th>
                                <th className="px-5 py-4 text-right">{translate('Pendapatan rujukan')}</th>
                                <th className="px-5 py-4 text-right">{translate('Total komisi')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {referrers.data.map((item) => (
                                <tr key={item.public_id} className="hover:bg-[#ee4d2d]/[.025]">
                                    <td className="px-5 py-4">
                                        <Link
                                            className="font-bold text-[#b83219]"
                                            href={`/super-admin/referral-commission/referrals?referrer=${item.public_id}`}
                                        >
                                            {item.name}
                                        </Link>
                                        <p className="text-xs text-slate-500">{item.email}</p>
                                    </td>
                                    <td className="px-5 py-4 font-mono font-bold">{item.code}</td>
                                    <td className="px-5 py-4 text-right">{item.referrals_count}</td>
                                    <td className="px-5 py-4 text-right">{formatMoney(item.referral_revenue)}</td>
                                    <td className="px-5 py-4 text-right font-black">{formatMoney(item.commission_total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!referrers.data.length && <Empty />}
                <Pager page={referrers} />
            </section>
            {selected_referrer && (
                <section className="platform-panel mt-5 overflow-hidden">
                    <SectionTitle title={`${translate('Pengguna yang direferensikan oleh')} ${selected_referrer.name}`} />
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="platform-table-head">
                                <tr>
                                    <th className="px-5 py-4">{translate('Pengguna')}</th>
                                    <th className="px-5 py-4">{translate('Tanggal atribusi')}</th>
                                    <th className="px-5 py-4">{translate('Paket saat ini')}</th>
                                    <th className="px-5 py-4 text-right">{translate('Pendapatan')}</th>
                                    <th className="px-5 py-4 text-right">{translate('Komisi')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {selected_referrer.users.map((user) => (
                                    <tr key={user.email}>
                                        <td className="px-5 py-4">
                                            <p className="font-bold">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </td>
                                        <td className="px-5 py-4">{date(user.attributed_at)}</td>
                                        <td className="px-5 py-4">{user.plan ?? '-'}</td>
                                        <td className="px-5 py-4 text-right">{formatMoney(user.revenue)}</td>
                                        <td className="px-5 py-4 text-right font-bold">{formatMoney(user.commission_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </>
    );
}

function Commissions({ commissions, commission_total = '0', filters = {}, access }: Props) {
    if (!commissions) {
        return null;
    }

    return (
        <section className="platform-panel mt-5 overflow-hidden">
            <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                <Form
                    action="/super-admin/referral-commission/commissions"
                    method="get"
                    className="grid flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_.7fr_.7fr_.7fr_.7fr_auto]"
                >
                    <Input
                        name="search"
                        defaultValue={filters.search ?? ''}
                        placeholder={translate('Receipt, referrer, pengguna, atau paket')}
                    />
                    <select name="status" defaultValue={filters.status ?? ''} className="h-10 rounded-md border bg-white px-3 text-sm">
                        <option value="">{translate('Semua status')}</option>
                        {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {translate(label)}
                            </option>
                        ))}
                    </select>
                    <select name="kind" defaultValue={filters.kind ?? ''} className="h-10 rounded-md border bg-white px-3 text-sm">
                        <option value="">{translate('Semua produk')}</option>
                        <option value="base">{translate('Paket utama')}</option>
                        <option value="addon">Add-on</option>
                    </select>
                    <Input type="date" name="from" defaultValue={filters.from ?? ''} aria-label={translate('Tanggal mulai')} />
                    <Input type="date" name="to" defaultValue={filters.to ?? ''} aria-label={translate('Tanggal selesai')} />
                    <Button className="bg-[#ee4d2d] hover:bg-[#d83f22]">{translate('Terapkan')}</Button>
                </Form>
                <div className="text-right">
                    <p className="text-xs text-slate-500">{translate('Total terfilter')}</p>
                    <p className="font-black text-[#3b211b]">{formatMoney(commission_total)}</p>
                </div>
            </div>
            <LedgerTable commissions={commissions.data} access={access} />
            <Pager page={commissions} />
        </section>
    );
}

function LedgerTable({ commissions, access }: { commissions: Commission[]; access?: Access }) {
    const [selected, setSelected] = useState<Commission | null>(null);
    const [mode, setMode] = useState<'approved' | 'reversed'>('approved');
    const [reason, setReason] = useState('');
    const submit = () =>
        selected &&
        router.patch(
            `/super-admin/referral-commission/commissions/${selected.public_id}`,
            { status: mode, reason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelected(null);
                    setReason('');
                },
            },
        );

    return (
        <div className="platform-panel overflow-hidden">
            <SectionTitle title="Commission ledger" />
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left text-sm">
                    <thead className="platform-table-head">
                        <tr>
                            <th className="px-5 py-4">{translate('Tanggal')}</th>
                            <th className="px-5 py-4">{translate('Referrer')}</th>
                            <th className="px-5 py-4">{translate('Pengguna rujukan')}</th>
                            <th className="px-5 py-4">{translate('Paket / produk')}</th>
                            <th className="px-5 py-4">{translate('Pembayaran / bukti')}</th>
                            <th className="px-5 py-4 text-right">{translate('Pembayaran sebenarnya')}</th>
                            <th className="px-5 py-4 text-right">{translate('Rate snapshot')}</th>
                            <th className="px-5 py-4 text-right">{translate('Komisi')}</th>
                            <th className="px-5 py-4">{translate('Status')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {commissions.map((item) => (
                            <tr key={item.public_id} className="hover:bg-[#ee4d2d]/[.025]">
                                <td className="px-5 py-4">{date(item.earned_at)}</td>
                                <td className="px-5 py-4">
                                    <p className="font-bold">{item.referrer.name}</p>
                                    <p className="text-xs text-slate-500">{item.referrer.email}</p>
                                </td>
                                <td className="px-5 py-4">
                                    <p className="font-bold">{item.referred.name}</p>
                                    <p className="text-xs text-slate-500">{item.referred.email}</p>
                                </td>
                                <td className="px-5 py-4">
                                    <p className="font-bold">{item.plan_name}</p>
                                    <p className="text-xs text-slate-500">
                                        {translate(item.plan_kind === 'addon' ? 'Add-on' : 'Paket utama')}
                                    </p>
                                </td>
                                <td className="px-5 py-4 font-mono text-xs">{item.payment_receipt_number}</td>
                                <td className="px-5 py-4 text-right">{formatMoney(item.commissionable_amount)}</td>
                                <td className="px-5 py-4 text-right">{item.commission_rate}%</td>
                                <td className="px-5 py-4 text-right font-black">{formatMoney(item.commission_amount)}</td>
                                <td className="px-5 py-4">
                                    <Badge className={statusClasses[item.status]}>{translate(statusLabels[item.status])}</Badge>
                                    {access?.manage_commissions && ['pending', 'approved'].includes(item.status) && (
                                        <div className="mt-2 flex gap-1">
                                            {item.status === 'pending' && (
                                                <button
                                                    className="text-xs font-bold text-sky-700"
                                                    onClick={() => {
                                                        setSelected(item);
                                                        setMode('approved');
                                                    }}
                                                >
                                                    {translate('Approve')}
                                                </button>
                                            )}
                                            <button
                                                className="text-xs font-bold text-rose-700"
                                                onClick={() => {
                                                    setSelected(item);
                                                    setMode('reversed');
                                                }}
                                            >
                                                {translate('Reverse')}
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!commissions.length && <Empty />}
            <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{translate(mode === 'approved' ? 'Approve commission?' : 'Reverse commission?')}</DialogTitle>
                        <DialogDescription>
                            {translate('Perubahan status keuangan ini akan dicatat pada jejak pemeriksaan.')}
                        </DialogDescription>
                    </DialogHeader>
                    {mode === 'reversed' && (
                        <textarea
                            className="min-h-24 rounded-md border p-3 text-sm"
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder={translate('Alasan reversal')}
                        />
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelected(null)}>
                            {translate('Batal')}
                        </Button>
                        <Button disabled={mode === 'reversed' && !reason.trim()} onClick={submit} className="bg-[#ee4d2d]">
                            {translate('Konfirmasi')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Payouts({ payable = [], payouts, access }: Props) {
    const [active, setActive] = useState<(typeof payable)[number] | null>(null);
    const form = useForm({ referrer_id: '', commissions: [] as string[], reference: '', notes: '' });
    const [paying, setPaying] = useState<Payout | null>(null);
    const [detail, setDetail] = useState<Payout | null>(null);
    const open = (group: (typeof payable)[number]) => {
        setActive(group);
        form.setData({
            referrer_id: group.referrer_id,
            commissions: group.commissions.map((item) => item.public_id),
            reference: '',
            notes: '',
        });
    };

    return (
        <>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {payable.map((group) => (
                    <article key={group.referrer_id} className="platform-panel p-4">
                        <p className="font-black text-[#3b211b]">{group.name}</p>
                        <p className="text-xs text-slate-500">{group.email}</p>
                        <p className="mt-4 text-2xl font-black">{formatMoney(group.total)}</p>
                        <p className="text-xs text-slate-500">
                            {group.commissions.length} {translate('komisi siap dibayar')}
                        </p>
                        {access.manage_payouts && (
                            <Button className="mt-4 w-full bg-[#ee4d2d]" onClick={() => open(group)}>
                                {translate('Buat pembayaran komisi')}
                            </Button>
                        )}
                    </article>
                ))}
                {!payable.length && (
                    <div className="platform-panel col-span-full">
                        <Empty label="Belum ada komisi yang siap dibayar." />
                    </div>
                )}
            </section>
            {payouts && (
                <section className="platform-panel mt-5 overflow-hidden">
                    <SectionTitle title="Riwayat pembayaran komisi" />
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-sm">
                            <thead className="platform-table-head">
                                <tr>
                                    <th className="px-5 py-4">{translate('Tanggal')}</th>
                                    <th className="px-5 py-4">{translate('Referrer')}</th>
                                    <th className="px-5 py-4">{translate('Referensi')}</th>
                                    <th className="px-5 py-4">{translate('Status')}</th>
                                    <th className="px-5 py-4 text-right">{translate('Item')}</th>
                                    <th className="px-5 py-4 text-right">{translate('Total pembayaran komisi')}</th>
                                    <th className="px-5 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payouts.data.map((payout) => (
                                    <tr key={payout.public_id}>
                                        <td className="px-5 py-4">{date(payout.created_at)}</td>
                                        <td className="px-5 py-4">
                                            <p className="font-bold">{payout.referrer.name}</p>
                                            <p className="text-xs text-slate-500">{payout.referrer.email}</p>
                                        </td>
                                        <td className="px-5 py-4">{payout.reference ?? '-'}</td>
                                        <td className="px-5 py-4">
                                            <Badge className={statusClasses[payout.status]}>{translate(statusLabels[payout.status])}</Badge>
                                        </td>
                                        <td className="px-5 py-4 text-right">{payout.items.length}</td>
                                        <td className="px-5 py-4 text-right font-black">{formatMoney(payout.total_amount)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setDetail(payout)}>
                                                    {translate('Detail')}
                                                </Button>
                                                {access.manage_payouts && payout.status === 'pending' && (
                                                    <Button size="sm" onClick={() => setPaying(payout)}>
                                                        {translate('Tandai dibayar')}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pager page={payouts} />
                </section>
            )}
            <Dialog open={active !== null} onOpenChange={(value) => !value && setActive(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{translate('Buat pembayaran komisi')}</DialogTitle>
                        <DialogDescription>
                            {active?.name} · {active && formatMoney(active.total)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                            {active?.commissions.map((commission) => {
                                const checked = form.data.commissions.includes(commission.public_id);

                                return (
                                    <label
                                        key={commission.public_id}
                                        className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-slate-50"
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(value) =>
                                                form.setData(
                                                    'commissions',
                                                    value
                                                        ? [...form.data.commissions, commission.public_id]
                                                        : form.data.commissions.filter((id) => id !== commission.public_id),
                                                )
                                            }
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold">{commission.payment_receipt_number}</span>
                                            <span className="block truncate text-xs text-slate-500">
                                                {commission.referred.name} · {commission.plan_name}
                                            </span>
                                        </span>
                                        <span className="text-sm font-black">{formatMoney(commission.commission_amount)}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <Input
                            value={form.data.reference}
                            onChange={(e) => form.setData('reference', e.target.value)}
                            placeholder={translate('Referensi pembayaran (opsional)')}
                        />
                        <textarea
                            className="min-h-24 w-full rounded-md border p-3 text-sm"
                            value={form.data.notes}
                            onChange={(e) => form.setData('notes', e.target.value)}
                            placeholder={translate('Catatan (opsional)')}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActive(null)}>
                            {translate('Batal')}
                        </Button>
                        <Button
                            disabled={form.processing || form.data.commissions.length === 0}
                            className="bg-[#ee4d2d]"
                            onClick={() =>
                                form.post('/super-admin/referral-commission/payouts', {
                                    preserveScroll: true,
                                    onSuccess: () => setActive(null),
                                })
                            }
                        >
                            {translate('Buat pembayaran komisi')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={detail !== null} onOpenChange={(value) => !value && setDetail(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{translate('Detail pembayaran komisi')}</DialogTitle>
                        <DialogDescription>
                            {detail?.referrer.name} · {detail && formatMoney(detail.total_amount)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-200">
                        {detail?.items.map((item) => (
                            <div
                                key={item.commission.public_id}
                                className="flex items-center justify-between gap-4 border-b border-slate-100 p-3 last:border-b-0"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold">{item.commission.payment_receipt_number}</p>
                                    <p className="truncate text-xs text-slate-500">
                                        {item.commission.referred.name} · {item.commission.plan_name}
                                    </p>
                                </div>
                                <p className="text-sm font-black">{formatMoney(item.amount)}</p>
                            </div>
                        ))}
                    </div>
                    {detail?.notes && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{detail.notes}</p>}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetail(null)}>
                            {translate('Tutup')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={paying !== null} onOpenChange={(value) => !value && setPaying(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{translate('Tandai pembayaran komisi sebagai dibayar?')}</DialogTitle>
                        <DialogDescription>
                            {translate('Semua komisi dalam pembayaran ini akan berstatus dibayar secara atomik.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPaying(null)}>
                            {translate('Batal')}
                        </Button>
                        <Button
                            className="bg-[#ee4d2d]"
                            onClick={() =>
                                paying &&
                                router.patch(
                                    `/super-admin/referral-commission/payouts/${paying.public_id}/paid`,
                                    {},
                                    { preserveScroll: true, onSuccess: () => setPaying(null) },
                                )
                            }
                        >
                            {translate('Konfirmasi pembayaran')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function SectionTitle({ title }: { title: string }) {
    return (
        <div className="border-b px-5 py-4">
            <h2 className="font-black text-[#3b211b]">{translate(title)}</h2>
        </div>
    );
}
function Empty({ label = 'Belum ada data.' }: { label?: string }) {
    return <div className="px-5 py-12 text-center text-sm text-slate-500">{translate(label)}</div>;
}
function Pager({ page }: { page: { links: PaginationLink[]; current_page: number; last_page: number } }) {
    return (
        <footer className="flex items-center justify-between gap-3 border-t px-5 py-4 text-xs text-slate-500">
            <span>
                {translate('Halaman')} {page.current_page} {translate('dari')} {page.last_page}
            </span>
            <Pagination links={page.links} />
        </footer>
    );
}
function date(value: string) {
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: 'medium' }).format(new Date(value));
}
