import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { cloneElement, Fragment, isValidElement } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import PublicSiteLayout from '@/components/public/site-shell';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { ConfirmationProvider } from '@/hooks/use-confirmation';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import ErrorLayout from '@/layouts/error-layout';
import PlatformLayout from '@/layouts/platform/platform-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { applyStoreCurrency } from '@/lib/currency';
import type { MarketCode } from '@/lib/currency';
import { loadLocaleCatalog, setActiveLocale, useTranslation } from '@/lib/i18n';
import { normalizeLocale } from '@/lib/locales';

let appName = (typeof document !== 'undefined' && document.documentElement.dataset.appName) || import.meta.env.VITE_APP_NAME || 'XSISTEN';
let localeListenerRegistered = false;
type InertiaPage = ComponentType<Record<string, unknown>>;

const pages = import.meta.glob<{ default: InertiaPage }>('./pages/**/*.tsx');
const localizedPages = new Map<string, InertiaPage>();
const marketCodes: MarketCode[] = ['BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN'];
const normalizeMarket = (market: unknown): MarketCode => {
    const normalized = typeof market === 'string' ? market.toUpperCase() : '';

    return marketCodes.includes(normalized as MarketCode) ? (normalized as MarketCode) : 'ID';
};

function LocaleBoundary({ children }: { children: ReactNode }) {
    const { locale } = useTranslation();

    if (isValidElement(children)) {
        return cloneElement(children as ReactElement<Record<string, unknown>>, {
            'data-locale-version': locale,
        });
    }

    return <Fragment>{children}</Fragment>;
}

function localizedPage(name: string, Page: InertiaPage): InertiaPage {
    const cachedPage = localizedPages.get(name);

    if (cachedPage) {
        return cachedPage;
    }

    function LocalizedPage(props: Record<string, unknown>) {
        useTranslation();

        return <Page {...props} />;
    }

    LocalizedPage.displayName = `LocalizedPage(${Page.displayName ?? Page.name ?? name})`;
    localizedPages.set(name, LocalizedPage);

    return LocalizedPage;
}

const bootScreen = typeof document === 'undefined' ? null : document.getElementById('app-boot');
const bootRetry = typeof document === 'undefined' ? null : document.getElementById('app-boot-retry');
const bootSlowTimer =
    bootScreen === null
        ? null
        : window.setTimeout(() => {
              bootScreen.dataset.state = 'slow';
          }, 700);
const bootFailureTimer =
    bootScreen === null
        ? null
        : window.setTimeout(() => {
              bootScreen.dataset.state = 'failed';
          }, 8_000);

bootRetry?.addEventListener('click', () => window.location.reload());

function dismissBootScreen(): void {
    if (bootScreen === null) {
        return;
    }

    if (bootSlowTimer !== null) {
        window.clearTimeout(bootSlowTimer);
    }

    if (bootFailureTimer !== null) {
        window.clearTimeout(bootFailureTimer);
    }

    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
            bootScreen.dataset.state = 'ready';
            window.setTimeout(() => bootScreen.remove(), 180);
        });
    });
}

async function bootstrap(): Promise<void> {
    const initialLocale = normalizeLocale(typeof document === 'undefined' ? 'en' : document.documentElement.lang);
    await loadLocaleCatalog(initialLocale);
    setActiveLocale(initialLocale);

    await createInertiaApp({
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: async (name) => {
            const Page = (await resolvePageComponent(`./pages/${name}.tsx`, pages)).default;

            return localizedPage(name, Page);
        },
        layout: (name) => {
            switch (true) {
                case name.startsWith('system/errors/'):
                    return ErrorLayout;
                case name.startsWith('public/'):
                    return PublicSiteLayout;
                case name.startsWith('platform/'):
                    return PlatformLayout;
                case name.startsWith('auth/'):
                    return AuthLayout;
                case name.startsWith('customer/settings/'):
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
            const market = normalizeMarket(page.props.market);
            setActiveLocale(locale);

            if (!ssr) {
                document.documentElement.lang = locale;
                document.documentElement.dataset.market = market;
                applyStoreCurrency(page.props.activeStore ?? null, market);
            }

            if (!ssr && !localeListenerRegistered) {
                router.on('navigate', (event) => {
                    const nextLocale = normalizeLocale(event.detail.page.props.locale);
                    const nextMarket = normalizeMarket(event.detail.page.props.market);
                    void loadLocaleCatalog(nextLocale).then(() => {
                        setActiveLocale(nextLocale);
                        document.documentElement.lang = nextLocale;
                        document.documentElement.dataset.market = nextMarket;
                        applyStoreCurrency(event.detail.page.props.activeStore ?? null, nextMarket);
                    });
                });
                localeListenerRegistered = true;
            }

            return (
                <TooltipProvider delayDuration={0}>
                    <ConfirmationProvider>
                        <LocaleBoundary>{app}</LocaleBoundary>
                    </ConfirmationProvider>
                    <Toaster />
                </TooltipProvider>
            );
        },
        progress: {
            color: '#ee4d2d',
            delay: 250,
            showSpinner: false,
        },
    });

    dismissBootScreen();
}

void bootstrap();

// Keep one visual mode while the product design is being standardized.
initializeTheme();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
    });
}
