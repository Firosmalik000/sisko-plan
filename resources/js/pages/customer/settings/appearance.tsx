import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { edit as editAppearance } from '@/routes/appearance';

export default function Appearance() {
    return (
        <>
            <Head title="Tema tampilan" />

            <h1 className="sr-only">Tema tampilan</h1>

            <div className="space-y-6">
                <Heading variant="small" title="Tema tampilan" />
                <AppearanceTabs />
            </div>
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
