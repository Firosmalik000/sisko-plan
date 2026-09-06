import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { ComponentType } from 'react';
import PublicSiteLayout from '@/components/public-site-shell';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import ErrorLayout from '@/layouts/error-layout';
import SettingsLayout from '@/layouts/settings/layout';
import SuperAdminLayout from '@/layouts/super-admin-layout';
import type { AppLocale, MarketCode } from '@/lib/currency';
import { setActiveLocale } from '@/lib/i18n';

let appName =
    (typeof document !== 'undefined' &&
        document.documentElement.dataset.appName) ||
    import.meta.env.VITE_APP_NAME ||
    'Laravel';
let localeListenerRegistered = false;
const pages = import.meta.glob<{ default: ComponentType }>('./pages/**/*.tsx');
const normalizeLocale = (locale: unknown): AppLocale =>
    locale === 'en' || locale === 'ms' ? locale : 'id';
const normalizeMarket = (
    market: unknown,
    locale: AppLocale,
    locales: unknown,
): MarketCode => {
    if (market === 'id' || market === 'ms') {
        return market;
    }

    const isMarketSwitcher =
        Array.isArray(locales) &&
        !locales.some(
            (option) =>
                typeof option === 'object' &&
                option !== null &&
                'code' in option &&
                option.code === 'en',
        );

    if (isMarketSwitcher) {
        return locale === 'ms' ? 'ms' : 'id';
    }

    const documentMarket =
        typeof document === 'undefined'
            ? undefined
            : document.documentElement.dataset.market;

    if (documentMarket === 'id' || documentMarket === 'ms') {
        return documentMarket;
    }

    return locale === 'ms' ? 'ms' : 'id';
};

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: async (name) =>
        (await resolvePageComponent(`./pages/${name}.tsx`, pages)).default,
    layout: (name) => {
        switch (true) {
            case name.startsWith('errors/'):
                return ErrorLayout;
            case name === 'welcome' || name === 'pricing':
                return PublicSiteLayout;
            case name.startsWith('super-admin/'):
                return SuperAdminLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app, { page, ssr }) {
        const brandName = page.props.branding?.brand_name;

        if (typeof brandName === 'string' && brandName !== '') {
            appName = brandName;

            if (!ssr) {
                document.documentElement.dataset.appName = brandName;
            }
        }

        const locale = normalizeLocale(page.props.locale);
        const market = normalizeMarket(
            page.props.market,
            locale,
            page.props.locales,
        );
        setActiveLocale(locale);

        if (!ssr) {
            document.documentElement.lang = locale;
            document.documentElement.dataset.market = market;
        }

        if (!ssr && !localeListenerRegistered) {
            router.on('navigate', (event) => {
                const nextLocale = normalizeLocale(
                    event.detail.page.props.locale,
                );
                setActiveLocale(nextLocale);
                document.documentElement.lang = nextLocale;
                document.documentElement.dataset.market = normalizeMarket(
                    event.detail.page.props.market,
                    nextLocale,
                    event.detail.page.props.locales,
                );
            });
            localeListenerRegistered = true;
        }

        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#ee4d2d',
    },
});

// Keep one visual mode while the product design is being standardized.
initializeTheme();
