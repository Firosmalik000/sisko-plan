import { Head, useForm } from '@inertiajs/react';
import { BadgeCheck, Banknote, CalendarDays, Copy, Gift, Share2, Sparkles, UserRoundCheck, UsersRound, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatMoney, localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';

type Page<T> = { data: T[]; links: PaginationLink[]; total: number };
type Props = {
    referral: { code: string; url: string };
    metrics: { referred_users: number; earning_users: number; month_commission: string | number; paid_total: string | number };
    payable: { count: number; total: string | number };
    rates: Array<{ public_id: string; name: string; kind: 'base' | 'addon'; monthly_price: string; referral_commission_rate: string }>;
    referrals: Page<{ name: string; attributed_at: string; commission_total: string }>;
    commissions: Page<{
        public_id: string;
        referred_name: string;
        plan_name: string;
        plan_kind: 'base' | 'addon';
        commissionable_amount: string;
        commission_rate: string;
        commission_amount: string;
        status: 'pending' | 'approved' | 'paid' | 'reversed';
        earned_at: string;
    }>;
    payouts: Page<{
        public_id: string;
        total_amount: string;
        status: 'pending' | 'paid';
        reference: string | null;
        items_count: number;
        created_at: string;
        paid_at: string | null;
    }>;
};

const commissionStatus = {
    pending: ['Menunggu', 'bg-amber-100 text-amber-800'],
    approved: ['Disetujui', 'bg-sky-100 text-sky-800'],
    paid: ['Dibayar', 'bg-emerald-100 text-emerald-800'],
    reversed: ['Dibatalkan', 'bg-stone-200 text-stone-700'],
} as const;

export default function CustomerReferralPage({ referral, metrics, payable, rates, referrals, commissions, payouts }: Props) {
    const [copying, setCopying] = useState(false);
    const [withdrawalOpen, setWithdrawalOpen] = useState(false);
    const withdrawal = useForm({});

    const copyLink = async () => {
        setCopying(true);

        try {
            await writeClipboard(referral.url);
            toast.success(translate('Link referral berhasil disalin'));
        } catch {
            toast.error(translate('Link referral tidak dapat disalin. Salin secara manual dari kotak tautan.'));
        } finally {
            setCopying(false);
        }
    };

    const shareLink = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: translate('Bagikan Sisko-plan'),
                    text: translate('Coba Sisko-plan melalui link referral saya.'),
                    url: referral.url,
                });

                return;
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
            }
        }

        await copyLink();
    };

    const kpis = [
        ['Pengguna referral', metrics.referred_users, UsersRound],
        ['Menghasilkan komisi', metrics.earning_users, UserRoundCheck],
        ['Komisi bulan ini', formatMoney(metrics.month_commission), WalletCards],
        ['Total dibayar', formatMoney(metrics.paid_total), Banknote],
    ] as const;
    const firstWithdrawalError = Object.values(withdrawal.errors)[0];
    const withdrawalError = typeof firstWithdrawalError === 'string' ? firstWithdrawalError : null;

    return (
        <>
            <Head title="Referral & Komisi" />
            <main className="min-h-full bg-[linear-gradient(180deg,#fffaf7_0%,#fff4ef_48%,#fffaf7_100%)] px-3 py-4 sm:px-5 lg:px-8 lg:py-7">
                <div className="mx-auto max-w-6xl space-y-5 sm:space-y-6">
                    <section className="relative overflow-hidden rounded-[1.5rem] bg-[var(--app-primary)] px-5 py-6 text-[var(--app-primary-foreground)] shadow-[0_24px_54px_-32px_var(--app-shadow)] sm:px-7 sm:py-8 lg:grid lg:grid-cols-[1fr_minmax(22rem,.8fr)] lg:items-center lg:gap-10 lg:px-10 lg:py-10">
                        <Gift className="absolute -top-8 -right-7 size-40 rotate-12 opacity-10 sm:size-52" aria-hidden="true" />
                        <div className="relative max-w-xl">
                            <h1 className="text-3xl font-black tracking-[-0.04em] text-balance sm:text-4xl">
                                {translate('Referral & Komisi')}
                            </h1>
                            <p className="mt-3 max-w-lg text-sm leading-6 text-white/85 sm:text-base">
                                {translate(
                                    'Bagikan Sisko-plan kepada teman Anda. Komisi mengikuti rate paket yang dibayar oleh pengguna referral.',
                                )}
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-white/75">
                                <Sparkles className="size-4" />
                                <span>{translate('Kode referral Anda')}</span>
                            </div>
                            <p className="mt-1 font-mono text-3xl font-black tracking-[0.08em] break-all sm:text-4xl">{referral.code}</p>
                        </div>

                        <div className="relative mt-7 rounded-2xl bg-white/12 p-3 ring-1 ring-white/20 lg:mt-0">
                            <label htmlFor="referral-link" className="sr-only">
                                {translate('Link referral Anda')}
                            </label>
                            <input
                                id="referral-link"
                                readOnly
                                value={referral.url}
                                onFocus={(event) => event.currentTarget.select()}
                                className="h-12 w-full rounded-xl border-0 bg-white px-3 text-sm font-semibold text-[var(--app-ink)] shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-white/50"
                            />
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => void copyLink()}
                                    disabled={copying}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-black text-[var(--app-primary)] transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none disabled:cursor-wait disabled:opacity-70"
                                >
                                    <Copy className="size-4" />
                                    {translate(copying ? 'Menyalin...' : 'Salin link')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void shareLink()}
                                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--app-ink)] px-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
                                >
                                    <Share2 className="size-4" />
                                    {translate('Bagikan')}
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[var(--app-ink)]/8 lg:grid-cols-4">
                        {kpis.map(([label, value, Icon], index) => (
                            <article
                                key={label}
                                className={`p-4 sm:p-5 ${index % 2 ? '' : 'border-r border-[var(--app-ink)]/8'} ${index > 1 ? 'border-t border-[var(--app-ink)]/8 lg:border-t-0' : ''} ${index === 1 ? 'lg:border-r' : ''}`}
                            >
                                <Icon className="size-5 text-[var(--app-primary)]" />
                                <p className="mt-3 text-[11px] leading-4 font-bold text-[var(--muted-foreground)]">{translate(label)}</p>
                                <p className="mt-1 text-lg font-black tracking-[-0.025em] text-[var(--app-ink)] tabular-nums sm:text-xl">
                                    {value}
                                </p>
                            </article>
                        ))}
                    </section>

                    <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-sm ring-1 ring-[var(--app-ink)]/8">
                        <SectionHeading
                            icon={BadgeCheck}
                            title="Komisi yang berlaku"
                            subtitle={translate('Rate untuk transaksi berikutnya')}
                        />
                        {rates.length ? (
                            <div className="divide-y divide-[var(--app-ink)]/8">
                                {rates.map((rate) => (
                                    <article
                                        key={rate.public_id}
                                        className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="truncate font-black text-[var(--app-ink)]">{rate.name}</h3>
                                            <p className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                                                {translate(rate.kind === 'addon' ? 'Add-on' : 'Paket utama')}
                                            </p>
                                        </div>
                                        <p className="text-sm font-bold text-[var(--muted-foreground)] tabular-nums sm:text-right">
                                            {formatMoney(rate.monthly_price)}
                                        </p>
                                        <p className="w-fit rounded-lg bg-[var(--app-soft-strong)] px-3 py-2 text-sm font-black text-[var(--app-primary)] tabular-nums">
                                            {formatRate(rate.referral_commission_rate)}% {translate('komisi')}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <EmptyState text="Belum ada paket berkomisi yang aktif." />
                        )}
                        <p className="border-t border-[var(--app-ink)]/8 bg-[var(--app-soft)]/55 px-4 py-3 text-xs leading-5 text-[var(--muted-foreground)] sm:px-5">
                            {translate(
                                'Rate dapat berubah untuk transaksi berikutnya. Komisi yang sudah tercatat tetap memakai rate saat transaksi terjadi.',
                            )}
                        </p>
                    </section>

                    <div className="grid gap-5 xl:grid-cols-2">
                        <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-sm ring-1 ring-[var(--app-ink)]/8">
                            <SectionHeading
                                icon={UsersRound}
                                title="Pengguna referral"
                                subtitle={`${referrals.total} ${translate('pengguna')}`}
                            />
                            <div className="divide-y divide-[var(--app-ink)]/8">
                                {referrals.data.map((item, index) => (
                                    <article
                                        key={`${item.name}-${item.attributed_at}-${index}`}
                                        className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="truncate font-black text-[var(--app-ink)]">{item.name}</h3>
                                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                                {translate('Bergabung')} {date(item.attributed_at)}
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p
                                                className={`text-xs font-bold ${Number(item.commission_total) > 0 ? 'text-emerald-700' : 'text-[var(--muted-foreground)]'}`}
                                            >
                                                {translate(
                                                    Number(item.commission_total) > 0
                                                        ? 'Sudah menghasilkan komisi'
                                                        : 'Belum menghasilkan komisi',
                                                )}
                                            </p>
                                            {Number(item.commission_total) > 0 && (
                                                <p className="mt-1 font-black tabular-nums">{formatMoney(item.commission_total)}</p>
                                            )}
                                        </div>
                                    </article>
                                ))}
                                {!referrals.data.length && (
                                    <EmptyState text="Belum ada pengguna yang bergabung melalui link Anda. Bagikan link referral untuk mulai mengajak pengguna baru." />
                                )}
                            </div>
                            <SectionPagination links={referrals.links} />
                        </section>

                        <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-sm ring-1 ring-[var(--app-ink)]/8">
                            <SectionHeading
                                icon={WalletCards}
                                title="Riwayat komisi"
                                subtitle={`${commissions.total} ${translate('komisi')}`}
                            />
                            <div className="divide-y divide-[var(--app-ink)]/8">
                                {commissions.data.map((item) => (
                                    <article key={item.public_id} className="px-4 py-4 sm:px-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <h3 className="truncate font-black text-[var(--app-ink)]">{item.referred_name}</h3>
                                                <p className="mt-0.5 truncate text-sm font-semibold text-[var(--muted-foreground)]">
                                                    {item.plan_name}
                                                </p>
                                            </div>
                                            <StatusBadge status={item.status} />
                                        </div>
                                        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-[var(--app-soft)]/60 px-3 py-2.5">
                                            <div>
                                                <p className="text-xs text-[var(--muted-foreground)] tabular-nums">
                                                    {formatMoney(item.commissionable_amount)} × {formatRate(item.commission_rate)}%
                                                </p>
                                                <p className="mt-0.5 text-lg font-black text-[var(--app-ink)] tabular-nums">
                                                    {formatMoney(item.commission_amount)}
                                                </p>
                                            </div>
                                            <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                                <CalendarDays className="size-3.5" /> {date(item.earned_at)}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                                {!commissions.data.length && (
                                    <EmptyState text="Belum ada komisi. Komisi akan tercatat ketika pengguna referral melakukan transaksi yang memenuhi syarat." />
                                )}
                            </div>
                            <SectionPagination links={commissions.links} />
                        </section>
                    </div>

                    <section className="grid gap-4 overflow-hidden rounded-[1.35rem] bg-[var(--app-ink)] px-5 py-5 text-white shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-black">
                                <WalletCards className="size-5 text-[var(--app-primary)]" />
                                {translate('Tarik komisi')}
                            </div>
                            <p className="mt-2 text-2xl font-black tracking-[-0.03em] tabular-nums">{formatMoney(payable.total)}</p>
                            <p className="mt-1 text-xs leading-5 text-white/65">
                                {payable.count > 0
                                    ? `${payable.count} ${translate('komisi disetujui siap ditarik')}`
                                    : translate('Belum ada komisi disetujui yang dapat ditarik.')}
                            </p>
                        </div>
                        <button
                            type="button"
                            disabled={payable.count === 0}
                            onClick={() => setWithdrawalOpen(true)}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-5 text-sm font-black text-[var(--app-primary-foreground)] transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-3 focus-visible:ring-white/45 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            <Banknote className="size-4" />
                            {translate('Ajukan penarikan')}
                        </button>
                    </section>

                    <section className="overflow-hidden rounded-[1.35rem] bg-white shadow-sm ring-1 ring-[var(--app-ink)]/8">
                        <SectionHeading
                            icon={Banknote}
                            title="Pembayaran komisi"
                            subtitle={`${payouts.total} ${translate('pembayaran')}`}
                        />
                        <div className="divide-y divide-[var(--app-ink)]/8">
                            {payouts.data.map((payout) => (
                                <article
                                    key={payout.public_id}
                                    className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5"
                                >
                                    <div>
                                        <p className="font-black text-[var(--app-ink)] tabular-nums">{formatMoney(payout.total_amount)}</p>
                                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                            {payout.items_count} {translate('item komisi')} · {date(payout.created_at)}
                                        </p>
                                    </div>
                                    {payout.reference && (
                                        <p className="truncate text-xs font-semibold text-[var(--muted-foreground)] sm:max-w-64">
                                            {payout.reference}
                                        </p>
                                    )}
                                    <div className="sm:text-right">
                                        <StatusBadge status={payout.status} />
                                        {payout.paid_at && (
                                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{date(payout.paid_at)}</p>
                                        )}
                                    </div>
                                </article>
                            ))}
                            {!payouts.data.length && <EmptyState text="Belum ada pembayaran komisi." />}
                        </div>
                        <SectionPagination links={payouts.links} />
                    </section>
                </div>
            </main>

            <Dialog open={withdrawalOpen} onOpenChange={(open) => !withdrawal.processing && setWithdrawalOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{translate('Ajukan penarikan komisi?')}</DialogTitle>
                        <DialogDescription>
                            {translate(
                                'Semua komisi yang sudah disetujui dan belum diproses akan diajukan kepada Super Admin. Jumlah akhir dihitung oleh sistem.',
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-xl bg-[var(--app-soft)] px-4 py-3">
                        <p className="text-xs font-bold text-[var(--muted-foreground)]">{translate('Total penarikan')}</p>
                        <p className="mt-1 text-2xl font-black text-[var(--app-ink)] tabular-nums">{formatMoney(payable.total)}</p>
                    </div>
                    {withdrawalError && <p className="text-sm font-semibold text-red-600">{withdrawalError}</p>}
                    <DialogFooter>
                        <button
                            type="button"
                            disabled={withdrawal.processing}
                            onClick={() => setWithdrawalOpen(false)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--app-ink)]/12 px-4 text-sm font-bold text-[var(--app-ink)] disabled:opacity-50"
                        >
                            {translate('Batal')}
                        </button>
                        <button
                            type="button"
                            disabled={withdrawal.processing}
                            onClick={() =>
                                withdrawal.post('/referral/withdrawals', {
                                    preserveScroll: true,
                                    onSuccess: () => setWithdrawalOpen(false),
                                })
                            }
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] disabled:cursor-wait disabled:opacity-60"
                        >
                            {translate(withdrawal.processing ? 'Mengajukan...' : 'Ya, ajukan penarikan')}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function SectionHeading({ icon: Icon, title, subtitle }: { icon: typeof Gift; title: string; subtitle: string }) {
    return (
        <header className="flex items-center justify-between gap-4 border-b border-[var(--app-ink)]/8 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                    <Icon className="size-5" />
                </span>
                <h2 className="truncate text-lg font-black tracking-[-0.025em] text-[var(--app-ink)]">{translate(title)}</h2>
            </div>
            <p className="shrink-0 text-xs font-semibold text-[var(--muted-foreground)]">{subtitle}</p>
        </header>
    );
}

function StatusBadge({ status }: { status: keyof typeof commissionStatus | 'pending' | 'paid' }) {
    const [label, style] = commissionStatus[status];

    return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{translate(label)}</span>;
}

function EmptyState({ text }: { text: string }) {
    return <p className="px-5 py-10 text-center text-sm leading-6 text-[var(--muted-foreground)]">{translate(text)}</p>;
}

function SectionPagination({ links }: { links: PaginationLink[] }) {
    return links.length > 3 ? (
        <div className="border-t border-[var(--app-ink)]/8 px-4 py-4">
            <Pagination links={links} />
        </div>
    ) : null;
}

function date(value: string) {
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: 'medium' }).format(new Date(value));
}

function formatRate(value: string) {
    return new Intl.NumberFormat(localeTag(), { maximumFractionDigits: 2 }).format(Number(value));
}

async function writeClipboard(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);

        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();

    if (!copied) {
        throw new Error('Clipboard is unavailable.');
    }
}
