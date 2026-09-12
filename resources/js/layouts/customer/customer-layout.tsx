import { usePage } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { SubscriptionBanner } from '@/components/subscription-banner';
import { useAppearance } from '@/hooks/use-appearance';
import { CustomerHeader } from '@/layouts/customer/customer-header';
import { CustomerNavigation } from '@/layouts/customer/customer-navigation';
import type { CustomerPageProps } from '@/layouts/customer/customer-page-props';
import { storeThemeVariables } from '@/lib/store-theme';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    const { activeStore } = usePage<CustomerPageProps>().props;
    const { resolvedAppearance } = useAppearance();
    const theme = useMemo(
        () => storeThemeVariables(activeStore?.theme_color, resolvedAppearance),
        [activeStore?.theme_color, resolvedAppearance],
    );

    useEffect(() => {
        const root = document.documentElement;
        const variables = Object.entries(theme).filter(([name, value]) => name.startsWith('--') && typeof value === 'string');
        const previous = new Map(variables.map(([name]) => [name, root.style.getPropertyValue(name)]));
        const previousColorScheme = root.style.colorScheme;

        variables.forEach(([name, value]) => root.style.setProperty(name, value as string));
        root.style.colorScheme = resolvedAppearance;

        return () => {
            variables.forEach(([name]) => {
                const value = previous.get(name);

                if (value) {
                    root.style.setProperty(name, value);
                } else {
                    root.style.removeProperty(name);
                }
            });
            root.style.colorScheme = previousColorScheme;
        };
    }, [theme, resolvedAppearance]);

    return (
        <div
            className="customer-workspace min-h-svh [scrollbar-color:var(--muted-foreground)_transparent] bg-background font-sans text-foreground [&_*]:[scrollbar-color:var(--muted-foreground)_transparent] [html:has(&)]:[scrollbar-color:var(--muted-foreground)_transparent]"
            style={theme}
        >
            <ImpersonationBanner />
            <CustomerHeader />
            <SubscriptionBanner />
            <main className="min-h-[calc(100svh-4rem)] overflow-x-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-20">
                {children}
            </main>
            <CustomerNavigation />
        </div>
    );
}
