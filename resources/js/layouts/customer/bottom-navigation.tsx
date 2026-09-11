import { Link, usePage } from '@inertiajs/react';
import { BarChart3, ChevronRight, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAppearance } from '@/hooks/use-appearance';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { CustomerPageProps } from '@/layouts/customer/customer-page-props';
import { cashierActions, manualCashierActions, moreMenuSections, primaryItems } from '@/layouts/customer/navigation-items';
import { useTranslation } from '@/lib/i18n';
import { storeThemeVariables } from '@/lib/store-theme';
import { cn } from '@/lib/utils';

export function BottomNavigation() {
    useTranslation();
    const { currentUrl } = useCurrentUrl();
    const { activeStore } = usePage<CustomerPageProps>().props;

    const isActive = (href: string) => currentUrl === href || currentUrl.startsWith(`${href}/`);
    const cashierActive = ['/pos', '/purchasing', '/operations/inventory', '/master-data/products'].some((href) => isActive(href));
    const moreActive = [
        '/reports',
        '/stores',
        '/expenses',
        '/operations/cash',
        '/operations/capital',
        '/operations/stock-opnames',
        '/master-data/suppliers',
        '/subscription',
    ].some((href) => isActive(href));

    return (
        <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 md:bottom-4 md:px-4">
            <div className="mx-auto grid max-w-[740px] grid-cols-5 items-end border-t border-border bg-card px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+.5rem)] shadow-lg md:rounded-[22px] md:border-0 md:px-4 md:pb-2">
                <BottomNavLink item={primaryItems[0]} active={isActive(primaryItems[0].href)} disabled={!activeStore} />
                <BottomNavLink item={primaryItems[1]} active={isActive(primaryItems[1].href)} disabled={!activeStore} />
                <CashierMenu active={cashierActive} disabled={!activeStore} />
                <BottomNavLink item={primaryItems[2]} active={isActive(primaryItems[2].href)} disabled={!activeStore} />
                <MoreMenu active={moreActive} disabled={!activeStore} />
            </div>
        </nav>
    );
}

function BottomNavLink({ item, active, disabled }: { item: (typeof primaryItems)[number]; active: boolean; disabled: boolean }) {
    const { t } = useTranslation();
    const Icon = item.icon;

    return (
        <Link
            href={disabled ? '/stores' : item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-xs font-semibold transition',
                active ? 'text-[var(--app-primary)]' : 'text-[var(--muted-foreground)]',
            )}
        >
            <span
                className={cn(
                    'relative flex h-8 w-11 items-center justify-center rounded-xl transition',
                    active
                        ? 'bg-[var(--app-soft)] text-[var(--app-primary)]'
                        : 'group-hover:bg-[var(--app-soft)] group-hover:text-[var(--app-primary)]',
                )}
            >
                <Icon className="size-[1.15rem]" strokeWidth={active ? 2.5 : 2} />
                {active && <span className="absolute -top-1 size-1 rounded-full bg-[#e2793c]" />}
            </span>
            <span className="truncate">{t(item.title)}</span>
        </Link>
    );
}

