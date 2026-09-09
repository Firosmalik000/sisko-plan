import type { PaginationLink } from '@/components/pagination';
import { ReferenceDataPage } from '@/components/reference-data-page';
import type { ReferenceRecord } from '@/components/reference-data-page';
import { translate } from '@/lib/i18n';
import { referenceLabel } from '@/lib/unit-references';
import type { CategoryReference } from '@/lib/unit-references';

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
            title="Kategori produk"
            endpoint="/master-data/categories"
            singular="Kategori"
            items={categories}
            search={search}
            status={status}
            canManage={canManage}
            displayName={(item) => referenceLabel(item, 'categories', translate)}
            initialValues={{ name: '', reference_code: '', name_is_custom: true }}
            fields={[
                {
                    name: 'reference_code',
                    label: 'Referensi kategori',
                    type: 'select',
                    options: (values) => [
                        { value: '', label: translate('Kategori custom') },
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
                    label: 'Nama kategori',
                    placeholder: 'Minuman dingin',
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
            ]}
            details={[]}
        />
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [
        { title: 'Master Data', href: '/master-data/products' },
        { title: 'Kategori', href: '/master-data/categories' },
    ],
};
