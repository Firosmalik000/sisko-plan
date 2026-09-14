import type { StoreCreationState, StoreSummary, User } from '@/types';

export type CustomerPageProps = {
    name: string;
    branding: { logo_url: string | null };
    auth: { user: User | null };
    stores: StoreSummary[];
    activeStore: StoreSummary | null;
    storeCreation: StoreCreationState | null;
    stockAlerts?: {
        count: number;
        unread_count: number;
        items: Array<{
            id: number;
            name: string;
            variant_name: string | null;
            unit: string;
            quantity: string;
            minimum_quantity: string;
            unread: boolean;
        }>;
    };
};
