import type { ReactNode } from 'react';
import { OperationsNav } from '@/components/navigation/operations-nav';
import { AppPage } from '@/components/page/app-page';
import { PageSection } from '@/components/page/page-section';
import { formatMoney, formatQuantity } from '@/lib/currency';
import { currentDateTime, ledgerDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { postingToken } from '@/lib/posting-token';

export const money = formatMoney;

export const quantity = formatQuantity;

// Compatibility exports while callers migrate to focused modules.
export { currentDateTime, ledgerDateTime, postingToken };

export function OperationsShell({
    active,
    title,
    children,
}: {
    active: string;
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <AppPage title={translate(title)} actions={<OperationsNav active={active} />}>
            {children}
        </AppPage>
    );
}

export function LedgerCard({ title, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <PageSection title={translate(title)}>
            <div className="p-4 sm:p-5">{children}</div>
        </PageSection>
    );
}

export const fieldClass =
    'h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15';
export const buttonClass =
    'h-10 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50';
