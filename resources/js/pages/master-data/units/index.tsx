import type { PaginationLink } from '@/components/pagination';
import { ReferenceDataPage } from '@/components/reference-data-page';
import type { ReferenceRecord } from '@/components/reference-data-page';

type Unit = ReferenceRecord & { symbol: string };

export default function UnitsIndex({
    units,
    search,
    status,
    canManage,
}: {
    units: { data: Unit[]; links: PaginationLink[]; total: number };
    search: string;
    status: string;
    canManage: boolean;
}) {
    return (
        <ReferenceDataPage
            title="Satuan barang"
            eyebrow="Katalog / Ukuran"
            description="Definisikan satuan dasar dan satuan jual seperti pcs, dus, kilogram, atau liter."
            endpoint="/master-data/units"
            singular="Satuan"
            items={units}
            search={search}
            status={status}
            canManage={canManage}
            initialValues={{ name: '', symbol: '' }}
            fields={[
                {
                    name: 'name',
                    label: 'Nama satuan',
                    placeholder: 'Contoh: Pieces',
                },
                {
                    name: 'symbol',
                    label: 'Singkatan',
                    placeholder: 'Contoh: pcs',
                },
            ]}
            details={[{ key: 'symbol', label: 'Singkatan' }]}
        />
    );
}

UnitsIndex.layout = {
    breadcrumbs: [
        { title: 'Master Data', href: '/master-data/products' },
        { title: 'Satuan', href: '/master-data/units' },
    ],
};
