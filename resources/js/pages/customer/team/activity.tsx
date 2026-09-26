import { Link } from '@inertiajs/react';
import { Activity } from 'lucide-react';
import { AppPage } from '@/components/page/app-page';
import { formatMoney } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
import teamRoutes from '@/routes/team';
import { TeamHubNav } from './team-hub-nav';

type Store = { public_id: string; name: string };
type StaffActivity = {
    public_id: string;
    display_name: string;
    business_role: string;
    last_active_at: string | null;
    open_sessions: number;
    sale_count: number;
    sale_value: string;
    discounts: string;
    variance: string;
    drawer_movements: number;
};

export default function TeamActivity({ activityStores, activity }: { activityStores: Store[]; activity: StaffActivity[] }) {
    const { t } = useTranslation();

    return (
        <AppPage title={t('Staff & checkout')} icon={Activity} headerSurface>
            <TeamHubNav active="activity" />
            <section aria-labelledby="activity-heading">
                <div className="mb-3">
                    <h2 id="activity-heading" className="font-bold">
                        {t('Team activity')}
                    </h2>
                </div>
                {activityStores.length > 1 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {activityStores.map((store) => (
                            <span key={store.public_id} className="rounded-full border bg-card px-3 py-1 text-xs font-semibold">
                                {store.name}
                            </span>
                        ))}
                    </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {activity.map((staff) => (
                        <Link
                            key={staff.public_id}
                            href={teamRoutes.show.url(staff.public_id)}
                            className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-bold">{staff.display_name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{t(staff.business_role)}</p>
                                </div>
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                <Metric label={t('Sales')} value={staff.sale_count} />
                                <Metric label={t('Open shifts')} value={staff.open_sessions} />
                                <Metric label={t('Sale value')} value={formatMoney(Number(staff.sale_value))} />
                                <Metric label={t('Cash variance')} value={formatMoney(Number(staff.variance))} />
                            </dl>
                        </Link>
                    ))}
                    {activity.length === 0 && (
                        <div className="rounded-2xl border border-dashed p-6 text-center sm:col-span-2 xl:col-span-3">
                            <p className="font-semibold">{t('Staff activity will appear after the first sale or register shift.')}</p>
                        </div>
                    )}
                </div>
            </section>
        </AppPage>
    );
}

function Metric({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-semibold tabular-nums">{value}</dd>
        </div>
    );
}
