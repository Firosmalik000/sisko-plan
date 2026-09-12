import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Bell,
    CheckCheck,
    ChevronRight,
    CreditCard,
    Globe2,
    LogOut,
    ShieldCheck,
    Sun,
    UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppearanceToggleTab from '@/components/appearance-tabs';
import LanguageSwitcher from '@/components/language-switcher';
import { ResponsiveDialog } from '@/components/overlays';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { useInitials } from '@/hooks/use-initials';
import { useIsMobile } from '@/hooks/use-mobile';
import type { CustomerPageProps } from '@/layouts/customer/customer-page-props';
import { StoreSwitcher } from '@/layouts/customer/store-switcher';
import { formatQuantity } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { storeThemeVariables } from '@/lib/store-theme';
import { cn } from '@/lib/utils';
import { dashboard, logout } from '@/routes';
import notificationsRoutes from '@/routes/notifications';
import operationsRoutes from '@/routes/operations';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import subscriptionRoutes from '@/routes/subscription';

export function CustomerHeader() {
    const { t } = useTranslation();
    const { auth, stores, activeStore, storeCreation, stockAlerts } = usePage<CustomerPageProps>().props;
    const getInitials = useInitials();
    const [profilePanel, setProfilePanel] = useState<'main' | 'language' | 'appearance'>('main');
    const profileContent = useRef<HTMLDivElement>(null);
    const { locale, locales } = usePage().props;
    const localeLabel = locales?.find((option) => option.code === locale)?.label ?? locale?.toUpperCase();
    useEffect(() => {
        profileContent.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }, [profilePanel]);
    const { appearance, resolvedAppearance } = useAppearance();
    const isMobile = useIsMobile();
    const theme = storeThemeVariables(activeStore?.theme_color, resolvedAppearance);
    const [stockNoticeOpen, setStockNoticeOpen] = useState(false);
    const [acknowledgedUnreadKey, setAcknowledgedUnreadKey] = useState<string | null>(null);
    const stockAlertCount = stockAlerts?.count ?? 0;
    const serverUnreadCount = stockAlerts?.unread_count ?? 0;
    const unreadKey =
        stockAlerts?.items
            .filter((item) => item.unread)
            .map((item) => item.id)
            .join(':') ?? '';
    const unreadCount = acknowledgedUnreadKey === unreadKey ? 0 : serverUnreadCount;

    const handleStockNoticeOpen = (open: boolean) => {
        setStockNoticeOpen(open);

        if (!open || unreadCount === 0) {
            return;
        }

        setAcknowledgedUnreadKey(unreadKey);
        router.post(
            notificationsRoutes.stockAlerts.read.url(),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['stockAlerts'],
                onError: () => setAcknowledgedUnreadKey(null),
            },
        );
    };
    const notificationTrigger = (
        <button
            type="button"
            onClick={isMobile ? () => handleStockNoticeOpen(true) : undefined}
            aria-label={unreadCount > 0 ? `${unreadCount} ${t('notifikasi belum dibaca')}` : t('Buka notifikasi')}
            className={cn(
                'relative ml-auto grid size-11 shrink-0 place-items-center rounded-full transition focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none',
                unreadCount > 0 ? 'bg-destructive/10 text-destructive hover:bg-destructive/15' : 'text-primary hover:bg-secondary',
            )}
        >
            <Bell className="size-[18px]" aria-hidden="true" />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 grid min-w-5 translate-x-1/4 -translate-y-1/4 place-items-center rounded-full bg-destructive px-1 text-xs leading-5 font-bold text-white ring-2 ring-card">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </button>
    );

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-card pt-[env(safe-area-inset-top)] lg:border-t-2 lg:border-t-[var(--app-primary)]">
            <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 min-[375px]:px-4 sm:h-[72px] sm:gap-5 sm:px-6 lg:px-7">
                <Link
                    href={dashboard.url()}
                    className="hidden shrink-0 items-center gap-2.5 text-lg font-black tracking-[-0.04em] text-[var(--app-ink)] md:flex"
                >
                    <span className="grid size-8 place-items-center rounded-lg bg-[var(--app-primary)] text-sm font-black text-[var(--app-primary-foreground)]">
                        S
                    </span>
                    Sisko Plan
                </Link>
                <StoreSwitcher stores={stores} activeStore={activeStore} storeCreation={storeCreation} />

                {isMobile ? (
                    <>
                        {notificationTrigger}
                        <ResponsiveDialog
                            open={stockNoticeOpen}
                            onOpenChange={handleStockNoticeOpen}
                            title={t('Notifikasi')}
                            description={
                                stockAlertCount > 0 ? `${stockAlertCount} ${t('stok perlu perhatian')}` : t('Semua stok dalam kondisi aman')
                            }
                            size="sm"
                            bodyClassName="p-0 sm:p-0"
                        >
                            <StockNotificationContent
                                stockAlerts={stockAlerts}
                                acknowledgedUnreadKey={acknowledgedUnreadKey}
                                unreadKey={unreadKey}
                                onNavigate={() => setStockNoticeOpen(false)}
                            />
                        </ResponsiveDialog>
                    </>
                ) : (
                    <DropdownMenu open={stockNoticeOpen} onOpenChange={handleStockNoticeOpen}>
                        <DropdownMenuTrigger asChild>{notificationTrigger}</DropdownMenuTrigger>
                        <DropdownMenuContent
                            style={theme}
                            align="end"
                            sideOffset={10}
                            className="w-[min(23rem,calc(100vw-1.25rem))] overflow-hidden rounded-2xl border-border bg-popover p-0 shadow-xl dark:shadow-none"
                        >
                            <div className="border-b border-border px-4 py-3.5">
                                <p className="text-sm font-bold text-foreground">{t('Notifikasi')}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {stockAlertCount > 0
                                        ? `${stockAlertCount} ${t('stok perlu perhatian')}`
                                        : t('Semua stok dalam kondisi aman')}
                                </p>
                            </div>
                            <StockNotificationContent
                                stockAlerts={stockAlerts}
                                acknowledgedUnreadKey={acknowledgedUnreadKey}
                                unreadKey={unreadKey}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {auth.user && (
                    <DropdownMenu
                        onOpenChange={(open) => {
                            if (!open) {
                                setProfilePanel('main');
                            }
                        }}
                    >
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Buka menu akun"
                                className="grid size-11 shrink-0 place-items-center rounded-full ring-[var(--app-primary)]/30 transition outline-none focus-visible:ring-4"
                            >
                                <Avatar className="size-9">
                                    <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                    <AvatarFallback className="bg-[var(--app-soft-strong)] text-xs font-bold text-[var(--app-primary)]">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            ref={profileContent}
                            style={theme}
                            align="end"
                            sideOffset={10}
                            className="max-h-[min(38rem,calc(100svh-6rem))] w-[min(20rem,calc(100vw-2rem))] [scrollbar-color:var(--muted-foreground)_transparent] overflow-y-auto rounded-2xl border-border bg-popover p-2 shadow-xl dark:shadow-none"
                        >
                            {profilePanel === 'main' ? (
                                <>
                                    <DropdownMenuLabel className="px-3 py-3 font-normal">
                                        <p className="truncate text-sm font-semibold text-[var(--app-ink)]">{auth.user.name}</p>
                                        <p className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">{auth.user.email}</p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground">
                                        {t('Akun')}
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem asChild className="rounded-xl p-3">
                                        <Link href={edit()}>
                                            <UserRound className="size-4" />
                                            {t('Profil')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-xl p-3">
                                        <Link href={editSecurity()}>
                                            <ShieldCheck className="size-4" />
                                            {t('Keamanan')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground">
                                        {t('Preferensi')}
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            setProfilePanel('language');
                                        }}
                                        className="min-h-11 gap-3 rounded-xl px-3"
                                    >
                                        <Globe2 className="size-4" />
                                        <span>{t('Bahasa')}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">{localeLabel}</span>
                                        <ChevronRight className="size-4" />
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            setProfilePanel('appearance');
                                        }}
                                        className="min-h-11 gap-3 rounded-xl px-3"
                                    >
                                        <Sun className="size-4" />
                                        <span>{t('Tampilan')}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {t(appearance === 'light' ? 'Terang' : appearance === 'dark' ? 'Gelap' : 'Sistem')}
                                        </span>
                                        <ChevronRight className="size-4" />
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground">
                                        {t('Paket')}
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem asChild className="rounded-xl p-3">
                                        <Link href={subscriptionRoutes.index.url()}>
                                            <CreditCard className="size-4" />
                                            {t('Langganan')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="rounded-xl p-3 text-rose-700">
                                        <Link href={logout()} as="button" className="w-full" onClick={() => router.flushAll()}>
                                            <LogOut className="size-4" />
                                            {t('Keluar')}
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            setProfilePanel('main');
                                        }}
                                        className="min-h-11 gap-3 rounded-xl px-3 font-medium"
                                    >
                                        <ArrowLeft className="size-4" />
                                        {t('Kembali')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {profilePanel === 'language' ? (
                                        <LanguageSwitcher variant="settings" />
                                    ) : (
                                        <AppearanceToggleTab variant="menu" />
                                    )}
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}

function StockNotificationContent({
    stockAlerts,
    acknowledgedUnreadKey,
    unreadKey,
    onNavigate,
}: {
    stockAlerts: CustomerPageProps['stockAlerts'];
    acknowledgedUnreadKey: string | null;
    unreadKey: string;
    onNavigate?: () => void;
}) {
    const { t } = useTranslation();
    const items = stockAlerts?.items ?? [];

    if (items.length === 0) {
        return (
            <div className="grid place-items-center px-6 py-8 text-center">
                <span className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                    <CheckCheck className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">{t('Stok aman')}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('Tidak ada produk yang perlu diisi ulang.')}</p>
            </div>
        );
    }

    return (
        <>
            <div className="max-h-[min(25rem,calc(100svh-11rem))] overflow-y-auto p-2">
                {items.map((item) => {
                    const empty = Number(item.quantity) <= 0;
                    const itemUnread = item.unread && acknowledgedUnreadKey !== unreadKey;

                    return (
                        <Link
                            key={item.id}
                            href={operationsRoutes.inventory.url()}
                            onClick={onNavigate}
                            className={cn(
                                'relative flex gap-3 rounded-xl px-3 py-3 transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                itemUnread && 'bg-destructive/5',
                            )}
                        >
                            <span
                                className={cn(
                                    'grid size-9 shrink-0 place-items-center rounded-xl',
                                    empty ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-primary',
                                )}
                            >
                                <AlertTriangle className="size-4" aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
                                        {item.variant_name && <p className="truncate text-xs text-muted-foreground">{item.variant_name}</p>}
                                    </div>
                                    {itemUnread && (
                                        <span
                                            aria-label={t('Belum dibaca')}
                                            className="mt-1.5 size-2 shrink-0 rounded-full bg-destructive"
                                        />
                                    )}
                                </div>
                                <p className={cn('mt-1.5 text-xs font-medium', empty ? 'text-destructive' : 'text-primary')}>
                                    {empty ? t('Stok habis') : `${t('Sisa')} ${formatQuantity(item.quantity)} ${item.unit}`}
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {t('Batas')} {formatQuantity(item.minimum_quantity)} {item.unit}
                                    </span>
                                </p>
                            </div>
                            <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        </Link>
                    );
                })}
            </div>
            <div className="border-t border-border p-2">
                <Link
                    href={operationsRoutes.inventory.url()}
                    onClick={onNavigate}
                    className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-primary transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    {t('Lihat inventori')}
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                </Link>
            </div>
        </>
    );
}
