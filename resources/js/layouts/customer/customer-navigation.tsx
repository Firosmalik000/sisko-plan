import { Link, usePage } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveDialog } from '@/components/overlays/responsive-dialog';
import type { CustomerPageProps } from '@/layouts/customer/customer-page-props';
import { cashierOptionIcons, primaryDestinations } from '@/layouts/customer/navigation-items';
import { useTranslation } from '@/lib/i18n';
import { visibleByCapability } from '@/lib/pos-operations-contract';
import { cn } from '@/lib/utils';
import storesRoutes from '@/routes/stores';

export function CustomerNavigation() {
    const { url } = usePage();
    const { activeStore, capabilities } = usePage<CustomerPageProps>().props;
    const visibleDestinations = visibleByCapability(primaryDestinations, capabilities);
    const pathname = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
    const disabled = !activeStore;
    const [cashierOpen, setCashierOpen] = useState(false);

    return (
        <>
            <nav
                aria-label="Main navigation"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:inset-y-[75px] lg:right-auto lg:w-20 lg:border-t-0 lg:border-r lg:pb-0"
            >
                <div className="mx-auto grid h-16 max-w-2xl grid-cols-5 items-stretch px-1 lg:flex lg:h-full lg:flex-col lg:gap-1 lg:px-2 lg:py-3">
                    {visibleDestinations.map((item) =>
                        item.kind === 'launcher' ? (
                            <CashierTrigger key={item.key} item={item} disabled={disabled} onClick={() => setCashierOpen(true)} />
                        ) : (
                            <Destination
                                key={item.href}
                                item={item}
                                active={
                                    item.key === 'more'
                                        ? pathname === item.href || morePathActive(pathname)
                                        : pathname === item.href || pathname.startsWith(`${item.href}/`)
                                }
                                disabled={disabled}
                            />
                        ),
                    )}
                </div>
            </nav>

            <CashierLauncher open={cashierOpen} onOpenChange={setCashierOpen} />
        </>
    );
}

type DestinationItem = Extract<(typeof primaryDestinations)[number], { kind: 'link' }>;
type CashierDestination = Extract<(typeof primaryDestinations)[number], { kind: 'launcher' }>;

function Destination({ item, active, disabled }: { item: DestinationItem; active: boolean; disabled: boolean }) {
    const { t } = useTranslation();
    const Icon = item.icon;

    return (
        <Link
            href={disabled ? storesRoutes.index.url() : item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:min-h-14 lg:flex-none',
                active ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
        >
            <span className={cn('grid h-7 w-10 place-items-center rounded-xl transition', active && 'bg-secondary')}>
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className="max-w-full truncate">{t(item.title)}</span>
        </Link>
    );
}

function CashierTrigger({ item, disabled, onClick }: { item: CashierDestination; disabled: boolean; onClick: () => void }) {
    const { t } = useTranslation();
    const Icon = item.icon;

    return (
        <button
            type="button"
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={onClick}
            className="group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold text-primary transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 lg:order-first lg:mb-2 lg:min-h-16 lg:flex-none lg:bg-secondary"
        >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_22px_-14px_var(--app-shadow)] transition group-hover:bg-primary/90 dark:shadow-none">
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="max-w-full truncate">{t(item.title)}</span>
        </button>
    );
}

function CashierLauncher({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { t } = useTranslation();
    const cashier = primaryDestinations.find((item): item is CashierDestination => item.kind === 'launcher');

    if (!cashier) {
        return null;
    }

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('Start transaction')}
            description={t('Choose how you want to add products to the cart.')}
            size="sm"
            bodyClassName="space-y-2"
        >
            {cashier.options.map((option) => {
                const Icon = cashierOptionIcons[option.key];

                return (
                    <Link
                        key={option.key}
                        href={option.href}
                        onClick={() => onOpenChange(false)}
                        className="group flex min-h-16 items-center gap-3 rounded-xl border border-border px-3 text-left transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <span
                            className={cn(
                                'grid size-11 shrink-0 place-items-center rounded-xl',
                                option.key === 'scan' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary',
                            )}
                        >
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <strong className="block text-sm">{t(option.title)}</strong>
                            <span className="text-xs leading-5 text-muted-foreground">{t(option.description)}</span>
                        </span>
                        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                );
            })}
        </ResponsiveDialog>
    );
}

function morePathActive(pathname: string): boolean {
    return !['/dashboard', '/master-data/products', '/pos', '/sales'].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
