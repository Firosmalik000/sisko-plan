import { Link } from '@inertiajs/react';
import { CircleUserRound, MonitorCog, ShieldCheck } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useTranslation } from '@/lib/i18n';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Akun & toko',
        href: edit(),
        icon: CircleUserRound,
    },
    {
        title: 'Keamanan',
        href: editSecurity(),
        icon: ShieldCheck,
    },
    {
        title: 'Tampilan',
        href: editAppearance(),
        icon: MonitorCog,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { t } = useTranslation();

    return (
        <div className="mx-auto w-full max-w-[1296px] px-3 py-6 min-[375px]:px-4 sm:px-6 sm:py-8 lg:px-7 lg:py-9">
            <h1 className="text-2xl font-bold tracking-[-0.035em] text-foreground">{t('Pengaturan')}</h1>

            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start">
                <aside className="w-full lg:sticky lg:top-24 lg:w-56 lg:shrink-0">
                    <nav className="flex gap-1.5 overflow-x-auto rounded-2xl bg-card p-1.5 lg:flex-col" aria-label="Settings">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn(
                                    'min-h-11 min-w-32 shrink-0 justify-center rounded-xl text-center lg:w-full lg:justify-start',
                                    {
                                        'bg-[var(--app-soft-strong)] text-[var(--app-ink)]': isCurrentOrParentUrl(item.href),
                                    },
                                )}
                            >
                                <Link href={item.href}>
                                    {item.icon && <item.icon className="h-4 w-4" />}
                                    {t(item.title)}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="lg:hidden" />

                <div className="min-w-0 flex-1">
                    <section className="space-y-4">{children}</section>
                </div>
            </div>
        </div>
    );
}
