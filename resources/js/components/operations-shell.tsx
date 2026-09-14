import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { OperationsNav } from '@/components/navigation/operations-nav';
import { AppPage } from '@/components/page/app-page';
import { PageSection } from '@/components/page/page-section';
import { translate } from '@/lib/i18n';

export function OperationsShell({
    active,
    title,
    icon,
    back,
    children,
}: {
    active: string;
    title: string;
    icon: LucideIcon;
    back?: { href: string; label: string };
    children: ReactNode;
}) {
    return (
        <AppPage title={translate(title)} icon={icon} back={back} headerSurface actions={<OperationsNav active={active} />}>
            {children}
        </AppPage>
    );
}

export function LedgerCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <PageSection title={translate(title)} description={description ? translate(description) : undefined}>
            <div className="p-4 sm:p-5">{children}</div>
        </PageSection>
    );
}

export const fieldClass =
    'h-11 w-full rounded-xl border border-input bg-background px-3 text-base text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm';
