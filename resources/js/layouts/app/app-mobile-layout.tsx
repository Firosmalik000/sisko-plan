import { Link, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Bell,
    Boxes,
    CircleDollarSign,
    Check,
    CheckCheck,
    ClipboardCheck,
    ChevronDown,
    ChevronRight,
    CreditCard,
    Handshake,
    Globe2,
    Sun,
    LockKeyhole,
    Home,
    LogOut,
    PackageSearch,
    Plus,
    ReceiptText,
    ShieldCheck,
    UserRound,
    ShoppingCart,
    Store,
    Truck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AppearanceToggleTab from '@/components/appearance-tabs';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import LanguageSwitcher from '@/components/language-switcher';
import { SubscriptionBanner } from '@/components/subscription-banner';
import { SubscriptionLimitContactDialog } from '@/components/subscription-limit-contact-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAppearance } from '@/hooks/use-appearance';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { formatQuantity } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import { storeThemeVariables } from '@/lib/store-theme';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { AppLayoutProps, BreadcrumbItem, StoreCreationState, StoreSummary, User } from '@/types';

type CustomerPageProps = {
    name: string;
    branding: { logo_url: string | null };
    auth: { user: User | null };
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
    storeCreation: StoreCreationState | null;
    stockAlerts?: {
        count: number;
        unread_count: number;
        items: Array<{
            id: number;
            name: string;
            variant_name: string | null;
            unit: string;
            quantity: string;
            minimum_quantity: string;
            unread: boolean;
        }>;
    };
};

const primaryItems = [
    { title: 'Beranda', href: '/dashboard', icon: Home },
    { title: 'Produk', href: '/master-data/products', icon: PackageSearch },
    { title: 'Transaksi', href: '/sales', icon: ReceiptText },
];

const cashierActions = [
    {
        title: 'Scan penjualan',
        href: '/pos',
        icon: ShoppingCart,
        iconClassName: 'bg-orange-50 text-orange-700',
    },
    {
        title: 'Scan kulakan',
        href: '/purchasing',
        icon: Truck,
        iconClassName: 'bg-sky-50 text-sky-700',
    },
    {
        title: 'Cek stok',
        href: '/operations/inventory',
        icon: Boxes,
        iconClassName: 'bg-emerald-50 text-emerald-700',
    },
    {
        title: 'Scan produk baru',
        href: '/master-data/products',
        icon: PackageSearch,
        iconClassName: 'bg-amber-50 text-amber-700',
    },
];

const manualCashierActions = [
    {
        title: 'Input penjualan',
        href: '/pos',
        icon: ShoppingCart,
        iconClassName: 'bg-orange-50 text-orange-700',
    },
    {
        title: 'Input kulakan',
        href: '/purchasing',
        icon: Truck,
        iconClassName: 'bg-sky-50 text-sky-700',
    },
    {
        title: 'Cek stok manual',
        href: '/operations/inventory',
        icon: Boxes,
        iconClassName: 'bg-emerald-50 text-emerald-700',
    },
    {
        title: 'Tambah produk',
        href: '/master-data/products',
        icon: PackageSearch,
        iconClassName: 'bg-amber-50 text-amber-700',
    },
];

const moreMenuSections = [
    {
        title: 'Operasional',
        items: [
            {
                title: 'Laporan',
                href: '/reports',
                icon: BarChart3,
            },
            {
                title: 'Stok',
                href: '/operations/inventory',
                icon: Boxes,
            },
            {
                title: 'Stock opname',
                href: '/operations/stock-opnames',
                icon: ClipboardCheck,
            },
            {
                title: 'Pembelian',
                href: '/purchasing',
                icon: Truck,
            },
            {
                title: 'Supplier',
                href: '/master-data/suppliers',
                icon: Handshake,
            },
            {
                title: 'Kas & Bank',
                href: '/operations/cash',
                icon: CreditCard,
            },
            {
                title: 'Biaya',
                href: '/expenses',
                icon: CircleDollarSign,
            },
            {
                title: 'Toko',
                href: '/stores',
                icon: Store,
            },
        ],
    },
    {
        title: 'Akun & Paket',
        items: [
            {
                title: 'Modal',
                href: '/operations/capital',
                icon: Plus,
            },
            {
                title: 'Langganan',
                href: '/subscription',
                icon: Check,
            },
        ],
    },
];

export default function AppMobileLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
    const { activeStore } = usePage<CustomerPageProps>().props;
    const { resolvedAppearance } = useAppearance();

    return (
        <div
            className="customer-workspace min-h-svh [scrollbar-color:var(--muted-foreground)_transparent] bg-background font-sans text-foreground [&_*]:[scrollbar-color:var(--muted-foreground)_transparent] [html:has(&)]:[scrollbar-color:var(--muted-foreground)_transparent]"
            style={storeThemeVariables(activeStore?.theme_color, resolvedAppearance)}
        >
            <ImpersonationBanner />
            <CustomerHeader breadcrumbs={breadcrumbs} />
            <SubscriptionBanner />
            <main className="min-h-[calc(100svh-4rem)] overflow-x-hidden pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-36">
                {children}
            </main>
            <BottomNavigation />
        </div>
    );
}

