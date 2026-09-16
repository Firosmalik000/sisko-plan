import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Grid2X2 } from 'lucide-react';
import { AppPage } from '@/components/page/app-page';
import type { CustomerPageProps } from '@/layouts/customer/customer-page-props';
import { moreMenuSections } from '@/layouts/customer/navigation-items';
import { useTranslation } from '@/lib/i18n';

export default function MoreIndex() {
    const { t } = useTranslation();
    const { capabilities } = usePage<CustomerPageProps>().props;

    return (
        <AppPage title={t('More')} description={t('Operations, finance, master data, and store settings.')} icon={Grid2X2} headerSurface>
            <div className="grid gap-4 lg:grid-cols-2">
                {moreMenuSections
                    .map((section) => ({
                        ...section,
                        items: section.items.filter((item) => !('capability' in item) || capabilities.includes(item.capability)),
                    }))
                    .filter((section) => section.items.length > 0)
                    .map((section) => (
                        <section key={section.title} className="overflow-hidden rounded-xl border border-border bg-card">
                            <h2 className="border-b border-border px-4 py-3 text-sm font-bold">{t(section.title)}</h2>
                            <div>
                                {section.items.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex min-h-14 items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                                    >
                                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                                            <item.icon className="size-5" aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0 flex-1 text-sm font-semibold">{t(item.title)}</span>
                                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))}
            </div>
        </AppPage>
    );
}
