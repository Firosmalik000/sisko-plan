import { Link, router } from '@inertiajs/react';
import { Check, ChevronDown, LockKeyhole, Plus, Store } from 'lucide-react';
import { useState } from 'react';
import { SubscriptionLimitContactDialog } from '@/components/subscription-limit-contact-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppearance } from '@/hooks/use-appearance';
import { storeThemeVariables } from '@/lib/store-theme';
import type { StoreCreationState, StoreSummary } from '@/types';

type StoreSwitcherProps = {
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
    storeCreation: StoreCreationState | null;
};

export function StoreSwitcher({ stores, activeStore, storeCreation }: StoreSwitcherProps) {
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
                                router.post(`/stores/${store.public_id}/switch`, {}, { preserveState: false, preserveScroll: false })
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
