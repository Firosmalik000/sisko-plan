import { Ruler } from 'lucide-react';
import { ReferenceDataPage } from '@/components/page/reference-data-page';
import type { ReferenceRecord } from '@/components/page/reference-data-page';
import type { PaginationLink } from '@/components/pagination';
import { translate } from '@/lib/i18n';
import { referenceLabel } from '@/lib/unit-references';
import type { UnitReference } from '@/lib/unit-references';
import { index, store, update } from '@/routes/master-data/units';

type Unit = ReferenceRecord & {
    symbol: string;
    unit_type: 'large' | 'retail';
    unit_type_label: string;
};

export default function UnitsIndex({
    units,
    unitReferences,
    search,
    status,
    canManage,
}: {
    units: { data: Unit[]; links: PaginationLink[]; total: number };
    unitReferences: UnitReference[];
    search: string;
    status: string;
    canManage: boolean;
}) {
    return (
        <ReferenceDataPage
            title="Satuan barang"
            icon={Ruler}
            routes={{ index: index.url(), store: store.url(), update: update.url }}
            singular="Satuan"
            items={units}
            search={search}
            status={status}
            canManage={canManage}
            displayName={(item) => referenceLabel(item, 'units', translate)}
            initialValues={{ name: '', symbol: '', unit_type: 'retail', reference_code: '', name_is_custom: true }}
            fields={[
                {
                    name: 'reference_code',
                    label: 'Referensi satuan',
                    type: 'select',
                    options: (values) => [
                        { value: '', label: translate('Satuan custom') },
                        ...unitReferences
                            .filter(
                                (item) =>
                                    (item.is_active && item.roles.includes(values.unit_type === 'large' ? 'large' : 'sale')) ||
                                    item.code === values.reference_code,
                            )
                            .map((item) => ({
                                value: item.code,
                                disabled: !item.is_active || !item.roles.includes(values.unit_type === 'large' ? 'large' : 'sale'),
                                label:
                                    translate(`units.${item.code}`) === `units.${item.code}` ? item.name : translate(`units.${item.code}`),
                            })),
                    ],
                    change: (value, values) => {
                        const reference = unitReferences.find((item) => item.code === value);

                        return {
                            name: reference?.name ?? String(values.name),
                            symbol: reference?.symbol ?? String(values.symbol),
                            name_is_custom: !reference,
                        };
                    },
                },
                {
                    name: 'name',
                    label: 'Nama satuan',
                    placeholder: 'Botol',
                    change: () => ({ name_is_custom: true }),
                },
                {
                    name: 'name_is_custom',
                    label: 'Nama khusus',
                    type: 'select',
                    options: [
                        { value: 'true', label: translate('Nama khusus') },
                        { value: 'false', label: translate('Gunakan nama standar') },
                    ],
                    change: (value) => ({ name_is_custom: value === 'true' }),
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
