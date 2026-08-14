import { Link, router, usePage } from '@inertiajs/react';
import { Check, ChevronsUpDown, Plus, Store } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { StoreSummary } from '@/types';

type PageProps = {
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
};

export function StoreSwitcher() {
    const { stores, activeStore } = usePage<PageProps>().props;

    if (!activeStore) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild size="lg">
                        <Link href="/stores/create">
                            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                                <Plus className="size-4" />
                            </span>
                            <span className="grid flex-1 text-left text-sm">
                                <span className="font-semibold">Buat toko</span>
                                <span className="text-xs text-muted-foreground">
                                    Mulai operasional
                                </span>
                            </span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent"
                        >
                            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                                <Store className="size-4" />
                            </span>
                            <span className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                    {activeStore.name}
                                </span>
                                <span className="truncate text-xs text-muted-foreground capitalize">
                                    {activeStore.role}
                                </span>
                            </span>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-64"
                        align="start"
                        side="bottom"
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Toko aktif
                        </DropdownMenuLabel>
                        {stores.map((store) => (
                            <DropdownMenuItem
                                key={store.public_id}
                                onSelect={() =>
                                    router.post(
                                        `/stores/${store.public_id}/switch`,
                                    )
                                }
                                className="gap-2"
                            >
                                <Store className="size-4" />
                                <span className="flex-1 truncate">
                                    {store.name}
                                </span>
                                {store.public_id === activeStore.public_id && (
                                    <Check className="size-4" />
                                )}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/stores/create" className="gap-2">
                                <Plus className="size-4" />
                                Tambah toko
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
