import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveDialog } from '@/components/overlays/responsive-dialog';
import type { CustomerPageProps } from '@/layouts/customer/customer-page-props';
import {
    moreDestination,
    moreDestinationPaths,
    moreMenuSections,
    primaryDestinations,
    quickActionGroups,
    quickActionHref,
} from '@/layouts/customer/navigation-items';
import type { QuickActionMode } from '@/layouts/customer/navigation-items';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import storesRoutes from '@/routes/stores';

export function CustomerNavigation() {
    const { url } = usePage();
    const pathname = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
    const { activeStore } = usePage<CustomerPageProps>().props;
    const [quickOpen, setQuickOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [mode, setMode] = useState<QuickActionMode>('manual');
    const disabled = !activeStore;
    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const moreActive = moreDestinationPaths.some(isActive);

    return (
        <>
            <nav
                aria-label="Navigasi utama"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:inset-y-[75px] md:right-auto md:w-20 md:border-t-0 md:border-r md:pb-0"
            >
                <div className="grid h-16 grid-cols-5 items-stretch px-1 md:flex md:h-full md:flex-col md:gap-1 md:px-2 md:py-3">
                    <Destination item={primaryDestinations[0]} active={isActive(primaryDestinations[0].href)} disabled={disabled} />
                    <Destination item={primaryDestinations[1]} active={isActive(primaryDestinations[1].href)} disabled={disabled} />
                    <QuickActionTrigger onClick={() => setQuickOpen(true)} disabled={disabled} />
                    <Destination item={primaryDestinations[2]} active={isActive(primaryDestinations[2].href)} disabled={disabled} />
                    <MoreTrigger active={moreActive} disabled={disabled} onClick={() => setMoreOpen(true)} />
                </div>
            </nav>

            <QuickActions open={quickOpen} onOpenChange={setQuickOpen} mode={mode} onModeChange={setMode} />
            <MoreMenu open={moreOpen} onOpenChange={setMoreOpen} />
        </>
    );
}

type DestinationItem = (typeof primaryDestinations)[number];

function Destination({ item, active, disabled }: { item: DestinationItem; active: boolean; disabled: boolean }) {
    const { t } = useTranslation();
    const Icon = item.icon;

    return (
        <Link
            href={disabled ? storesRoutes.index.url() : item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:min-h-14 md:flex-none',
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

function QuickActionTrigger({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={onClick}
            className="group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold text-primary transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 md:order-first md:mb-2 md:min-h-16 md:flex-none md:bg-secondary"
        >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_22px_-14px_var(--app-shadow)] transition group-hover:bg-primary/90">
                <ScanLine className="size-5" />
            </span>
            <span className="truncate">{t('Aksi')}</span>
        </button>
    );
}

function MoreTrigger({ active, disabled, onClick }: { active: boolean; disabled: boolean; onClick: () => void }) {
    const { t } = useTranslation();
    const Icon = moreDestination.icon;

    return (
        <button
            type="button"
            aria-haspopup="dialog"
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'group flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 md:min-h-14 md:flex-none',
                active ? 'text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
        >
            <span className={cn('grid h-7 w-10 place-items-center rounded-xl', active && 'bg-secondary')}>
                <Icon className="size-5" />
            </span>
            <span className="truncate">{t(moreDestination.title)}</span>
        </button>
    );
}

function QuickActions({
    open,
    onOpenChange,
    mode,
    onModeChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: QuickActionMode;
    onModeChange: (mode: QuickActionMode) => void;
}) {
    const { t } = useTranslation();

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('Aksi cepat')}
            description={t('Pilih cara input, lalu pekerjaan yang ingin dilakukan.')}
            size="sm"
            bodyClassName="space-y-5"
        >
            <div role="tablist" aria-label={t('Cara input')} className="grid grid-cols-2 rounded-xl bg-secondary p-1">
                {(['scan', 'manual'] as const).map((value) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={mode === value}
                        onClick={() => onModeChange(value)}
                        className={cn(
                            'min-h-11 rounded-lg px-3 text-sm font-bold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            mode === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {t(value === 'scan' ? 'Scan' : 'Manual')}
                    </button>
                ))}
            </div>
            <div className="space-y-5">
                {quickActionGroups.map((group) => (
                    <section key={group.title}>
                        <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{t(group.title)}</h3>
                        <div className="overflow-hidden rounded-2xl border border-border">
                            {group.items.map((item) => (
                                <Link
                                    key={item.title}
                                    href={quickActionHref(item.href, mode, 'supportsScan' in item ? item.supportsScan : true)}
                                    onClick={() => onOpenChange(false)}
                                    className="group flex min-h-14 items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                                >
                                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                        <item.icon className="size-5" />
                                    </span>
                                    <span className="min-w-0 flex-1 text-sm font-bold">{t(item.title)}</span>
                                    <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
                                </Link>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </ResponsiveDialog>
    );
}

function MoreMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const { t } = useTranslation();

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('Menu lainnya')}
            description={t('Operasional, keuangan, master data, dan pengaturan toko.')}
            size="lg"
            bodyClassName="grid gap-6 sm:grid-cols-2"
        >
            {moreMenuSections.map((section) => (
                <section key={section.title}>
                    <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{t(section.title)}</h3>
                    <div className="space-y-1">
                        {section.items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => onOpenChange(false)}
                                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <item.icon className="size-5 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1">{t(item.title)}</span>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </Link>
                        ))}
                    </div>
                </section>
            ))}
        </ResponsiveDialog>
    );
}
