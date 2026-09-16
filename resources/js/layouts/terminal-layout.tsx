import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { applyStoreCurrency } from '@/lib/currency';
import type { MarketCode } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import type { StoreSummary } from '@/types';

export default function TerminalLayout({ children }: { children: ReactNode }) {
    useTranslation();
    const { activeStore, market } = usePage<{ activeStore: StoreSummary | null; market: MarketCode }>().props;
    applyStoreCurrency(activeStore, market);

    return (
        <main className="min-h-dvh bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-foreground">
            {children}
        </main>
    );
}
