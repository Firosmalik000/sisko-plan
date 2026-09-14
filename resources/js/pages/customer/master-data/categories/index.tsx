import { Tags } from 'lucide-react';
import { ReferenceDataPage } from '@/components/page/reference-data-page';
import type { ReferenceRecord } from '@/components/page/reference-data-page';
import type { PaginationLink } from '@/components/pagination';
import { translate } from '@/lib/i18n';
import { referenceLabel } from '@/lib/unit-references';
import type { CategoryReference } from '@/lib/unit-references';
import { index, store, update } from '@/routes/master-data/categories';

type Category = ReferenceRecord;

export default function CategoriesIndex({
    categories,
    categoryReferences,
    search,
    status,
    canManage,
}: {
    categories: { data: Category[]; links: PaginationLink[]; total: number };
    categoryReferences: CategoryReference[];
    search: string;
    status: string;
    canManage: boolean;
}) {
    return (
        <ReferenceDataPage
            title="Category product"
            icon={Tags}
            routes={{ index: index.url(), store: store.url(), update: update.url }}
            singular="Category"
            items={categories}
            search={search}
            status={status}
            canManage={canManage}
            displayName={(item) => referenceLabel(item, 'categories', translate)}
            initialValues={{ name: '', reference_code: '', name_is_custom: true }}
            fields={[
                {
                    name: 'reference_code',
                    label: 'Reference category',
                    type: 'select',
                    options: (values) => [
                        { value: '', label: translate('User-defined category') },
                        ...categoryReferences
                            .filter((item) => item.is_active || item.code === values.reference_code)
                            .map((item) => ({
                                value: item.code,
                                label: referenceLabel(
                                    { ...item, reference_code: item.code, name_is_custom: false },
                                    'categories',
                                    translate,
                                ),
                                disabled: !item.is_active,
                            })),
                    ],
                    change: (value, values) => {
                        const reference = categoryReferences.find((item) => item.code === value);

                        return { name: reference?.name ?? String(values.name), name_is_custom: !reference };
                    },
                },
                {
                    name: 'name',
                    label: 'Category name',
                    placeholder: 'Cold drink',
                    change: () => ({ name_is_custom: true }),
                },
                {
                    name: 'name_is_custom',
                    label: 'Custom name',
                    type: 'select',
                    options: [
                        { value: 'true', label: translate('Custom name') },
                        { value: 'false', label: translate('Use the standard name') },
                    ],
                    change: (value) => ({ name_is_custom: value === 'true' }),
                },
            ]}
            details={[]}
        />
    );
}
