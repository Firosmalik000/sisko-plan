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
            title="Suppliers"
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
                { name: 'name', label: 'Supplier name' },
                { name: 'contact_person', label: 'Primary contact' },
                { name: 'phone', label: 'Phone number', type: 'tel' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'address', label: 'Address', type: 'textarea' },
            ]}
            details={[
                { key: 'contact_person', label: 'Contact' },
                { key: 'phone', label: 'Telephone' },
                { key: 'email', label: 'Email' },
            ]}
        />
    );
}
