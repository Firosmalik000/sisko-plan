import type { PaginationLink } from '@/components/pagination';
import { ReferenceDataPage } from '@/components/reference-data-page';
import type { ReferenceRecord } from '@/components/reference-data-page';

type Account = ReferenceRecord & {
    type: string;
    account_number: string | null;
    notes: string | null;
};
const labels: Record<string, string> = {
    cash: 'Kas tunai',
    bank: 'Bank',
    e_wallet: 'E-wallet',
};

export default function FinancialAccountsIndex({
    accounts,
    search,
    status,
    canManage,
}: {
    accounts: { data: Account[]; links: PaginationLink[]; total: number };
    accountTypes: string[];
    search: string;
    status: string;
    canManage: boolean;
}) {
    const mapped = {
        ...accounts,
        data: accounts.data.map((account) => ({
            ...account,
            type_label: labels[account.type] ?? account.type,
        })),
    };

    return (
        <ReferenceDataPage
            title="Kas & rekening"
            endpoint="/master-data/financial-accounts"
            singular="Akun"
            items={mapped}
            search={search}
            status={status}
            canManage={canManage}
            initialValues={{
                name: '',
                type: 'cash',
                account_number: '',
                notes: '',
            }}
            fields={[
                {
                    name: 'name',
                    label: 'Nama akun',
                    placeholder: 'Contoh: Kas toko',
                },
                {
                    name: 'type',
                    label: 'Jenis akun',
                    type: 'select',
                    options: Object.entries(labels).map(([value, label]) => ({
                        value,
                        label,
                    })),
                },
                { name: 'account_number', label: 'Nomor rekening / akun' },
                { name: 'notes', label: 'Catatan', type: 'textarea' },
            ]}
            details={[
                { key: 'type_label', label: 'Jenis' },
                { key: 'account_number', label: 'Nomor' },
            ]}
        />
    );
}

FinancialAccountsIndex.layout = {
    breadcrumbs: [
        { title: 'Master Data', href: '/master-data/products' },
        { title: 'Kas & rekening', href: '/master-data/financial-accounts' },
    ],
};
