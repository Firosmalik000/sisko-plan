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
import { Breadcrumbs } from '@/components/breadcrumbs';
import LanguageSwitcher from '@/components/language-switcher';
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
import { customerBackTarget } from '@/layouts/customer/customer-back-target';
import type { CustomerPageProps } from '@/layouts/customer/customer-page-props';
import { StoreSwitcher } from '@/layouts/customer/store-switcher';
import { formatQuantity } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { storeThemeVariables } from '@/lib/store-theme';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { BreadcrumbItem } from '@/types';

export function CustomerHeader({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
    const { t } = useTranslation();
    const { auth, stores, activeStore, storeCreation, stockAlerts } = usePage<CustomerPageProps>().props;
    const getInitials = useInitials();
    const [profilePanel, setProfilePanel] = useState<'main' | 'language' | 'appearance'>('main');
    const profileContent = useRef<HTMLDivElement>(null);
    const { locale } = usePage().props;
    useEffect(() => {
        profileContent.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }, [profilePanel]);
    const { appearance, resolvedAppearance } = useAppearance();
    const theme = storeThemeVariables(activeStore?.theme_color, resolvedAppearance);
    const [stockNoticeOpen, setStockNoticeOpen] = useState(false);
    const pageUrl = usePage().url;
    const parsedUrl = new URL(pageUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const backTarget = customerBackTarget(parsedUrl.pathname, parsedUrl.searchParams);
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
            '/notifications/stock-alerts/read',
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['stockAlerts'],
                onError: () => setAcknowledgedUnreadKey(null),
            },
        );
    };

    return (
        <header className="sticky top-0 z-40 border-t-[3px] border-b border-border border-t-[var(--app-primary)] bg-card pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 min-[375px]:px-4 sm:h-[72px] sm:gap-5 sm:px-6 lg:px-7">
                {backTarget && (
                    <Link
                        href={backTarget.href}
                        aria-label={backTarget.label}
                        className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--app-ink)] transition hover:bg-[var(--app-soft)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/30 focus-visible:outline-none"
                    >
                        <ArrowLeft className="size-5" />
                    </Link>
                )}
                <Link
                    href="/dashboard"
                    className="hidden shrink-0 items-center gap-2.5 text-lg font-black tracking-[-0.04em] text-[var(--app-ink)] md:flex"
                >
                    <span className="grid size-8 place-items-center rounded-lg bg-[var(--app-primary)] text-sm font-black text-[var(--app-primary-foreground)]">
                        S
                    </span>
                    Sisko Plan
                </Link>
                <StoreSwitcher stores={stores} activeStore={activeStore} storeCreation={storeCreation} />

                <DropdownMenu open={stockNoticeOpen} onOpenChange={handleStockNoticeOpen}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Buka notifikasi'}
                            className={cn(
                                'relative ml-auto grid size-11 shrink-0 place-items-center rounded-full transition focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/30 focus-visible:outline-none',
                                unreadCount > 0
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                    : 'text-[var(--app-primary)] hover:bg-[var(--app-soft-strong)]',
                            )}
                        >
                            <Bell className="size-[18px]" />
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 grid min-w-4 translate-x-1/4 -translate-y-1/4 place-items-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-black text-white ring-2 ring-[#fffdfc]">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        style={theme}
                        align="end"
                        sideOffset={10}
                        className="w-[min(23rem,calc(100vw-1.25rem))] overflow-hidden rounded-[1.4rem] border-[var(--app-ink)]/10 bg-popover p-0 shadow-xl"
                    >
                        <div className="flex items-center justify-between border-b border-[var(--app-ink)]/8 px-4 py-3.5">
                            <div>
                                <p className="text-sm font-black text-[var(--app-ink)]">Notifikasi</p>
                                <p className="mt-0.5 text-[11px] font-semibold text-[var(--muted-foreground)]">
                                    {stockAlertCount > 0
                                        ? `${stockAlertCount} ${t('stok perlu perhatian')}`
                                        : t('Semua stok dalam kondisi aman')}
                                </p>
                            </div>
                            {unreadCount === 0 && stockAlertCount > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--app-soft)] px-2 py-1 text-[10px] font-bold text-[var(--app-primary)]">
                                    <CheckCheck className="size-3" />
                                    Sudah dibaca
                                </span>
                            )}
                        </div>

                        {stockAlertCount === 0 ? (
                            <div className="grid place-items-center px-6 py-9 text-center">
                                <span className="grid size-11 place-items-center rounded-2xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                                    <CheckCheck className="size-5" />
                                </span>
                                <p className="mt-3 text-sm font-black text-[var(--app-ink)]">Tidak ada notifikasi</p>
                            </div>
                        ) : (
                            <div className="max-h-[min(25rem,calc(100svh-11rem))] overflow-y-auto p-2">
                                {stockAlerts?.items.map((item) => {
                                    const empty = Number(item.quantity) <= 0;
                                    const itemUnread = item.unread && acknowledgedUnreadKey !== unreadKey;

                                    return (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                'relative flex gap-3 rounded-2xl px-3 py-3',
                                                itemUnread ? 'bg-red-50/90' : 'bg-transparent',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'grid size-9 shrink-0 place-items-center rounded-xl',
                                                    empty ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                                                )}
                                            >
                                                <AlertTriangle className="size-4" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-black text-[var(--app-ink)]">{item.name}</p>
                                                        {item.variant_name && (
                                                            <p className="truncate text-[10px] font-semibold text-[var(--muted-foreground)]">
                                                                {item.variant_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                    {itemUnread && (
                                                        <span
                                                            aria-label="Belum dibaca"
                                                            className="mt-1 size-2 shrink-0 rounded-full bg-red-600"
                                                        />
                                                    )}
                                                </div>
                                                <p
                                                    className={cn(
                                                        'mt-1.5 text-[11px] font-bold',
                                                        empty ? 'text-red-700' : 'text-amber-700',
                                                    )}
                                                >
                                                    {empty ? 'Stok habis' : `Sisa ${formatQuantity(item.quantity)} ${item.unit}`}
                                                    <span className="font-medium text-[var(--muted-foreground)]">
                                                        {' '}
                                                        · Batas {formatQuantity(item.minimum_quantity)} {item.unit}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {stockAlertCount > 0 && (
                            <DropdownMenuItem asChild className="m-2 mt-0 rounded-xl p-0 focus:bg-[var(--app-soft)]">
                                <Link
                                    href="/operations/inventory"
                                    className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-black text-[var(--app-primary)]"
                                >
                                    Lihat inventori
                                    <ChevronRight className="size-3.5" />
                                </Link>
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

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
                            className="max-h-[min(38rem,calc(100svh-6rem))] w-[min(20rem,calc(100vw-2rem))] [scrollbar-color:var(--muted-foreground)_transparent] overflow-y-auto rounded-2xl border-[var(--app-ink)]/10 bg-popover p-2 shadow-xl"
                        >
                            {profilePanel === 'main' ? (
                                <>
                                    <DropdownMenuLabel className="px-3 py-3 font-normal">
                                        <p className="truncate text-sm font-semibold text-[var(--app-ink)]">{auth.user.name}</p>
                                        <p className="mt-0.5 truncate text-[11px] text-[var(--muted-foreground)]">{auth.user.email}</p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild className="rounded-xl p-3">
                                        <Link href={edit()}>
                                            <UserRound className="size-4" />
                                            {t('Profil')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-xl p-3">
                                        <Link href="/settings/security">
                                            <ShieldCheck className="size-4" />
                                            {t('Keamanan')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="rounded-xl p-3">
                                        <Link href="/subscription">
                                            <CreditCard className="size-4" />
                                            {t('Langganan')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onSelect={(event) => {
                                            event.preventDefault();
                                            setProfilePanel('language');
                                        }}
                                        className="min-h-11 gap-3 rounded-xl px-3"
                                    >
                                        <Globe2 className="size-4" />
                                        <span>{t('Bahasa')}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {locale === 'en' ? 'English' : locale === 'ms' ? 'Melayu' : 'Indonesia'}
                                        </span>
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

            {breadcrumbs.length > 0 && (
                <div className="border-t border-[var(--app-ink)]/6 px-4 py-2.5 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-[1296px] overflow-x-auto text-xs text-[var(--muted-foreground)] [&_ol]:flex-nowrap [&_ol]:whitespace-nowrap">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </header>
    );
}
