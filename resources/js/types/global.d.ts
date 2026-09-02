import type { Auth } from '@/types/auth';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            branding: {
                brand_name: string;
                logo_url: string | null;
                tagline: string | null;
                site_url: string | null;
                support_email: string | null;
                support_phone: string | null;
                social_links: Array<{ platform: string; url: string }>;
                seo_title: string;
                seo_description: string | null;
                seo_keywords: string | null;
                social_image_url: string | null;
                robots_index: boolean;
            };
            locale?: 'id' | 'ms';
            locales?: Array<{ code: 'id' | 'ms'; label: string }>;
            auth: Auth;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
