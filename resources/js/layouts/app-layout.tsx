import { usePage } from '@inertiajs/react';
import { AppOpenPromotion } from '@/components/app-open-promotion';
import CustomerLayout from '@/layouts/customer/customer-layout';
import { applyStoreCurrency } from '@/lib/currency';
import type { MarketCode } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import type { AppOpenPromotion as AppOpenPromotionData } from '@/lib/promotions';
import type { BreadcrumbItem, StoreSummary } from '@/types';

export default function AppLayout({ children }: { breadcrumbs?: BreadcrumbItem[]; children: React.ReactNode }) {
    useTranslation();
    const { activeStore, market, appOpenPromotions } = usePage<{
        activeStore: StoreSummary | null;
        market: MarketCode;
        appOpenPromotions: AppOpenPromotionData[];
    }>().props;

    // Currency metadata must change before descendant pages format amounts.
    applyStoreCurrency(activeStore, market);

    return (
        <>
            <CustomerLayout key={activeStore?.public_id ?? 'no-store'}>{children}</CustomerLayout>
            <AppOpenPromotion promotions={appOpenPromotions ?? []} />
        </>
    );
}
