import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    ChevronUp,
    CreditCard,
    Gauge,
    Globe2,
    LogOut,
    LockKeyhole,
    ReceiptText,
    UserCog,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import LanguageSwitcher from '@/components/language-switcher';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';
import type { PlatformAdmin } from '@/types';

type NavigationItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    permission?: string;
};

const navigation: Array<{ label: string; items: NavigationItem[] }> = [
    {
        label: 'Ringkasan',
        items: [
            {
                label: 'Dashboard',
                href: '/super-admin',
                icon: Gauge,
                permission: 'platform.dashboard.view',
            },
        ],
    },
    {
        label: 'Tenant',
        items: [
            {
                label: 'Pengguna',
                href: '/super-admin/users',
                icon: Users,
                permission: 'platform.users.view',
            },
            {
                label: 'Toko',
                href: '/super-admin/stores',
                icon: Building2,
                permission: 'platform.stores.view',
            },
        ],
    },
    {
        label: 'Komersial',
        items: [
            {
                label: 'Subscription & paket',
                href: '/super-admin/subscriptions',
                icon: CreditCard,
                permission: 'platform.subscriptions.view',
            },
            {
                label: 'Riwayat pembayaran',
                href: '/super-admin/payments',
                icon: ReceiptText,
                permission: 'platform.payments.view',
            },
        ],
    },
    {
        label: 'Platform',
        items: [
            {
                label: 'Brand & SEO',
                href: '/super-admin/brand-seo',
                icon: Globe2,
                permission: 'platform.branding.view',
            },
            {
                label: 'Admin platform',
                href: '/super-admin/platform-admins',
                icon: UserCog,
                permission: 'platform.admins.view',
            },
        ],
    },
];

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    useTranslation();

    const { platformAdmin, name, branding } = usePage<{
        platformAdmin: PlatformAdmin;
        name: string;
        branding: { logo_url: string | null };
    }>().props;
    const path = window.location.pathname;

    return (
        <div className="platform-shell min-h-screen text-slate-950 md:flex">
            <aside className="border-b border-white/20 bg-[#d83f22] text-white shadow-2xl shadow-[#b83219]/15 md:sticky md:top-0 md:flex md:h-screen md:w-72 md:shrink-0 md:flex-col md:border-r md:border-b-0">
                <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-5">
                    <Link
                        href={platformAdmin.home_url}
                        className="flex items-center gap-3"
                    >
                        <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-white text-[#ee4d2d] shadow-sm">
                            {branding.logo_url ? (
                                <img
                                    src={branding.logo_url}
                                    alt=""
                                    className="size-full object-contain"
                                />
                            ) : (
                                <Globe2 className="size-5" />
                            )}
                        </span>
                        <span>
                            <span className="block text-sm font-black tracking-[0.12em]">
                                {name.toUpperCase()}
                            </span>
                            <span className="block text-[11px] text-white/70">
                                SaaS administration
                            </span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-2 md:hidden">
                        <LanguageSwitcher />
                        <AccountMenu admin={platformAdmin} compact />
                    </div>
                </div>

                <nav className="flex [scrollbar-width:none] gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-5 md:overflow-visible md:px-3 md:pb-0 [&::-webkit-scrollbar]:hidden">
                    {navigation.map((group) => {
                        const items = group.items.filter(
                            (item) =>
                                item.permission === undefined ||
                                platformAdmin.role === 'super_admin' ||
                                platformAdmin.permissions.includes(
                                    item.permission,
                                ),
                        );

                        if (items.length === 0) {
                            return null;
                        }

                        return (
                            <section
                                key={group.label}
                                className="contents md:block"
                            >
                                <p className="mb-1 hidden px-2 text-[10px] font-bold tracking-[0.16em] text-white/55 uppercase md:block">
                                    {group.label}
                                </p>
                                <div className="flex shrink-0 gap-1 md:block md:space-y-1">
                                    {items.map((item) => {
                                        const active =
                                            item.href === '/super-admin'
                                                ? path === item.href
                                                : path.startsWith(item.href);

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                prefetch
                                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${active ? 'bg-white text-[#b83219] shadow-lg shadow-[#9f2f19]/20' : 'text-white/80 hover:bg-white/12 hover:text-white'}`}
                                            >
                                                <item.icon className="size-4" />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </nav>

                <div className="hidden items-center gap-2 border-t border-white/10 p-3 md:flex">
                    <LanguageSwitcher />
                    <AccountMenu admin={platformAdmin} />
                </div>
            </aside>

            <main className="min-w-0 flex-1">
                <div className="relative mx-auto max-w-[1500px] px-4 py-5 sm:px-6 md:px-8 md:py-8 xl:px-10">
                    {children}
                </div>
            </main>
        </div>
    );
}

function AccountMenu({
    admin,
    compact = false,
}: {
    admin: PlatformAdmin;
    compact?: boolean;
}) {
    const initials = admin.name.slice(0, 2).toUpperCase();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {compact ? (
                    <button
                        type="button"
                        className="flex size-10 items-center justify-center rounded-xl bg-white/15 text-xs font-black text-white transition outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white"
                        aria-label="Buka menu akun"
                    >
                        {initials}
                    </button>
                ) : (
                    <button
                        type="button"
                        className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition outline-none hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white"
                    >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-black text-white">
                            {initials}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold">
                                {admin.name}
                            </span>
                            <span className="block truncate text-[10px] text-white/65">
                                {admin.role === 'super_admin'
                                    ? 'Super Admin'
                                    : 'Admin Platform'}
                            </span>
                        </span>
                        <ChevronUp className="size-4 text-white/65" />
                    </button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align={compact ? 'end' : 'start'}
                side={compact ? 'bottom' : 'top'}
                sideOffset={8}
                className="w-64 rounded-xl border-slate-200 p-1.5 shadow-xl"
            >
                <DropdownMenuLabel className="px-3 py-2">
                    <span className="block truncate text-sm font-bold text-[#3b211b]">
                        {admin.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">
                        {admin.email}
                    </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="min-h-10 rounded-lg px-3">
                    <Link href="/super-admin/security">
                        <LockKeyhole className="size-4" />
                        Pengaturan akun
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    asChild
                    variant="destructive"
                    className="min-h-10 rounded-lg px-3"
                >
                    <Link
                        href="/super-admin/logout"
                        method="post"
                        as="button"
                        className="w-full"
                    >
                        <LogOut className="size-4" />
                        Keluar
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
