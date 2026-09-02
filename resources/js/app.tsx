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
import { setActiveLocale } from '@/lib/i18n';

let appName =
    (typeof document !== 'undefined' &&
        document.documentElement.dataset.appName) ||
    import.meta.env.VITE_APP_NAME ||
    'Laravel';
let localeListenerRegistered = false;
const pages = import.meta.glob<{ default: ComponentType }>('./pages/**/*.tsx');

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

        setActiveLocale(page.props.locale as 'id' | 'ms');

        if (!ssr && !localeListenerRegistered) {
            router.on('navigate', (event) => {
                setActiveLocale(event.detail.page.props.locale as 'id' | 'ms');
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
