import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { PageSection } from '@/components/page/page-section';
import { useTranslation } from '@/lib/i18n';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Tema tampilan')} />

            <h1 className="sr-only">{t('Tema tampilan')}</h1>

            <PageSection
                title={t('Tema tampilan')}
                description={t('Pilih tampilan yang nyaman digunakan pada perangkat ini.')}
                contentClassName="p-4 sm:p-5"
            >
                <AppearanceTabs />
            </PageSection>
        </>
    );
}

Appearance.layout = {
    breadcrumbs: [
        {
            title: 'Tema tampilan',
            href: editAppearance(),
        },
    ],
};
