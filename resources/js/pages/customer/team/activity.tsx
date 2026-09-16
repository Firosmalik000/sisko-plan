import { Activity } from 'lucide-react';
import { AppPage } from '@/components/page/app-page';
import { useTranslation } from '@/lib/i18n';

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

export default function TeamActivity({ stores, activity }: { stores: Store[]; activity: StaffActivity[] }) {
    const { t } = useTranslation();

    return (
        <AppPage
            title={t('Team activity')}
            description={t('Register accountability and sales activity for accessible stores.')}
            icon={Activity}
            headerSurface
        >
            <div className="mb-4 flex flex-wrap gap-2">
                {stores.map((store) => (
                    <span key={store.public_id} className="rounded-full border bg-card px-3 py-1 text-xs font-semibold">
                        {store.name}
                    </span>
                ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {activity.map((staff) => (
                    <article key={staff.public_id} className="rounded-xl border bg-card p-4">
                        <p className="font-bold">{staff.display_name}</p>
                        <p className="text-xs text-muted-foreground">{t(staff.business_role)}</p>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <Metric label={t('Sales')} value={staff.sale_count} />
                            <Metric label={t('Open shifts')} value={staff.open_sessions} />
                            <Metric label={t('Sale value')} value={staff.sale_value} />
                            <Metric label={t('Cash variance')} value={staff.variance} />
                        </dl>
                    </article>
                ))}
            </div>
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
