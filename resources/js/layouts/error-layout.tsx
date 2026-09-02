import { Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import LanguageSwitcher from '@/components/language-switcher';
import { useTranslation } from '@/lib/i18n';

export default function ErrorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    useTranslation();

    const { appName = 'Sisko Plan' } = usePage<{ appName?: string }>().props;

    return (
        <div className="min-h-screen bg-[#f7f6ef] text-[#0b292f]">
            <header className="border-b border-[#0b292f]/10">
                <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#d7a941] focus-visible:ring-offset-4"
                        aria-label={`${appName}, beranda`}
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-[#0b292f] text-[#e7bd52]">
                            <AppLogoIcon className="size-4 fill-current" />
                        </span>
                        <span className="text-sm font-black tracking-[0.12em] uppercase">
                            {appName}
                        </span>
                    </Link>
                    <LanguageSwitcher />
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
