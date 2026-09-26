import { Link } from '@inertiajs/react';
import { Activity, ShieldCheck, UserRound } from 'lucide-react';
import { AppPage } from '@/components/page/app-page';
import { useTranslation } from '@/lib/i18n';
import teamRoutes from '@/routes/team';

type Member = {
    display_name: string;
    business_role: string;
    status: string;
    email: string | null;
    has_pin: boolean;
    stores: Array<{ public_id: string; name: string }>;
};

export default function TeamShow({
    member,
    summary,
    activity,
}: {
    member: Member;
    summary: { sales: number; shifts: number };
    activity: Array<{ action: string; created_at: string }>;
}) {
    const { t } = useTranslation();

    return (
        <AppPage
            title={member.display_name}
            back={{ href: teamRoutes.index.url(), label: t('Staff & checkout') }}
            icon={UserRound}
            headerSurface
        >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)]">
                <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                    <h2 className="flex items-center gap-2 font-bold">
                        <ShieldCheck className="size-5 text-primary" /> {t('Access')}
                    </h2>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                        <Item label={t('Role')} value={t(member.business_role)} />
                        <Item label={t('Status')} value={t(member.status)} />
                        <Item label={t('Personal login')} value={member.email ?? t('POS device only')} />
                        <Item label={t('Cashier PIN')} value={member.has_pin ? t('Configured') : t('Not configured')} />
                        <Item label={t('Stores')} value={member.stores.map((store) => store.name).join(', ') || t('All stores')} />
                    </dl>
                </section>
                <section className="grid grid-cols-2 gap-3">
                    <Metric label={t('Sales')} value={summary.sales} />
                    <Metric label={t('Shifts')} value={summary.shifts} />
                </section>
            </div>
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-bold">
                        <Activity className="size-5 text-primary" /> {t('Recent activity')}
                    </h2>
                    <Link href={teamRoutes.activity.index.url()} className="text-sm font-semibold text-primary">
                        {t('View team activity')}
                    </Link>
                </div>
                <div className="mt-4 divide-y divide-border">
                    {activity.map((item, index) => (
                        <div key={`${item.action}-${index}`} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                            <span className="font-medium">{t(item.action)}</span>
                            <time className="shrink-0 text-xs text-muted-foreground">{item.created_at}</time>
                        </div>
                    ))}
                    {activity.length === 0 && <p className="py-6 text-sm text-muted-foreground">{t('No operational activity yet.')}</p>}
                </div>
            </section>
        </AppPage>
    );
}

function Item({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-semibold">{value}</dd>
        </div>
    );
}

function Metric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        </div>
    );
}
