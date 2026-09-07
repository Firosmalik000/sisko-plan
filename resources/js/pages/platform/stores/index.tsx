import { Form, Head } from '@inertiajs/react';
import { Building2, Power, Search } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import {
    paginatedRowNumber,
    PlatformTableLeadCell,
    PlatformTableLeadHeader,
} from '@/components/platform-table-lead-cell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type StoreItem = {
    public_id: string;
    name: string;
    status: 'active' | 'suspended';
    owner: { name: string; email: string };
    active_members_count: number;
    created_at: string;
    subscription: { status: string; plan_name: string } | null;
};
type Paginated<T> = {
    data: T[];
    current_page: number;
    per_page: number;
    last_page: number;
    total: number;
    links: PaginationLink[];
};

export default function AdminStores({
    stores,
    filters,
    can_update_status,
}: {
    stores: Paginated<StoreItem>;
    filters: { search: string };
    can_update_status: boolean;
}) {
    return (
        <>
            <Head title="Kelola Toko" />
            <div className="platform-enter flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                    <p className="platform-kicker">Tenant management</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3b211b]">
                        Toko terdaftar
                    </h1>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        {stores.total} tenant
                    </p>
                </div>
                <Form
                    action="/super-admin/stores"
                    method="get"
                    className="flex w-full max-w-sm gap-2"
                >
                    <Input
                        name="search"
                        defaultValue={filters.search}
                        placeholder="Cari nama toko"
                        className="bg-white/70"
                    />
                    <Button variant="outline">
                        <Search /> Cari
                    </Button>
                </Form>
            </div>
            <div className="platform-panel mt-5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <PlatformTableLeadHeader />
                                <th className="px-5 py-4">Toko</th>
                                <th className="px-5 py-4">Pemilik</th>
                                <th className="px-5 py-4">Anggota aktif</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4">Subscription</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/8">
                            {stores.data.map((store, index) => (
                                <tr key={store.public_id}>
                                    <PlatformTableLeadCell
                                        index={paginatedRowNumber(
                                            stores.current_page,
                                            stores.per_page,
                                            index,
                                        )}
                                        label={store.name}
                                        actions={
                                            can_update_status
                                                ? [
                                                      {
                                                          label:
                                                              store.status ===
                                                              'active'
                                                                  ? 'Tangguhkan toko'
                                                                  : 'Aktifkan toko',
                                                          icon: Power,
                                                          href: `/super-admin/stores/${store.public_id}/status`,
                                                          method: 'patch',
                                                          data: {
                                                              status:
                                                                  store.status ===
                                                                  'active'
                                                                      ? 'suspended'
                                                                      : 'active',
                                                          },
                                                          destructive:
                                                              store.status ===
                                                              'active',
                                                      },
                                                  ]
                                                : []
                                        }
                                    />
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-9 items-center justify-center rounded-lg bg-[#ff7a59]/20 text-[#9f2f19]">
                                                <Building2 className="size-4" />
                                            </span>
                                            <div>
                                                <p className="font-medium">
                                                    {store.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {store.created_at}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p>{store.owner.name}</p>
                                        <p className="text-xs text-slate-500">
                                            {store.owner.email}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4">
                                        {store.active_members_count}
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge
                                            variant={
                                                store.status === 'active'
                                                    ? 'secondary'
                                                    : 'destructive'
                                            }
                                        >
                                            {store.status === 'active'
                                                ? 'Aktif'
                                                : 'Ditangguhkan'}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-4">
                                        {store.subscription === null ? (
                                            <span className="text-xs text-rose-700">
                                                Belum ada
                                            </span>
                                        ) : (
                                            <div>
                                                <p className="font-medium">
                                                    {
                                                        store.subscription
                                                            .plan_name
                                                    }
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {store.subscription.status}
                                                </p>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {stores.data.length === 0 && (
                    <div className="py-14 text-center text-sm text-slate-500">
                        Toko tidak ditemukan.
                    </div>
                )}
                <div className="flex flex-col gap-3 border-t border-slate-900/8 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Halaman {stores.current_page} dari {stores.last_page}
                    </span>
                    <Pagination links={stores.links} />
                </div>
            </div>
        </>
    );
}
