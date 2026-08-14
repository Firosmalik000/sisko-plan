import type { PaginationLink } from '@/components/pagination';
import { ReferenceDataPage } from '@/components/reference-data-page';
import type { ReferenceRecord } from '@/components/reference-data-page';

type Category = ReferenceRecord & { description: string | null };

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
            eyebrow="Katalog / Pengelompokan"
            description="Susun produk ke kelompok yang mudah dipahami kasir dan pemilik toko."
            endpoint="/master-data/categories"
            singular="Kategori"
            items={categories}
            search={search}
            status={status}
            canManage={canManage}
            initialValues={{ name: '', description: '' }}
            fields={[
                {
                    name: 'name',
                    label: 'Nama kategori',
                    placeholder: 'Contoh: Minuman dingin',
                },
                {
                    name: 'description',
                    label: 'Keterangan',
                    type: 'textarea',
                    placeholder: 'Opsional',
                },
            ]}
            details={[{ key: 'description', label: 'Keterangan' }]}
        />
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [
        { title: 'Master Data', href: '/master-data/products' },
        { title: 'Kategori', href: '/master-data/categories' },
    ],
};
