import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CreditCard,
    Gauge,
    LogOut,
    LockKeyhole,
    ReceiptText,
    ShieldCheck,
    UserCog,
    Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { PlatformAdmin } from '@/types';

type NavigationItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    superAdminOnly?: boolean;
};

const navigation: Array<{ label: string; items: NavigationItem[] }> = [
    {
        label: 'Ringkasan',
        items: [{ label: 'Dashboard', href: '/super-admin', icon: Gauge }],
    },
    {
        label: 'Tenant',
        items: [
            { label: 'Pengguna', href: '/super-admin/users', icon: Users },
            { label: 'Toko', href: '/super-admin/stores', icon: Building2 },
        ],
    },
    {
        label: 'Komersial',
        items: [
            {
                label: 'Subscription & paket',
                href: '/super-admin/subscriptions',
                icon: CreditCard,
            },
            {
                label: 'Riwayat pembayaran',
                href: '/super-admin/payments',
                icon: ReceiptText,
            },
        ],
    },
    {
        label: 'Platform',
        items: [
            {
                label: 'Admin platform',
                href: '/super-admin/platform-admins',
                icon: UserCog,
                superAdminOnly: true,
            },
            {
                label: 'Keamanan akun',
                href: '/super-admin/security',
                icon: LockKeyhole,
            },
        ],
    },
];

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { platformAdmin } = usePage<{ platformAdmin: PlatformAdmin }>().props;
    const path = window.location.pathname;

    return (
        <div className="platform-shell min-h-screen text-slate-950 md:flex">
            <aside className="border-b border-white/10 bg-[#0b292f] text-white shadow-2xl shadow-[#0b292f]/10 md:sticky md:top-0 md:flex md:h-screen md:w-72 md:shrink-0 md:flex-col md:border-r md:border-b-0">
                <div className="flex items-center justify-between px-4 py-4 md:px-5 md:py-5">
                    <Link
                        href="/super-admin"
                        className="flex items-center gap-3"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-[#d7a941] text-[#102b31]">
                            <ShieldCheck className="size-5" />
                        </span>
                        <span>
                            <span className="block text-sm font-black tracking-[0.12em]">
                                SISKO CONTROL
                            </span>
                            <span className="block text-[11px] text-slate-400">
                                SaaS administration
                            </span>
                        </span>
                    </Link>
                    <Link
                        href="/super-admin/logout"
                        method="post"
                        as="button"
                        className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
                        aria-label="Keluar"
                    >
                        <LogOut className="size-4" />
                    </Link>
                </div>

                <nav className="flex [scrollbar-width:none] gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-5 md:overflow-visible md:px-3 md:pb-0 [&::-webkit-scrollbar]:hidden">
                    {navigation.map((group) => {
                        const items = group.items.filter(
                            (item) =>
                                !item.superAdminOnly ||
                                platformAdmin.role === 'super_admin',
                        );

                        if (items.length === 0) {
                            return null;
                        }

                        return (
                            <section
                                key={group.label}
                                className="contents md:block"
                            >
                                <p className="mb-1 hidden px-2 text-[10px] font-bold tracking-[0.16em] text-slate-500 uppercase md:block">
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
                                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${active ? 'bg-[#e3b84f] text-[#0b292f] shadow-lg shadow-black/10' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}
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

                <div className="hidden border-t border-white/10 p-3 md:block">
                    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
                        <span className="flex size-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-[#e9c96f]">
                            {platformAdmin.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">
                                {platformAdmin.name}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                                {platformAdmin.role === 'super_admin'
                                    ? 'Super Admin'
                                    : 'Admin Platform'}
                            </p>
                        </div>
                        <Link
                            href="/super-admin/logout"
                            method="post"
                            as="button"
                            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
                            aria-label="Keluar"
                        >
                            <LogOut className="size-4" />
                        </Link>
                    </div>
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
