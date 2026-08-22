import { Link, router, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Boxes,
    CircleDollarSign,
    Check,
    ClipboardCheck,
    ChevronDown,
    ChevronRight,
    CreditCard,
    Home,
    LogOut,
    PackageSearch,
    Plus,
    ReceiptText,
    Settings,
    ShoppingCart,
    Store,
    Truck,
} from 'lucide-react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { SubscriptionBanner } from '@/components/subscription-banner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { storeThemeVariables } from '@/lib/store-theme';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type {
    AppLayoutProps,
    BreadcrumbItem,
    StoreSummary,
    User,
} from '@/types';

type CustomerPageProps = {
    name: string;
    auth: { user: User | null };
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
};

const primaryItems = [
    { title: 'Beranda', href: '/dashboard', icon: Home },
    { title: 'Produk', href: '/master-data/products', icon: PackageSearch },
    { title: 'Transaksi', href: '/sales', icon: ReceiptText },
];

const quickMenuItems = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        description: 'Ringkasan usaha',
    },
    {
        title: 'Produk',
        href: '/master-data/products',
        icon: PackageSearch,
        description: 'Katalog barang',
    },
    {
        title: 'Kasir',
        href: '/pos',
        icon: ShoppingCart,
        description: 'Scan jual cepat',
    },
    {
        title: 'Transaksi',
        href: '/sales',
        icon: ReceiptText,
        description: 'Riwayat penjualan',
    },
    {
        title: 'Laporan',
        href: '/reports',
        icon: BarChart3,
        description: 'Pantau performa',
    },
    {
        title: 'Stok',
        href: '/operations/inventory',
        icon: Boxes,
        description: 'Kontrol persediaan',
    },
    {
        title: 'Stock opname',
        href: '/operations/stock-opnames',
        icon: ClipboardCheck,
        description: 'Hitung stok fisik',
    },
    {
        title: 'Pembelian',
        href: '/purchasing',
        icon: Truck,
        description: 'Kulakan dan supplier',
    },
    {
        title: 'Kas & Bank',
        href: '/operations/cash',
        icon: CreditCard,
        description: 'Saldo dan mutasi',
    },
    {
        title: 'Biaya Toko',
        href: '/expenses',
        icon: CircleDollarSign,
        description: 'Catat pengeluaran',
    },
];

const cashierActions = [
    {
        title: 'Scan penjualan',
        description: 'Buka kasir untuk transaksi cepat',
        href: '/pos',
        icon: ShoppingCart,
    },
    {
        title: 'Scan kulakan',
        description: 'Catat pembelian stok masuk',
        href: '/purchasing',
        icon: Truck,
    },
    {
        title: 'Cek stok',
        description: 'Lihat persediaan dan batas minimum',
        href: '/operations/inventory',
        icon: Boxes,
    },
    {
        title: 'Scan produk baru',
        description: 'Tambah item yang belum ada',
        href: '/master-data/products',
        icon: PackageSearch,
    },
];

const manualCashierActions = [
    {
        title: 'Input penjualan',
        description: 'Buka kasir tanpa scan',
        href: '/pos',
        icon: ShoppingCart,
    },
    {
        title: 'Input kulakan',
        description: 'Catat pembelian stok masuk',
        href: '/purchasing',
        icon: Truck,
    },
    {
        title: 'Cek stok manual',
        description: 'Lihat persediaan sekarang',
        href: '/operations/inventory',
        icon: Boxes,
    },
    {
        title: 'Tambah produk',
        description: 'Tambah item yang belum ada',
        href: '/master-data/products',
        icon: PackageSearch,
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
                description: 'Ringkasan performa usaha',
            },
            {
                title: 'Toko',
                href: '/stores',
                icon: Store,
                description: 'Kelola cabang dan tim',
            },
            {
                title: 'Stock opname',
                href: '/operations/stock-opnames',
                icon: ClipboardCheck,
                description: 'Hitung dan cocokkan stok fisik',
            },
            {
                title: 'Kas & Bank',
                href: '/operations/cash',
                icon: CreditCard,
                description: 'Saldo dan perpindahan kas',
            },
            {
                title: 'Biaya',
                href: '/expenses',
                icon: CircleDollarSign,
                description: 'Pengeluaran harian',
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
                description: 'Setoran dan penarikan modal',
            },
            {
                title: 'Langganan',
                href: '/subscription',
                icon: Check,
                description: 'Status paket aktif',
            },
        ],
    },
];