function CashierMenu({ active, disabled }: { active: boolean; disabled: boolean }) {
    const { activeStore } = usePage<CustomerPageProps>().props;
    const { resolvedAppearance } = useAppearance();
    const { t } = useTranslation();
    const [cashierMode, setCashierMode] = useState<'scan' | 'manual'>('scan');

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'group relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-0 text-xs font-semibold transition',
                        active ? 'text-[var(--app-primary)]' : 'text-[var(--muted-foreground)]',
                        disabled && 'opacity-60',
                    )}
                    disabled={disabled}
                >
                    <span
                        className={cn(
                            'relative flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full border-4 border-card bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-[0_14px_28px_-16px_var(--app-shadow)] transition group-hover:bg-[var(--workspace-700)]',
                            active && 'ring-4 ring-[var(--app-soft-strong)]',
                        )}
                    >
                        <ShoppingCart className="size-6" />
                        {active && <span className="absolute -top-0.5 right-1.5 size-2 rounded-full bg-[#f7c46b]" />}
                    </span>
                    <span className="-mt-4 text-[10px] font-black tracking-wide text-[var(--app-ink)] uppercase">{t('Kasir')}</span>
                </button>
            </SheetTrigger>

            <SheetContent
                style={storeThemeVariables(activeStore?.theme_color, resolvedAppearance)}
                side="bottom"
                className="max-h-[90svh] overflow-y-auto rounded-t-[1.5rem] border-0 bg-background p-0 text-[var(--app-ink)] shadow-[0_-24px_70px_-20px_var(--app-shadow)] sm:rounded-t-[1.75rem] [&>button]:top-4 [&>button]:right-4 [&>button]:size-9 [&>button]:rounded-xl [&>button]:bg-card [&>button]:opacity-100 [&>button]:shadow-sm [&>button]:ring-1 [&>button]:ring-[var(--app-ink)]/8"
            >
                <SheetHeader className="mx-auto w-full max-w-lg px-4 pt-5 pb-3 text-left sm:px-6 sm:pt-6">
                    <div className="mb-3 h-1 w-10 self-center rounded-full bg-[var(--app-primary)]/25" />
                    <SheetTitle className="pr-12 text-lg font-black tracking-[-0.03em] text-[var(--app-ink)] sm:text-xl">
                        Kasir cepat
                    </SheetTitle>
                    <SheetDescription className="sr-only">Pilih mode dan aksi kasir</SheetDescription>
                </SheetHeader>

                <div className="mx-auto w-full max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-6 sm:pb-6">
                    <div
                        role="tablist"
                        aria-label="Mode kasir"
                        className="mb-3 grid grid-cols-2 rounded-xl bg-secondary p-1 ring-1 ring-[#ee4d2d]/8"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={cashierMode === 'scan'}
                            onClick={() => setCashierMode('scan')}
                            className={cn(
                                'min-h-10 rounded-lg px-3 text-xs font-black transition focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/35 focus-visible:outline-none sm:text-sm',
                                cashierMode === 'scan'
                                    ? 'bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-[0_8px_18px_-12px_var(--app-shadow)]'
                                    : 'text-muted-foreground hover:bg-card/60 hover:text-[var(--app-ink)]',
                            )}
                        >
                            Scan produk
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={cashierMode === 'manual'}
                            onClick={() => setCashierMode('manual')}
                            className={cn(
                                'min-h-10 rounded-lg px-3 text-xs font-black transition focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/35 focus-visible:outline-none sm:text-sm',
                                cashierMode === 'manual'
                                    ? 'bg-[var(--app-primary)] text-[var(--app-primary-foreground)] shadow-[0_8px_18px_-12px_var(--app-shadow)]'
                                    : 'text-muted-foreground hover:bg-card/60 hover:text-[var(--app-ink)]',
                            )}
                        >
                            Tanpa scan
                        </button>
                    </div>

                    <div
                        role="tabpanel"
                        className="divide-y divide-[var(--app-ink)]/8 overflow-hidden rounded-2xl bg-card shadow-[0_16px_36px_-28px_var(--app-shadow)] ring-1 ring-[var(--app-ink)]/8"
                    >
                        {(cashierMode === 'scan' ? cashierActions : manualCashierActions).map((item) => (
                            <SheetClose asChild key={item.title}>
                                <Link
                                    href={
                                        cashierMode === 'scan' && item.href !== '/operations/inventory' ? `${item.href}?scan=1` : item.href
                                    }
                                    className="group flex min-h-14 items-center gap-3 px-3 py-2.5 transition hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:min-h-16 sm:px-4"
                                >
                                    <span
                                        className={cn(
                                            'flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-[1.04]',
                                            item.iconClassName,
                                        )}
                                    >
                                        <item.icon className="size-[1.1rem]" strokeWidth={2.25} />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-black text-[var(--app-ink)]">{t(item.title)}</span>
                                    </span>
                                    <span className="grid size-8 shrink-0 place-items-center rounded-lg text-[#9a817a] transition group-hover:bg-card group-hover:text-[var(--app-primary)]">
                                        <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                    </span>
                                </Link>
                            </SheetClose>
                        ))}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function MoreMenu({ active, disabled }: { active: boolean; disabled: boolean }) {
    const { activeStore } = usePage<CustomerPageProps>().props;
    const { resolvedAppearance } = useAppearance();
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const theme = storeThemeVariables(activeStore?.theme_color, resolvedAppearance);
    const trigger = (
        <button
            type="button"
            disabled={disabled}
            className={cn(
                'group flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-ring',
                active ? 'text-primary' : 'text-muted-foreground',
                disabled && 'opacity-60',
            )}
        >
            <span
                className={cn(
                    'flex h-8 w-11 items-center justify-center rounded-xl',
                    active ? 'bg-accent text-primary' : 'group-hover:bg-accent',
                )}
            >
                <BarChart3 className="size-5" />
            </span>
            <span>{t('Lainnya')}</span>
        </button>
    );
    const links = (
        <div className="grid gap-6 md:grid-cols-2">
            {moreMenuSections.map((section) => (
                <section key={section.title}>
                    <h3 className="mb-2 px-3 text-sm font-semibold text-muted-foreground">{t(section.title)}</h3>
                    <div>
                        {section.items.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                <item.icon className="size-5 shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1">{t(item.title)}</span>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </Link>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
    const scroll = 'overflow-y-auto overscroll-contain [scrollbar-color:var(--muted-foreground)_transparent]';

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent
                side="bottom"
                style={theme}
                className={cn('max-h-[85svh] rounded-t-2xl border-0 bg-popover p-0 text-popover-foreground', scroll)}
            >
                <SheetHeader className="mx-auto w-full max-w-3xl px-5 pt-5 pb-4 text-left">
                    <SheetTitle>{t('Menu lainnya')}</SheetTitle>
                    <SheetDescription className="sr-only">{t('Kelola operasional dan akun.')}</SheetDescription>
                </SheetHeader>
                <div className="mx-auto w-full max-w-3xl px-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">{links}</div>
            </SheetContent>
        </Sheet>
    );
}
