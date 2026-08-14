import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    CreditCard,
    Gauge,
    LogOut,
    LockKeyhole,
    ShieldCheck,
    Users,
} from 'lucide-react';
import type { PlatformAdmin } from '@/types';

const navigation = [
    { label: 'Ringkasan', href: '/super-admin', icon: Gauge },
    { label: 'Pengguna', href: '/super-admin/users', icon: Users },
    { label: 'Toko', href: '/super-admin/stores', icon: Building2 },
    {
        label: 'Subscription',
        href: '/super-admin/subscriptions',
        icon: CreditCard,
    },
    {
        label: 'Keamanan',
        href: '/super-admin/security',
        icon: LockKeyhole,
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
        <div className="min-h-screen bg-[#f3f0e8] text-slate-950">
            <header className="border-b border-slate-900/10 bg-[#102b31] text-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-8">
                    <Link
                        href="/super-admin"
                        className="flex items-center gap-3"
                    >
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[#d7a941] text-[#102b31]">
                            <ShieldCheck className="size-5" />
                        </span>
                        <span>
                            <span className="block text-sm font-semibold tracking-wide">
                                SISKO CONTROL
                            </span>
                            <span className="block text-xs text-slate-300">
                                Platform administration
                            </span>
                        </span>
                    </Link>
                    <nav className="flex gap-1 overflow-x-auto">
                        {navigation.map((item) => {
                            const active =
                                item.href === '/super-admin'
                                    ? path === item.href
                                    : path.startsWith(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? 'bg-white/12 text-white' : 'text-slate-300 hover:bg-white/8 hover:text-white'}`}
                                >
                                    <item.icon className="size-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="flex items-center gap-3 text-sm">
                        <div className="hidden text-right sm:block">
                            <p className="font-medium">{platformAdmin.name}</p>
                            <p className="text-xs text-slate-400">
                                {platformAdmin.email}
                            </p>
                        </div>
                        <Link
                            href="/super-admin/logout"
                            method="post"
                            as="button"
                            className="flex size-9 items-center justify-center rounded-lg border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white"
                            aria-label="Keluar"
                        >
                            <LogOut className="size-4" />
                        </Link>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
                {children}
            </main>
        </div>
    );
}
