import type { PaginationLink } from '@/components/pagination';
import { ReferenceDataPage } from '@/components/reference-data-page';
import type { ReferenceRecord } from '@/components/reference-data-page';

type Category = ReferenceRecord;

export default function CategoriesIndex({
    categories,
    search,
    status,
    canManage,
}: {
    categories: { data: Category[]; links: PaginationLink[]; total: number };
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
            initialValues={{ name: '' }}
            fields={[
                {
                    name: 'name',
                    label: 'Nama kategori',
                    placeholder: 'Minuman dingin',
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
