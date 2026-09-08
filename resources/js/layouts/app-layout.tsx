import { usePage } from '@inertiajs/react';
import AppLayoutTemplate from '@/layouts/app/app-mobile-layout';
import { applyStoreCurrency } from '@/lib/currency';
import type { MarketCode } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import type { BreadcrumbItem, StoreSummary } from '@/types';

export default function AppLayout({ breadcrumbs = [], children }: { breadcrumbs?: BreadcrumbItem[]; children: React.ReactNode }) {
    useTranslation();
    const { activeStore, market } = usePage<{
        activeStore: StoreSummary | null;
        market: MarketCode;
    }>().props;

    // Currency metadata must change before descendant pages format amounts.
    applyStoreCurrency(activeStore, market);

    return (
        <AppLayoutTemplate key={activeStore?.public_id ?? 'no-store'} breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}
