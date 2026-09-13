import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Boxes, CreditCard, ReceiptText, ShoppingCart, Store } from 'lucide-react';
import { AppPage } from '@/components/page/app-page';
import { PageSection } from '@/components/page/page-section';
import { Button } from '@/components/ui/button';
import { translate } from '@/lib/i18n';
import { cash, inventory } from '@/routes/operations';
import { index as posIndex } from '@/routes/pos';
import { index as salesIndex } from '@/routes/sales';
import type { StoreSummary } from '@/types';
import { BusinessDashboard } from './business-dashboard';
import type { DashboardProps } from './types';

export default function DashboardIndex(props: DashboardProps) {
    const { activeStore } = usePage<{ activeStore: StoreSummary }>().props;

    if (!props.canViewBusinessPosition || !props.performance || !props.position) {
        return <OperationalDashboard activeStore={activeStore} />;
    }

    return (
        <BusinessDashboard
            performance={props.performance}
            position={props.position}
            lowStock={props.lowStock ?? []}
            transactions={props.transactions ?? 0}
            salesTrend={props.salesTrend ?? []}
            period={props.period?.key ?? 'month'}
            comparison={props.comparison ?? { direction: 'flat', percentage: 0 }}
            categorySales={props.categorySales ?? []}
            topProducts={props.topProducts ?? []}
        />
    );
}

function OperationalDashboard({ activeStore }: { activeStore: StoreSummary }) {
    const shortcuts = [
        { href: posIndex.url(), label: 'Open Checkout', icon: ShoppingCart },
        { href: salesIndex.url(), label: 'Sales', icon: ReceiptText },
        { href: inventory.url(), label: 'Inventory', icon: Boxes },
        { href: cash.url(), label: 'Cash & Bank', icon: CreditCard },
    ];

    return (
        <AppPage
            title={activeStore.name}
            icon={Store}
            headerSurface
            actions={
                <Button asChild size="touch">
                    <Link href={posIndex.url()}>
                        {translate('New transaction')}
                        <ArrowUpRight />
                    </Link>
                </Button>
            }
        >
            <PageSection contentClassName="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                {shortcuts.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="bg-card p-4 transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                    >
                        <item.icon className="size-5 text-muted-foreground" />
                        <p className="mt-5 text-sm font-medium">{translate(item.label)}</p>
                    </Link>
                ))}
            </PageSection>
        </AppPage>
    );
}
