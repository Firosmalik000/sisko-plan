import type { PaginationLink } from '@/components/pagination';
import { ReferenceDataPage } from '@/components/reference-data-page';
import type { ReferenceRecord } from '@/components/reference-data-page';

type Unit = ReferenceRecord & {
    symbol: string;
    unit_type: 'large' | 'retail';
    unit_type_label: string;
};

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
            endpoint="/master-data/units"
            singular="Satuan"
            items={units}
            search={search}
            status={status}
            canManage={canManage}
            initialValues={{ name: '', symbol: '', unit_type: 'retail' }}
            fields={[
                {
                    name: 'name',
                    label: 'Nama satuan',
                    placeholder: 'Botol',
                },
                {
                    name: 'symbol',
                    label: 'Singkatan',
                    placeholder: 'btl',
                },
                {
                    name: 'unit_type',
                    label: 'Kelompok',
                    type: 'select',
                    options: [
                        { value: 'retail', label: 'Ecer' },
                        { value: 'large', label: 'Besar' },
                    ],
                },
            ]}
            details={[
                { key: 'symbol', label: 'Singkatan' },
                { key: 'unit_type_label', label: 'Kelompok' },
            ]}
        />
    );
}

UnitsIndex.layout = {
    breadcrumbs: [
        { title: 'Master Data', href: '/master-data/products' },
        { title: 'Satuan', href: '/master-data/units' },
    ],
};
