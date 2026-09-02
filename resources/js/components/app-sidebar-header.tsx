import { usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import LanguageSwitcher from '@/components/language-switcher';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { stockAlerts } = usePage<{
        stockAlerts?: {
            count: number;
            items: Array<{
                name: string;
                quantity: string;
                minimum_quantity: string;
            }>;
        };
    }>().props;
    const count = stockAlerts?.count ?? 0;
    const [open, setOpen] = useState(false);

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="ml-auto">
                <LanguageSwitcher />
            </div>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    aria-label={
                        count > 0 ? `${count} stok kritis` : 'Notifikasi'
                    }
                    className="relative grid size-10 place-items-center rounded-xl text-sidebar-foreground transition hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
                >
                    <Bell className="size-5" />
                    {count > 0 && (
                        <span className="absolute top-1 right-1 grid min-w-4 translate-x-1/4 -translate-y-1/4 place-items-center rounded-full bg-red-600 px-1 text-[10px] leading-4 font-black text-white ring-2 ring-background">
                            {count > 9 ? '9+' : count}
                        </span>
                    )}
                </button>
                {open && (
                    <div className="absolute top-12 right-0 z-50 w-72 rounded-2xl border border-sidebar-border bg-popover p-3 text-popover-foreground shadow-xl">
                        <p className="text-sm font-black">Notifikasi stok</p>
                        {count === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                                Tidak ada stok kritis.
                            </p>
                        ) : (
                            <div className="mt-2 space-y-2">
                                {stockAlerts?.items.map((item) => (
                                    <div
                                        key={item.name}
                                        className="rounded-xl bg-red-50 px-3 py-2 text-xs dark:bg-red-950/30"
                                    >
                                        <p className="font-bold text-red-800 dark:text-red-200">
                                            {item.name}
                                        </p>
                                        <p className="mt-0.5 text-red-700 dark:text-red-300">
                                            Sisa {item.quantity} · minimum{' '}
                                            {item.minimum_quantity}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}