function CustomerHeader({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
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
        <header className="sticky top-0 z-40 border-b border-border/60 bg-card pt-[env(safe-area-inset-top)]">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:h-18 sm:px-6 lg:px-8">
                {backTarget && (
                    <Link
                        href={backTarget.href}
                        aria-label={backTarget.label}
                        className="grid size-10 shrink-0 place-items-center rounded-xl text-[var(--app-ink)] transition hover:bg-[var(--app-soft)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]/30 focus-visible:outline-none"
                    >
                        <ArrowLeft className="size-5" />
                    </Link>
                )}
                <StoreMenu stores={stores} activeStore={activeStore} storeCreation={storeCreation} />

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
                    <div className="mx-auto max-w-7xl overflow-x-auto text-xs text-[var(--muted-foreground)] [&_ol]:flex-nowrap [&_ol]:whitespace-nowrap">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </header>
    );
}

function customerBackTarget(pathname: string, searchParams: URLSearchParams) {
    if (pathname === '/sales' && searchParams.get('from') === 'pos') {
        return { href: '/pos', label: 'Kembali ke kasir' };
    }

    const returnMatch = pathname.match(/^\/sales\/([^/]+)\/returns\/create$/);

    if (returnMatch) {
        const query = new URLSearchParams();

        ['period', 'view', 'from'].forEach((key) => {
            const value = searchParams.get(key);

            if (value) {
                query.set(key, value);
            }
        });

        return {
            href: `/sales/${returnMatch[1]}${query.size ? `?${query}` : ''}`,
            label: 'Kembali ke invoice',
        };
    }

    if (/^\/sales\/[^/]+$/.test(pathname)) {
        const query = new URLSearchParams();

        ['period', 'view', 'from'].forEach((key) => {
            const value = searchParams.get(key);

            if (value) {
                query.set(key, value);
            }
        });

        return {
            href: `/sales${query.size ? `?${query}` : ''}`,
            label: 'Kembali ke transaksi',
        };
    }

    const stockOpnameMatch = pathname.match(/^\/operations\/stock-opnames\/[^/]+$/);

    if (stockOpnameMatch) {
        return {
            href: '/operations/stock-opnames',
            label: 'Kembali ke stok opname',
        };
    }

    const appSubpages = [
        '/pos',
        '/purchasing',
        '/operations/inventory',
        '/operations/stock-opnames',
        '/operations/cash',
        '/operations/capital',
        '/master-data/suppliers',
        '/master-data/categories',
        '/master-data/units',
        '/master-data/financial-accounts',
        '/expenses',
        '/reports',
        '/stores',
        '/subscription',
        '/settings',
    ];

    if (appSubpages.some((path) => pathname.startsWith(path))) {
        return { href: '/dashboard', label: 'Kembali ke beranda' };
    }

    return null;
}

