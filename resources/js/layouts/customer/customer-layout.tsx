import { usePage } from '@inertiajs/react';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { SubscriptionBanner } from '@/components/subscription-banner';
import { useAppearance } from '@/hooks/use-appearance';
import { BottomNavigation } from '@/layouts/customer/bottom-navigation';
import { CustomerHeader } from '@/layouts/customer/customer-header';
import type { CustomerPageProps } from '@/layouts/customer/customer-page-props';
import { storeThemeVariables } from '@/lib/store-theme';
import type { AppLayoutProps } from '@/types';

export default function CustomerLayout({ children, breadcrumbs = [] }: AppLayoutProps) {
    const { activeStore } = usePage<CustomerPageProps>().props;
    const { resolvedAppearance } = useAppearance();

    return (
        <div
            className="customer-workspace min-h-svh [scrollbar-color:var(--muted-foreground)_transparent] bg-background font-sans text-foreground [&_*]:[scrollbar-color:var(--muted-foreground)_transparent] [html:has(&)]:[scrollbar-color:var(--muted-foreground)_transparent]"
            style={storeThemeVariables(activeStore?.theme_color, resolvedAppearance)}
        >
            <ImpersonationBanner />
            <CustomerHeader breadcrumbs={breadcrumbs} />
            <SubscriptionBanner />
            <main className="min-h-[calc(100svh-4rem)] overflow-x-hidden pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-36">
                {children}
            </main>
            <BottomNavigation />
        </div>
    );
}
