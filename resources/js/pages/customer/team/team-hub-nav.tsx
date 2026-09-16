import { Link } from '@inertiajs/react';
import { Activity, MonitorDot, MonitorSmartphone, UsersRound } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import registersRoutes from '@/routes/registers';
import teamRoutes from '@/routes/team';

type TeamHubSection = 'staff' | 'devices' | 'registers' | 'activity';

export function TeamHubNav({ active }: { active: TeamHubSection }) {
    const { t } = useTranslation();
    const items = [
        { key: 'staff', label: t('Staff'), href: teamRoutes.index.url(), icon: UsersRound },
        { key: 'devices', label: t('Cashier devices'), href: `${teamRoutes.index.url()}#cashier-devices`, icon: MonitorSmartphone },
        { key: 'registers', label: t('Registers'), href: registersRoutes.index.url(), icon: MonitorDot },
        { key: 'activity', label: t('Activity'), href: teamRoutes.activity.index.url(), icon: Activity },
    ] as const;

    return (
        <nav
            aria-label={t('Staff & checkout')}
            className="-mx-1 [scrollbar-width:none] overflow-x-auto px-1 pb-1 [&::-webkit-scrollbar]:hidden"
        >
            <div className="flex min-w-max gap-1 rounded-xl bg-muted p-1">
                {items.map((item) => {
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            aria-current={active === item.key ? 'page' : undefined}
                            className={cn(
                                'flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                active === item.key
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="size-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