function StoreMenu({
    stores,
    activeStore,
    storeCreation,
}: {
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
    storeCreation: StoreCreationState | null;
}) {
    const canCreateStore = storeCreation?.can_create ?? false;
    const [limitOpen, setLimitOpen] = useState(false);
    const { resolvedAppearance } = useAppearance();

    if (!activeStore) {
        return (
            <>
                {canCreateStore ? (
                    <Link
                        href="/stores/create"
                        className="flex min-w-0 items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-sm ring-1 ring-[var(--app-ink)]/8"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f5b942] text-[var(--app-ink)]">
                            <Plus className="size-4" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">Buat toko</span>
                            <span className="block truncate text-[10px] text-[var(--muted-foreground)]">Mulai operasional</span>
                        </span>
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={() => setLimitOpen(true)}
                        className="flex min-w-0 items-center gap-2 rounded-2xl bg-card px-3 py-2 text-left shadow-sm ring-1 ring-[var(--app-ink)]/8"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f5b942] text-[var(--app-ink)]">
                            <LockKeyhole className="size-4" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">Tambah kapasitas</span>
                            <span className="block truncate text-xs text-[var(--muted-foreground)]">Hubungi admin</span>
                        </span>
                    </button>
                )}
                <SubscriptionLimitContactDialog kind="store" open={limitOpen} onOpenChange={setLimitOpen} />
            </>
        );
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-xl px-1 py-1.5 text-left transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring sm:max-w-sm"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--app-soft-strong)] text-[var(--app-primary)]">
                            <Store className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground sm:text-base">{activeStore.name}</span>
                        </span>
                        <ChevronDown className="size-3.5 shrink-0 text-[var(--muted-foreground)]" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    style={storeThemeVariables(activeStore.theme_color, resolvedAppearance)}
                    align="start"
                    className="max-h-[70svh] w-72 max-w-[calc(100vw-2rem)] [scrollbar-color:var(--muted-foreground)_transparent] overflow-y-auto rounded-2xl border-[var(--app-ink)]/10 p-2 shadow-xl"
                >
                    <DropdownMenuLabel className="px-3 py-2 text-xs text-muted-foreground">Pilih ruang kerja</DropdownMenuLabel>
                    {stores.map((store) => (
                        <DropdownMenuItem
                            key={store.public_id}
                            className="gap-3 rounded-xl p-3"
                            onSelect={() =>
                                router.post(
                                    `/stores/${store.public_id}/switch`,
                                    {},
                                    {
                                        preserveState: false,
                                        preserveScroll: false,
                                    },
                                )
                            }
                        >
                            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                                <Store className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{store.name}</span>
                                <span className="block text-[11px] text-muted-foreground capitalize">{store.role}</span>
                            </span>
                            {store.public_id === activeStore.public_id && <Check className="size-4 text-emerald-700" />}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {canCreateStore ? (
                        <DropdownMenuItem asChild className="rounded-xl p-3">
                            <Link href="/stores/create">
                                <Plus className="size-4" />
                                Tambah toko baru
                            </Link>
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem className="rounded-xl p-3" onSelect={() => setLimitOpen(true)}>
                            <LockKeyhole className="size-4" />
                            Tambah kapasitas toko
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <SubscriptionLimitContactDialog kind="store" open={limitOpen} onOpenChange={setLimitOpen} />
        </>
    );
}

function BottomNavigation() {
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
            <div className="mx-auto grid max-w-[740px] grid-cols-5 items-end border-t border-border/60 bg-card px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+.5rem)] shadow-lg md:rounded-2xl md:border-0 md:px-3 md:pb-2">
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
                'group flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-xs font-semibold transition',
                active ? 'text-[var(--app-primary)]' : 'text-[var(--muted-foreground)]',
            )}
        >
            <span
                className={cn(
                    'relative flex h-8 w-11 items-center justify-center rounded-xl transition',
                    active
                        ? 'bg-[var(--app-soft-strong)] text-[var(--app-primary)]'
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
                        'group relative flex min-w-0 flex-col items-center gap-1 rounded-3xl px-1 py-0 text-xs font-semibold transition',
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
