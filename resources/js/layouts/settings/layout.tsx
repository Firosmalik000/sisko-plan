import { Link } from '@inertiajs/react';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Pengaturan',
        href: edit(),
        icon: SlidersHorizontal,
    },
    {
        title: 'Keamanan',
        href: editSecurity(),
        icon: ShieldCheck,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-8">
            <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--app-ink)]">
                Pengaturan
            </h1>

            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start">
                <aside className="w-full lg:sticky lg:top-24 lg:w-56 lg:shrink-0">
                    <nav
                        className="flex gap-1.5 overflow-x-auto rounded-xl border border-[var(--app-ink)]/8 bg-white p-1.5 shadow-sm lg:flex-col"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn(
                                    'min-w-max justify-start rounded-xl lg:w-full',
                                    {
                                        'bg-[var(--app-soft-strong)] text-[var(--app-ink)]':
                                            isCurrentOrParentUrl(item.href),
                                    },
                                )}
                            >
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="lg:hidden" />

                <div className="min-w-0 flex-1">
                    <section className="space-y-4">{children}</section>
                </div>
            </div>
        </div>
    );
}
