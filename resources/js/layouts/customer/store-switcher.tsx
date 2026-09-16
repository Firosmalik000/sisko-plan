import { Link, router } from '@inertiajs/react';
import { Building2, Check, ChevronDown, LockKeyhole, Plus, Store } from 'lucide-react';
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
import { translate } from '@/lib/i18n';
import { shouldShowWorkspaceSwitcher } from '@/lib/pos-operations-contract';
import { storeThemeVariables } from '@/lib/store-theme';
import businessesRoutes from '@/routes/businesses';
import storesRoutes from '@/routes/stores';
import type { BusinessSummary, StoreCreationState, StoreSummary } from '@/types';

type StoreSwitcherProps = {
    businesses: BusinessSummary[];
    activeBusiness: BusinessSummary | null;
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
    storeCreation: StoreCreationState | null;
};

export function StoreSwitcher({ businesses, activeBusiness, stores, activeStore, storeCreation }: StoreSwitcherProps) {
    const canCreateStore = storeCreation?.can_create ?? false;
    const [limitOpen, setLimitOpen] = useState(false);
    const { resolvedAppearance } = useAppearance();

    if (!activeStore) {
        return (
            <>
                {canCreateStore ? (
                    <Link
                        href={storesRoutes.create.url()}
                        className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                            <Plus className="size-4" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">{translate('Create store')}</span>
                            <span className="block truncate text-xs text-muted-foreground">{translate('Start operations')}</span>
                        </span>
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={() => setLimitOpen(true)}
                        className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-left"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                            <LockKeyhole className="size-4" />
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-bold">{translate('Increase capacity')}</span>
                            <span className="block truncate text-xs text-muted-foreground">{translate('Contact admin')}</span>
                        </span>
                    </button>
                )}
                <SubscriptionLimitContactDialog kind="store" open={limitOpen} onOpenChange={setLimitOpen} />
            </>
        );
    }

    if (!shouldShowWorkspaceSwitcher(businesses.length, stores.length)) {
        return (
            <div className="flex min-w-0 items-center gap-2.5 px-1 py-1.5 sm:max-w-sm">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--app-soft-strong)] text-[var(--app-primary)]">
                    <Store className="size-4" />
                </span>
                <span className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-base">{activeStore.name}</span>
            </div>
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
                    className="max-h-[70svh] w-72 max-w-[calc(100vw-2rem)] [scrollbar-color:var(--muted-foreground)_transparent] overflow-y-auto rounded-2xl border-border p-2 shadow-xl dark:shadow-none"
                >
                    <DropdownMenuLabel className="px-3 py-2 text-xs text-muted-foreground">
                        {translate('Select workspace work')}
                    </DropdownMenuLabel>
                    {businesses.length > 1 && (
                        <>
                            {businesses.map((business) => (
                                <DropdownMenuItem
                                    key={business.public_id}
                                    className="gap-3 rounded-xl p-3"
                                    onSelect={() => {
                                        sessionStorage.removeItem('pos.draft');
                                        router.post(
                                            businessesRoutes.switch.url(business.public_id),
                                            {},
                                            { preserveState: false, preserveScroll: false },
                                        );
                                    }}
                                >
                                    <Building2 className="size-4" />
                                    <span className="min-w-0 flex-1 truncate font-semibold">{business.name}</span>
                                    {business.public_id === activeBusiness?.public_id && <Check className="size-4 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                        </>
                    )}
                    {stores.map((store) => (
                        <DropdownMenuItem
                            key={store.public_id}
                            className="gap-3 rounded-xl p-3"
                            onSelect={() => {
                                sessionStorage.removeItem('pos.draft');
                                router.post(storesRoutes.switch.url(store.public_id), {}, { preserveState: false, preserveScroll: false });
                            }}
                        >
                            <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                                <Store className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{store.name}</span>
                                <span className="block text-[11px] text-muted-foreground capitalize">{translate(store.role)}</span>
                            </span>
                            {store.public_id === activeStore.public_id && <Check className="size-4 text-primary" />}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    {canCreateStore ? (
                        <DropdownMenuItem asChild className="rounded-xl p-3">
                            <Link href={storesRoutes.create.url()}>
                                <Plus className="size-4" />
                                {translate('Add new store')}
                            </Link>
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem className="rounded-xl p-3" onSelect={() => setLimitOpen(true)}>
                            <LockKeyhole className="size-4" />
                            {translate('Increase store capacity')}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            <SubscriptionLimitContactDialog kind="store" open={limitOpen} onOpenChange={setLimitOpen} />
        </>
    );
}
