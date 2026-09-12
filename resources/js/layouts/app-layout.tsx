import { usePage } from '@inertiajs/react';
import CustomerLayout from '@/layouts/customer/customer-layout';
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
        <CustomerLayout key={activeStore?.public_id ?? 'no-store'} breadcrumbs={breadcrumbs}>
            {children}
        </CustomerLayout>
    );
}
