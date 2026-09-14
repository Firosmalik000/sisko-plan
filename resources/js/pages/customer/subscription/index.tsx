import { Link } from '@inertiajs/react';
import { Building2, Boxes, CalendarDays, CreditCard, History, ScanLine, Users } from 'lucide-react';
import { AppPage } from '@/components/page/app-page';
import { EmptyState } from '@/components/page/empty-state';
import { MetricItem, MetricStrip } from '@/components/page/metric-strip';
import { PageSection } from '@/components/page/page-section';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { formatMoney as money } from '@/lib/currency';
import { localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import { pricing } from '@/routes';

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
        duration_months: number;
        billing_cycle: 'fixed' | 'lifetime';
        max_stores: number;
        max_products: number;
        max_members: number;
        max_scans: number;
    };
};
type Usage = {
    can_write: boolean;
    reason: string | null;
    products_used: number;
    members_used: number;
    stores_used: number;
    max_stores: number;
    max_products: number;
    max_members: number;
    max_scans: number;
    scans_used: number;
    scan_period_start: string | null;
    scan_period_end: string | null;
};
type SubscriptionAddon = {
    public_id: string;
    plan_name: string;
    price: string;
    stores: number;
    products: number;
    members: number;
    scans: number;
    starts_on: string;
    ends_on: string | null;
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
type SubscriptionPeriod = {
    public_id: string;
    plan_name: string;
    monthly_price: string;
    duration_months: number;
    is_trial: boolean;
    period_start: string;
    period_end: string | null;
    source: string;
    status: 'scheduled' | 'active' | 'completed';
};

export default function StoreSubscriptionPage({
    subscription,
    usage,
    history,
    payments,
    addons,
}: {
    subscription: Subscription;
    usage: Usage;
    history: {
        data: SubscriptionPeriod[];
        links: PaginationLink[];
        total: number;
    };
    payments: { data: Payment[]; links: PaginationLink[]; total: number };
    addons: SubscriptionAddon[];
}) {
    const productPercentage = percentage(usage.products_used, usage.max_products);
    const memberPercentage = percentage(usage.members_used, usage.max_members);
    const storePercentage = percentage(usage.stores_used, usage.max_stores);
    const scanPercentage = percentage(usage.scans_used, usage.max_scans);

    return (
        <AppPage
            title={translate('Plan & subscription')}
            description={translate(subscription.plan.name)}
            icon={CreditCard}
            headerSurface
            actions={
                <Button asChild size="touch" variant="outline">
                    <Link href={pricing.url()}>{translate('See plans')}</Link>
                </Button>
            }
        >
            <MetricStrip>
                <MetricItem label={translate('Status')} value={translate(statusLabel(subscription.status))} />
                <MetricItem label={translate('Price per month')} value={money(subscription.plan.monthly_price)} />
                <MetricItem
                    label={translate('Period active')}
                    value={
                        subscription.current_period_end
                            ? date(subscription.current_period_end)
                            : subscription.trial_ends_at
                              ? date(subscription.trial_ends_at)
                              : translate('Unlimited')
                    }
                />
                <MetricItem label={translate('Payment')} value={String(payments.total)} />
            </MetricStrip>

            {!usage.can_write && (
                <section className="rounded-2xl border border-amber-300 bg-amber-100 p-5 text-amber-950">
                    <h2 className="font-bold">Access portal store deactivated</h2>
                    <p className="mt-1 text-sm">{usage.reason}</p>
                    <Link
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--app-primary)] px-4 text-sm font-bold text-[var(--app-primary-foreground)]"
                        href={pricing.url()}
                    >
                        See plans
                    </Link>
                </section>
            )}

            <PageSection title={translate('Pemakaian plan')} contentClassName="grid sm:grid-cols-2 xl:grid-cols-4">
                <UsageCard icon={Building2} title="Store" used={usage.stores_used} limit={usage.max_stores} percentage={storePercentage} />
                <UsageCard
                    icon={Boxes}
                    title="Products across all stores"
                    used={usage.products_used}
                    limit={usage.max_products}
                    percentage={productPercentage}
                />
                <UsageCard
                    icon={Users}
                    title="Staff active"
                    used={usage.members_used}
                    limit={usage.max_members}
                    percentage={memberPercentage}
                />
                <UsageCard
                    icon={ScanLine}
                    title="AI scans this month"
                    used={usage.scans_used}
                    limit={usage.max_scans}
                    percentage={scanPercentage}
                />
            </PageSection>

            {addons.length > 0 && (
                <PageSection title={translate('Active add-on')}>
                    <div className="divide-y divide-slate-900/8">
                        {addons.map((addon) => (
                            <article
                                key={addon.public_id}
                                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
                            >
                                <div className="min-w-0">
                                    <h3 className="truncate font-black text-[var(--app-ink)]">{translate(addon.plan_name)}</h3>
                                    <p className="mt-1 text-sm font-semibold text-slate-500">{addonCapacity(addon)}</p>
                                </div>
                                <div className="text-sm font-bold text-slate-700 sm:text-right">
                                    <p>{money(addon.price)}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {date(addon.starts_on)} – {addon.ends_on ? date(addon.ends_on) : 'Forever'}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </PageSection>
            )}

            <PageSection title={translate('Subscription history')} description={`${history.total} ${translate('period')}`}>
                <div className="divide-y divide-slate-900/8">
                    {history.data.map((period) => (
                        <article
                            key={period.public_id}
                            className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] md:items-center"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate font-black text-[var(--app-ink)]">{translate(period.plan_name)}</h3>
                                    <PeriodStatus status={period.status} />
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    {period.is_trial ? `30 ${translate('trial days')}` : `${period.duration_months} ${translate('months')}`}
                                </p>
                            </div>
                            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
                                <CalendarDays className="size-4 shrink-0 text-[var(--app-primary)]" />
                                <span className="break-words">
                                    {date(period.period_start)} – {period.period_end ? date(period.period_end) : 'Unlimited'}
                                </span>
                            </div>
                            <p className="font-black text-[var(--app-ink)] tabular-nums md:text-right">{money(period.monthly_price)}</p>
                        </article>
                    ))}
                    {history.data.length === 0 && <EmptyState icon={History} title={translate('No subscription history yet')} />}
                </div>
                {history.links.length > 3 && (
                    <div className="border-t border-slate-900/8 p-4 sm:p-5">
                        <Pagination links={history.links} />
                    </div>
                )}
            </PageSection>

            <PageSection title={translate('Payment history')} description={`${payments.total} ${translate('payments')}`}>
                <div className="overflow-x-auto px-4 sm:px-5">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="border-b text-xs tracking-wide text-slate-500 uppercase">
                            <tr>
                                <th className="px-3 py-3">Receipt</th>
                                <th className="px-3 py-3">Paid</th>
                                <th className="px-3 py-3">Period</th>
                                <th className="px-3 py-3">Method</th>
                                <th className="px-3 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/8">
                            {payments.data.map((payment) => (
                                <tr key={payment.public_id}>
                                    <td className="px-3 py-4 font-mono font-semibold">{payment.receipt_number}</td>
                                    <td className="px-3 py-4">{date(payment.paid_at)}</td>
                                    <td className="px-3 py-4">
                                        {date(payment.period_start)} - {date(payment.period_end)}
                                    </td>
                                    <td className="px-3 py-4">{payment.payment_method.replaceAll('_', ' ')}</td>
                                    <td className="px-3 py-4 text-right font-bold">{money(payment.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {payments.data.length === 0 && <EmptyState icon={CreditCard} title={translate('No payments recorded yet')} />}
                </div>
                <div className="border-t border-border p-4 sm:p-5">
                    <Pagination links={payments.links} />
                </div>
            </PageSection>
        </AppPage>
    );
}

function PeriodStatus({ status }: { status: SubscriptionPeriod['status'] }) {
    const styles = {
        scheduled: 'bg-amber-100 text-amber-800',
        active: 'bg-emerald-100 text-emerald-800',
        completed: 'bg-slate-100 text-slate-600',
    };
    const labels = {
        scheduled: 'Scheduled',
        active: 'Walk',
        completed: 'Completed',
    };

    return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
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
        <div className="border-b border-border p-4 last:border-b-0 sm:border-r sm:p-5 xl:border-b-0 xl:last:border-r-0 xl:[&:nth-child(2)]:border-r sm:[&:nth-child(even)]:border-r-0">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                </span>
                <div>
                    <h3 className="text-sm font-bold text-foreground">{translate(title)}</h3>
                    <p className="text-sm text-slate-500">
                        {used} {translate('of')} {limit === 0 ? translate('unlimited') : limit}
                    </p>
                </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                    className={fill >= 90 ? 'h-full rounded-full bg-amber-600' : 'h-full rounded-full bg-primary'}
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
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: 'medium' }).format(new Date(value));
}

function statusLabel(status: string) {
    return (
        {
            trialing: 'Trial period',
            active: 'Active',
            past_due: 'Past due',
            suspended: 'Suspended',
            cancelled: 'Cancelled',
        }[status] ?? status
    );
}

function addonCapacity(addon: SubscriptionAddon) {
    return [
        addon.stores > 0 ? `+${addon.stores} ${translate('stores')}` : null,
        addon.products > 0 ? `+${addon.products} ${translate('products')}` : null,
        addon.members > 0 ? `+${addon.members} ${translate('staff')}` : null,
        addon.scans > 0 ? `+${addon.scans} ${translate('scans/month')}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
}
