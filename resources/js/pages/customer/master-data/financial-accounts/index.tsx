import { Landmark, WalletCards } from 'lucide-react';
import { ReferenceDataPage } from '@/components/page/reference-data-page';
import type { ReferenceRecord } from '@/components/page/reference-data-page';
import type { PaginationLink } from '@/components/pagination';
import { translate } from '@/lib/i18n';
import { index, store, update } from '@/routes/master-data/financial-accounts';

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
    accountTypes,
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
            type_label: translate(labels[account.type] ?? account.type),
        })),
    };

    return (
        <ReferenceDataPage
            title="Kas & rekening"
            icon={WalletCards}
            recordIcon={Landmark}
            routes={{ index: index.url(), store: store.url(), update: update.url }}
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
                    options: accountTypes.map((type) => ({
                        value: type,
                        label: labels[type] ?? type,
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
