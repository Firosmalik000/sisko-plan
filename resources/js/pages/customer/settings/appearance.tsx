import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { PageSection } from '@/components/page/page-section';
import { useTranslation } from '@/lib/i18n';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('Theme display')} />

            <h1 className="sr-only">{t('Theme display')}</h1>

            <PageSection
                title={t('Theme display')}
                description={t('Choose a comfortable appearance for this device.')}
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
            title: 'Theme display',
            href: editAppearance(),
        },
    ],
};
