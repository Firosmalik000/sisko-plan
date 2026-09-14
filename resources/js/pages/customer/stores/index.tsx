import { Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Building2, LockKeyhole, MapPin, Plus, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { AppPage } from '@/components/page/app-page';
import { EmptyState } from '@/components/page/empty-state';
import { MetricItem, MetricStrip } from '@/components/page/metric-strip';
import { PageSection } from '@/components/page/page-section';
import { RecordList, RecordListRow } from '@/components/page/record-list';
import { SubscriptionLimitContactDialog } from '@/components/subscription-limit-contact-dialog';
import type { SubscriptionLimitKind } from '@/components/subscription-limit-contact-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { translate } from '@/lib/i18n';
import storesRoutes from '@/routes/stores';
import subscriptionRoutes from '@/routes/subscription';
import type { StoreCreationState } from '@/types';

type StoreItem = {
    public_id: string;
    name: string;
    status: 'active' | 'suspended' | 'archived';
    role: 'owner' | 'admin' | 'cashier';
    membership_status: 'active' | 'suspended';
    country: string | null;
    country_code: string | null;
    currency_code: string | null;
    currency_symbol: string | null;
    address: string | null;
};
type AccountUsage = {
    plan_name: string;
    stores_used: number;
    max_stores: number;
    members_used: number;
    max_members: number;
    scans_used: number;
    max_scans: number;
};

export default function StoresIndex({ stores, usage }: { stores: StoreItem[]; usage: AccountUsage | null }) {
    const [limitContact, setLimitContact] = useState<SubscriptionLimitKind | null>(null);
    const { storeCreation } = usePage<{ storeCreation: StoreCreationState }>().props;

    return (
        <>
            <AppPage
                title={translate('Stores & team')}
                description={`${stores.length} ${translate('stores')}`}
                icon={Building2}
                headerSurface
                actions={
                    storeCreation.can_create ? (
                        <Button asChild size="touch">
                            <Link href={storesRoutes.create.url()}>
                                <Plus />
                                {translate('Add store')}
                            </Link>
                        </Button>
                    ) : (
                        <Button type="button" size="touch" variant="outline" onClick={() => setLimitContact('store')}>
                            <LockKeyhole />
                            {translate('Increase store capacity')}
                        </Button>
                    )
                }
            >
                {usage && (
                    <PageSection
                        title={translate('Account capacity')}
                        description={translate(usage.plan_name)}
                        actions={
                            <Button asChild variant="ghost" size="touch">
                                <Link href={subscriptionRoutes.index.url()}>
                                    {translate('Details plan')}
                                    <ArrowRight />
                                </Link>
                            </Button>
                        }
                    >
                        <MetricStrip className="rounded-none bg-card">
                            <CapacityMetric label="Store" used={usage.stores_used} limit={usage.max_stores} />
                            <CapacityMetric label="Staff" used={usage.members_used} limit={usage.max_members} />
                            <CapacityMetric label="AI scans this month" used={usage.scans_used} limit={usage.max_scans} />
                        </MetricStrip>
                    </PageSection>
                )}

                {stores.length === 0 ? (
                    <PageSection>
                        <EmptyState
                            icon={Building2}
                            title={translate('No stores yet')}
                            description={translate('Create a store first to begin setting up operations.')}
                            action={
                                storeCreation.can_create ? (
                                    <Button asChild size="touch">
                                        <Link href={storesRoutes.create.url()}>{translate('Create store first')}</Link>
                                    </Button>
                                ) : (
                                    <Button type="button" size="touch" onClick={() => setLimitContact('store')}>
                                        {translate('Contact admin')}
                                    </Button>
                                )
                            }
                        />
                    </PageSection>
                ) : (
                    <RecordList>
                        {stores.map((store) => {
                            const active = store.status === 'active' && store.membership_status === 'active';

                            return (
                                <RecordListRow
                                    key={store.public_id}
                                    className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                                >
                                    <div className="flex min-w-0 gap-3">
                                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                            <Building2 className="size-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h2 className="truncate font-bold">{store.name}</h2>
                                                <Badge variant={active ? 'secondary' : 'destructive'}>
                                                    {translate(active ? 'Active' : 'Inactive')}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                                                <MapPin className="size-3.5 shrink-0" />
                                                {store.address ?? '-'}
                                            </p>
                                            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <ShieldCheck className="size-3.5" />
                                                    {translate(store.role)}
                                                </span>
                                                <span>{store.country ?? store.country_code ?? '-'}</span>
                                                <span>
                                                    {store.currency_code ?? '-'} {store.currency_symbol}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 sm:flex">
                                        {store.role === 'owner' && (
                                            <Button asChild variant="outline" size="touch">
                                                <Link href={storesRoutes.show.url(store.public_id)}>{translate('Manage')}</Link>
                                            </Button>
                                        )}
                                        {active && (
                                            <Button
                                                type="button"
                                                size="touch"
                                                onClick={() =>
                                                    router.post(
                                                        storesRoutes.switch.url(store.public_id),
                                                        {},
                                                        { preserveState: false, preserveScroll: false },
                                                    )
                                                }
                                            >
                                                {translate('Select store')}
                                            </Button>
                                        )}
                                    </div>
                                </RecordListRow>
                            );
                        })}
                    </RecordList>
                )}
            </AppPage>
            <SubscriptionLimitContactDialog
                kind={limitContact ?? 'store'}
                open={limitContact !== null}
                onOpenChange={(open) => !open && setLimitContact(null)}
            />
        </>
    );
}

StoresIndex.layout = { breadcrumbs: [{ title: 'Stores & Members', href: storesRoutes.index.url() }] };

function CapacityMetric({ label, used, limit }: { label: string; used: number; limit: number }) {
    return (
        <MetricItem
            label={translate(label)}
            value={limit === 0 ? translate('Unlimited') : String(Math.max(0, limit - used))}
            detail={`${used} ${translate('of')} ${limit === 0 ? translate('unlimited') : limit}`}
        />
    );
}