export default function AppMobileLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { activeStore } = usePage<CustomerPageProps>().props;

    return (
        <div
            className="customer-workspace min-h-svh bg-[#f4f6f1] text-[var(--app-ink)]"
            style={storeThemeVariables(activeStore?.theme_color)}
        >
            <ImpersonationBanner />
            <CustomerHeader breadcrumbs={breadcrumbs} />
            <SubscriptionBanner />
            <main className="min-h-[calc(100svh-4rem)] overflow-x-hidden pb-24 md:pb-28">
                {children}
            </main>
            <BottomNavigation />
        </div>
    );
}

function CustomerHeader({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
    const { name, auth, stores, activeStore } =
        usePage<CustomerPageProps>().props;
    const getInitials = useInitials();
    const landingHref = activeStore ? '/dashboard' : '/stores';

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--app-ink)]/8 bg-[#fbfcf8]/92 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-2.5 px-3 sm:px-5 lg:px-8">
                <Link
                    href={landingHref}
                    aria-label={name}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-ink)] text-white shadow-lg"
                >
                    <AppLogoIcon className="size-5 fill-current" />
                </Link>

                <StoreMenu stores={stores} activeStore={activeStore} />

                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                aria-label="Buka menu akun"
                                className="ml-auto rounded-full ring-[var(--app-primary)]/30 transition outline-none focus-visible:ring-4"
                            >
                                <Avatar className="size-9 border-2 border-white shadow-sm">
                                    <AvatarImage
                                        src={auth.user.avatar}
                                        alt={auth.user.name}
                                    />
                                    <AvatarFallback className="bg-[#e5f1eb] text-xs font-bold text-[#245c4f]">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            sideOffset={10}
                            className="max-h-[min(38rem,calc(100svh-6rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-[1.5rem] border-[var(--app-ink)]/10 bg-[#fbfcf9] p-2 shadow-xl"
                        >
                            <DropdownMenuLabel className="rounded-2xl bg-[#edf4f0] px-3.5 py-3 font-normal">
                                <p className="truncate text-sm font-black text-[var(--app-ink)]">
                                    {auth.user.name}
                                </p>
                                <p className="mt-0.5 truncate text-[11px] text-[#6f817b]">
                                    {auth.user.email}
                                </p>
                            </DropdownMenuLabel>
                            <div className="px-1 py-3">
                                <p className="px-2 pb-2 text-[10px] font-bold tracking-[0.16em] text-[#6d817a] uppercase">
                                    Menu cepat
                                </p>
                                <div className="space-y-1">
                                    {quickMenuItems.map((item) => (
                                        <DropdownMenuItem
                                            asChild
                                            key={item.href}
                                            className="rounded-2xl p-0 focus:bg-[var(--app-soft)]"
                                        >
                                            <Link
                                                href={item.href}
                                                className="group flex min-w-0 items-center gap-3 rounded-2xl px-2.5 py-2"
                                            >
                                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#edf4f0] text-[#2b6657] transition group-hover:bg-white">
                                                    <item.icon className="size-4" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-xs font-bold text-[var(--app-ink)]">
                                                        {item.title}
                                                    </span>
                                                </span>
                                                <ChevronRight className="size-3.5 shrink-0 text-[#91a09b]" />
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                asChild
                                className="rounded-xl p-3"
                            >
                                <Link href={edit()}>
                                    <Settings className="size-4" />
                                    Pengaturan akun
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                asChild
                                className="rounded-xl p-3 text-rose-700"
                            >
                                <Link
                                    href={logout()}
                                    as="button"
                                    className="w-full"
                                    onClick={() => router.flushAll()}
                                >
                                    <LogOut className="size-4" />
                                    Keluar
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {breadcrumbs.length > 0 && (
                <div className="border-t border-[var(--app-ink)]/6 px-4 py-2.5 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl overflow-x-auto text-xs text-[#6c817a] [&_ol]:flex-nowrap [&_ol]:whitespace-nowrap">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </header>
    );
}

function StoreMenu({
    stores,
    activeStore,
}: {
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
}) {
    if (!activeStore) {
        return (
            <Link
                href="/stores/create"
                className="flex min-w-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-[var(--app-ink)]/8"
            >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f5b942] text-[#153f36]">
                    <Plus className="size-4" />
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">
                        Buat toko
                    </span>
                    <span className="block truncate text-[10px] text-[#778a84]">
                        Mulai operasional
                    </span>
                </span>
            </Link>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex max-w-[14rem] min-w-0 items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 text-left shadow-sm ring-1 ring-[var(--app-ink)]/8 transition hover:ring-[var(--app-primary)]/25 sm:max-w-xs"
                >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#e5f1eb] text-[#256451]">
                        <Store className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-[var(--app-ink)]">
                            {activeStore.name}
                        </span>
                    </span>
                    <ChevronDown className="size-3.5 shrink-0 text-[#82928d]" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                className="w-72 rounded-2xl border-[var(--app-ink)]/10 p-2 shadow-xl"
            >
                <DropdownMenuLabel className="px-3 py-2 text-xs text-muted-foreground">
                    Pilih ruang kerja
                </DropdownMenuLabel>
                {stores.map((store) => (
                    <DropdownMenuItem
                        key={store.public_id}
                        className="gap-3 rounded-xl p-3"
                        onSelect={() =>
                            router.post(`/stores/${store.public_id}/switch`)
                        }
                    >
                        <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                            <Store className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">
                                {store.name}
                            </span>
                            <span className="block text-[11px] text-muted-foreground capitalize">
                                {store.role}
                            </span>
                        </span>
                        {store.public_id === activeStore.public_id && (
                            <Check className="size-4 text-emerald-700" />
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-xl p-3">
                    <Link href="/stores/create">
                        <Plus className="size-4" />
                        Tambah toko baru
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function BottomNavigation() {
    const { currentUrl } = useCurrentUrl();
    const { activeStore } = usePage<CustomerPageProps>().props;

    const isActive = (href: string) =>
        currentUrl === href || currentUrl.startsWith(`${href}/`);
    const cashierActive = [
        '/pos',
        '/purchasing',
        '/operations/inventory',
        '/master-data/products',
    ].some((href) => isActive(href));
    const moreActive = [
        '/reports',
        '/stores',
        '/expenses',
        '/operations/cash',
        '/operations/capital',
        '/operations/stock-opnames',
        '/subscription',
    ].some((href) => isActive(href));

    return (
        <nav
            aria-label="Navigasi utama"
            className="fixed inset-x-0 bottom-0 z-40 md:bottom-4 md:px-4"
        >
            <div className="mx-auto grid max-w-2xl grid-cols-5 items-end border-t border-[var(--app-ink)]/10 bg-white/95 px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+.5rem)] shadow-xl backdrop-blur-xl md:rounded-[1.65rem] md:border md:px-3 md:pb-2">
                <BottomNavLink
                    item={primaryItems[0]}
                    active={isActive(primaryItems[0].href)}
                    disabled={!activeStore}
                />
                <BottomNavLink
                    item={primaryItems[1]}
                    active={isActive(primaryItems[1].href)}
                    disabled={!activeStore}
                />
                <CashierMenu active={cashierActive} disabled={!activeStore} />
                <BottomNavLink
                    item={primaryItems[2]}
                    active={isActive(primaryItems[2].href)}
                    disabled={!activeStore}
                />
                <MoreMenu active={moreActive} disabled={!activeStore} />
            </div>
        </nav>
    );
}

function BottomNavLink({
    item,
    active,
    disabled,
}: {
    item: (typeof primaryItems)[number];
    active: boolean;
    disabled: boolean;
}) {
    const Icon = item.icon;

    return (
        <Link
            href={disabled ? '/stores' : item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'group flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition sm:text-xs',
                active ? 'text-[var(--app-primary)]' : 'text-[#7a8a85]',
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
                <Icon
                    className="size-[1.15rem]"
                    strokeWidth={active ? 2.5 : 2}
                />
                {active && (
                    <span className="absolute -top-1 size-1 rounded-full bg-[#e2793c]" />
                )}
            </span>
            <span className="truncate">{item.title}</span>
        </Link>
    );
}

function CashierMenu({
    active,
    disabled,
}: {
    active: boolean;
    disabled: boolean;
}) {
    const [cashierMode, setCashierMode] = useState<'scan' | 'manual'>('scan');

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'group relative flex min-w-0 flex-col items-center gap-1 rounded-3xl px-1 py-0 text-[10px] font-semibold transition sm:text-xs',
                        active ? 'text-[var(--app-primary)]' : 'text-[#7a8a85]',
                        disabled && 'opacity-60',
                    )}
                    disabled={disabled}
                >
                    <span
                        className={cn(
                            'relative flex h-14 w-14 -translate-y-5 items-center justify-center rounded-full border-4 border-white shadow-[0_14px_28px_-16px_rgba(21,63,54,.75)] transition',
                            active
                                ? 'bg-[#173f35] text-white'
                                : 'bg-[#255d4e] text-white group-hover:bg-[#1f5446]',
                        )}
                    >
                        <ShoppingCart className="size-6" />
                        {active && (
                            <span className="absolute -top-0.5 right-1.5 size-2 rounded-full bg-[#f7c46b]" />
                        )}
                    </span>
                    <span className="-mt-4 text-[10px] font-black tracking-wide text-[var(--app-ink)] uppercase">
                        Kasir
                    </span>
                </button>
            </SheetTrigger>

            <SheetContent
                side="bottom"
                className="max-h-[90svh] overflow-y-auto rounded-t-[2rem] border-0 bg-[#f5f7f2] p-0 text-[#173c35] shadow-[0_-24px_70px_-20px_rgba(21,63,54,.45)] [&>button]:top-5 [&>button]:right-5 [&>button]:rounded-full [&>button]:bg-white [&>button]:p-2"
            >
                <SheetHeader className="mx-auto w-full max-w-xl px-4 pt-6 pb-2 text-left sm:px-6">
                    <div className="mb-2 h-1.5 w-12 self-center rounded-full bg-[#173c35]/15" />
                    <SheetTitle className="text-xl font-black tracking-[-0.04em] text-[#173c35]">
                        Kasir cepat
                    </SheetTitle>
                    <SheetDescription className="text-sm text-[#71817c]">
                        Pilih alur kerja. Kamera akan terbuka langsung di
                        halaman tujuan.
                    </SheetDescription>
                </SheetHeader>

                <div className="mx-auto w-full max-w-xl px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:px-6">
                    <div
                        role="tablist"
                        aria-label="Mode kasir"
                        className="mb-4 grid grid-cols-2 rounded-[1.1rem] bg-[#e7ece8] p-1"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={cashierMode === 'scan'}
                            onClick={() => setCashierMode('scan')}
                            className={cn(
                                'min-h-11 rounded-[.9rem] px-3 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-[#2e705e]/35 focus-visible:outline-none',
                                cashierMode === 'scan'
                                    ? 'bg-white text-[#173c35] shadow-sm'
                                    : 'text-[#71817c]',
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
                                'min-h-11 rounded-[.9rem] px-3 text-sm font-black transition focus-visible:ring-2 focus-visible:ring-[#2e705e]/35 focus-visible:outline-none',
                                cashierMode === 'manual'
                                    ? 'bg-white text-[#173c35] shadow-sm'
                                    : 'text-[#71817c]',
                            )}
                        >
                            Tanpa scan
                        </button>
                    </div>

                    <div role="tabpanel" className="space-y-2">
                        {(cashierMode === 'scan'
                            ? cashierActions
                            : manualCashierActions
                        ).map((item) => (
                            <SheetClose asChild key={item.title}>
                                <Link
                                    href={
                                        cashierMode === 'scan' &&
                                        item.href !== '/operations/inventory'
                                            ? `${item.href}?scan=1`
                                            : item.href
                                    }
                                    className="group flex min-h-14 items-center gap-3 rounded-[1.05rem] border border-[#173c35]/8 bg-white px-3 py-2 shadow-sm transition hover:border-[#2e705e]/20 hover:bg-[#fbfdfb] hover:shadow-md"
                                >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[.9rem] bg-[#eaf2ee] text-[#285f50]">
                                        <item.icon className="size-[1.1rem]" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black text-[#173c35]">
                                            {item.title}
                                        </span>
                                        <span className="block text-xs font-semibold text-[#71817c]">
                                            {item.description}
                                        </span>
                                    </span>
                                    <ChevronRight className="size-4 shrink-0 text-[#8b9b95] transition group-hover:translate-x-0.5" />
                                </Link>
                            </SheetClose>
                        ))}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function MoreMenu({
    active,
    disabled,
}: {
    active: boolean;
    disabled: boolean;
}) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'group flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition sm:text-xs',
                        active ? 'text-[var(--app-primary)]' : 'text-[#7a8a85]',
                        disabled && 'opacity-60',
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
                        <BarChart3 className="size-5" />
                        {active && (
                            <span className="absolute -top-1 size-1 rounded-full bg-[#e2793c]" />
                        )}
                    </span>
                    <span>Lainnya</span>
                </button>
            </SheetTrigger>

            <SheetContent
                side="bottom"
                className="max-h-[88svh] overflow-y-auto rounded-t-[2rem] border-0 bg-[#f5f7f2] p-0 text-[#173c35] shadow-[0_-24px_70px_-20px_rgba(21,63,54,.45)] [&>button]:top-5 [&>button]:right-5 [&>button]:rounded-full [&>button]:bg-white [&>button]:p-2"
            >
                <SheetHeader className="mx-auto w-full max-w-xl px-4 pt-6 pb-2 text-left sm:px-6">
                    <div className="mb-2 h-1.5 w-12 self-center rounded-full bg-[#173c35]/15" />
                    <SheetTitle className="text-xl font-black tracking-[-0.04em] text-[#173c35]">
                        Menu lainnya
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                        Kelola operasional dan akun.
                    </SheetDescription>
                </SheetHeader>

                <div className="mx-auto w-full max-w-xl space-y-5 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:px-6">
                    {moreMenuSections.map((section) => (
                        <div key={section.title}>
                            <div className="mb-3 flex items-center justify-between">
                                <p className="text-[11px] font-bold tracking-[0.16em] text-[#6d817a] uppercase">
                                    {section.title}
                                </p>
                            </div>
                            <div className="space-y-2">
                                {section.items.map((item) => (
                                    <SheetClose asChild key={item.title}>
                                        <Link
                                            href={item.href}
                                            className="group flex min-h-14 items-center gap-3 rounded-[1.05rem] border border-[#173c35]/8 bg-white px-3 py-2 shadow-sm transition hover:border-[#2e705e]/20 hover:bg-[#fbfdfb] hover:shadow-md"
                                        >
                                            <span className="flex size-10 shrink-0 items-center justify-center rounded-[.9rem] bg-[#eaf2ee] text-[#285f50]">
                                                <item.icon className="size-[1.1rem]" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-black text-[#173c35]">
                                                    {item.title}
                                                </span>
                                            </span>
                                            <ChevronRight className="size-4 shrink-0 text-[#8b9b95] transition group-hover:translate-x-0.5" />
                                        </Link>
                                    </SheetClose>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
    );
}
