import { Contact, Truck } from 'lucide-react';
import { ReferenceDataPage } from '@/components/page/reference-data-page';
import type { ReferenceRecord } from '@/components/page/reference-data-page';
import type { PaginationLink } from '@/components/pagination';
import { index, store, update } from '@/routes/master-data/suppliers';

type Supplier = ReferenceRecord & {
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
};

export default function SuppliersIndex({
    suppliers,
    search,
    status,
    canManage,
}: {
    suppliers: { data: Supplier[]; links: PaginationLink[]; total: number };
    search: string;
    status: string;
    canManage: boolean;
}) {
    return (
        <ReferenceDataPage
            title="Supplier"
            icon={Truck}
            recordIcon={Contact}
            routes={{ index: index.url(), store: store.url(), update: update.url }}
            singular="Supplier"
            items={suppliers}
            search={search}
            status={status}
            canManage={canManage}
            initialValues={{
                name: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
            }}
            fields={[
                { name: 'name', label: 'Nama supplier' },
                { name: 'contact_person', label: 'Kontak utama' },
                { name: 'phone', label: 'Nomor telepon', type: 'tel' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'address', label: 'Alamat', type: 'textarea' },
            ]}
            details={[
                { key: 'contact_person', label: 'Kontak' },
                { key: 'phone', label: 'Telepon' },
                { key: 'email', label: 'Email' },
            ]}
        />
    );
}
