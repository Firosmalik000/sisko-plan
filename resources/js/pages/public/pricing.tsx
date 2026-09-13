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

function localizedCategoryCopy(): Record<OfferCategory, { title: string; label: string; description: string }> {
    return {
        store_capacity: {
            title: translate('Increase store capacity'),
            label: translate('Store'),
            description: translate('Add room for another store under the same account.'),
        },
        staff_capacity: {
            title: translate('Increase staff capacity'),
            label: translate('Staff'),
            description: translate('Expand team access without changing the base plan.'),
        },
        scan_capacity: {
            title: translate('Increase AI scan allowance'),
            label: translate('AI scans'),
            description: translate('Add product recognition from photos for this month.'),
        },
        product_capacity: {
            title: translate('Increase product capacity'),
            label: translate('Product'),
            description: translate('Add room for a growing product catalog.'),
        },
        general: {
            title: translate('Combined capacity'),
            label: translate('Combined'),
            description: translate('Bundle several capacity add-ons in one option.'),
        },
    };
}

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
    const categoryCopy = localizedCategoryCopy();
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
            title: 'Base plans',
            description: 'Select plan fixed-term for capacity operations that more bulk.',
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
            <Head title="Plan for Every Stage Store" />
            <section className="pricing-hero">
                <div className="ledger-container">
                    <m.div className="pricing-hero-copy" initial="hidden" animate="visible" variants={revealLeft}>
                        <span className="scan-kicker">Plans {branding.brand_name}</span>
                        <h1>{focusedCopy ? focusedCopy.title : 'Choose the right capacity for your store.'}</h1>
                        <p>
                            {focusedCopy
                                ? focusedCopy.description
                                : 'Start with what you need today. Increase capacity as your products, team, and stores grow.'}
                        </p>
                    </m.div>
                    <m.div className="pricing-hero-aside" initial="hidden" animate="visible" variants={revealRight}>
                        <span className="pricing-proof-label">In one account</span>
                        <m.div className="pricing-proof-flow" variants={staggerGroup}>
                            <m.span variants={staggerItem}>
                                <ScanLine /> Scans
                            </m.span>
                            <i />
                            <m.span variants={staggerItem}>
                                <Store /> Store
                            </m.span>
                            <i />
                            <m.span variants={staggerItem}>
                                <Users /> Team
                            </m.span>
                        </m.div>
                        <div className="pricing-proof-total">
                            <span>Connected operations</span>
                            <strong>Checkout · Stock · Cash · Reports</strong>
                        </div>
                    </m.div>
                </div>
            </section>

            <section className="pricing-assurance" aria-label="Benefits every plan">
                <m.div
                    className="ledger-container"
                    initial="hidden"
                    whileInView="visible"
                    viewport={publicViewport}
                    variants={staggerGroup}
                >
                    <m.span variants={staggerItem}>
                        <ScanLine /> Flow checkout fast
                    </m.span>
                    <m.span variants={staggerItem}>
                        <ShieldCheck /> Isolated store data
                    </m.span>
                    <m.span variants={staggerItem}>
                        <CreditCard /> Clearly stated capacity
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
                            <span className="scan-kicker">Optional plan</span>
                            <h2 id="offers-title">
                                {focusedCopy
                                    ? `${translate('Options for')} ${focusedCopy.label.toLowerCase()}`
                                    : translate('Designed to grow with your store.')}
                            </h2>
                        </div>
                        <span>
                            {visibleChoiceCount} {translate('options')}
                        </span>
                    </m.div>
                    {offerGroups.length > 1 && (
                        <nav className="pricing-category-nav" aria-label="Category offer">
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
                                    {group.key === 'base' ? 'Base plans' : categoryCopy[group.key as OfferCategory].label}
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
                                        <h3 id={`category-${group.key}-title`}>{translate(group.title)}</h3>
                                        <p>{translate(group.description)}</p>
                                    </div>
                                    <span>
                                        {group.plans.length} {translate('options')}
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
                                                    {plan.is_trial && <span>Trial 30 day</span>}
                                                    {plan.is_current && <span>Current plan</span>}
                                                    {plan.kind === 'addon' && (
                                                        <span>{categoryCopy[plan.offer_category ?? 'general'].label}</span>
                                                    )}
                                                </div>
                                                <h3>{translate(plan.name)}</h3>
                                                {plan.description && <p>{translate(plan.description)}</p>}
                                            </div>
                                            <div className="pricing-card-price">
                                                <strong>{priceLabel(plan)}</strong>
                                                {Number(plan.monthly_price) > 0 && plan.billing_cycle === 'fixed' && <span>/ month</span>}
                                            </div>
                                            <ul aria-label={`${translate('Capacity')} ${translate(plan.name)}`}>
                                                <li>
                                                    <Clock3 />
                                                    <span>
                                                        Active period <strong>{planTerm(plan)}</strong>
                                                    </span>
                                                </li>
                                                {(plan.kind === 'base' || plan.max_stores > 0) && (
                                                    <PlanLimit
                                                        value={plan.max_stores}
                                                        label="store per account"
                                                        additional={plan.kind === 'addon'}
                                                    />
                                                )}
                                                {(plan.kind === 'base' || plan.max_products > 0) && (
                                                    <PlanLimit
                                                        value={plan.max_products}
                                                        label="product active"
                                                        additional={plan.kind === 'addon'}
                                                    />
                                                )}
                                                {(plan.kind === 'base' || plan.max_members > 0) && (
                                                    <PlanLimit
                                                        value={plan.max_members}
                                                        label="staff per account"
                                                        additional={plan.kind === 'addon'}
                                                    />
                                                )}
                                                {(plan.kind === 'base' || plan.max_scans > 0) && (
                                                    <PlanLimit
                                                        value={plan.max_scans}
                                                        label="scans per month"
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
                            <p>No plans are currently available.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="pricing-close">
                <m.div className="ledger-container" initial="hidden" whileInView="visible" viewport={publicViewport} variants={revealClip}>
                    <div>
                        <span className="scan-kicker">Start with what you need</span>
                        <h2>Start with the free plan. Add more capacity when your store needs it.</h2>
                    </div>
                    {account.can_access_dashboard ? (
                        <Link className="ledger-button ledger-button-orange" href={dashboard()}>
                            Open dashboard <ArrowRight />
                        </Link>
                    ) : (
                        <a className="ledger-button ledger-button-orange" href="#offers">
                            See plans <ArrowRight />
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
                        <DialogTitle className="text-xl font-black tracking-[-0.03em] text-[#2d2928]">Confirm subscribe</DialogTitle>
                        <DialogDescription className="text-[#5e6964]">
                            {selectedScheduled && account.next_period_start
                                ? `${selectedPlan?.name} ${translate('will start on')} ${date(account.next_period_start)} ${translate('after the previous period ends.')}`
                                : selectedPlan?.kind === 'addon'
                                  ? `${selectedPlan?.name} ${translate('will increase account capacity immediately.')}`
                                  : `${selectedPlan?.name} ${translate('will become active immediately.')}`}
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
                                Active period {selectedPlan ? planTerm(selectedPlan) : '—'}.
                            </p>
                            {selectedScheduled && account.next_period_start && (
                                <p className="flex items-center gap-2 text-sm font-semibold text-[#5f5754]">
                                    <CalendarDays className="size-4 text-[#ee4d2d]" />
                                    Start {date(account.next_period_start)}
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
                                Cancel
                            </button>
                            <button className="ledger-button ledger-button-dark" type="submit" disabled={form.processing}>
                                {form.processing
                                    ? selectedScheduled
                                        ? 'Scheduling...'
                                        : 'Activating...'
                                    : selectedScheduled
                                      ? 'Schedule plan'
                                      : selectedPlan?.kind === 'addon'
                                        ? 'Add add-on'
                                        : 'Confirm plan'}{' '}
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
                Create account <ArrowRight />
            </Link>
        );
    }

    if (!account.has_store) {
        return (
            <Link className="ledger-button ledger-button-dark" href={stores.create()}>
                Create store <ArrowRight />
            </Link>
        );
    }

    if (plan.is_current && account.can_access_dashboard && plan.billing_cycle === 'lifetime') {
        return (
            <Link className="ledger-button ledger-button-dark" href={dashboard()}>
                Open dashboard <ArrowRight />
            </Link>
        );
    }

    if (plan.can_select) {
        return (
            <button className="ledger-button ledger-button-orange" type="button" onClick={() => openConfirmation(plan)}>
                {plan.kind === 'addon'
                    ? translate('Increase capacity')
                    : plan.is_current
                      ? 'Extend plan'
                      : account.can_access_dashboard
                        ? 'Choose a plan'
                        : 'Subscribe'}{' '}
                <ArrowRight />
            </button>
        );
    }

    return (
        <button className="ledger-button pricing-disabled-action" type="button" disabled>
            <LockKeyhole /> {plan.disabled_reason ?? 'Unavailable'}
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
        return translate('Forever');
    }

    if (plan.is_trial) {
        return translate('30 day');
    }

    return `${plan.duration_months} ${translate('months')}`;
}

function priceLabel(plan: Pick<Plan, 'monthly_price' | 'billing_cycle'>) {
    if (Number(plan.monthly_price) === 0) {
        return translate('Free');
    }

    return `${formatMoney(plan.monthly_price)}${plan.billing_cycle === 'lifetime' ? ` ${translate('once')}` : ''}`;
}

function date(value: string) {
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: 'long' }).format(new Date(`${value}T00:00:00`));
}
