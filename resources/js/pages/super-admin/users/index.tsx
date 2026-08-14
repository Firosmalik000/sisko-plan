import { Form, Head } from '@inertiajs/react';
import { Search, Users } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UserItem = {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'suspended';
    stores_count: number;
    created_at: string;
};
type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
    links: PaginationLink[];
};

export default function AdminUsers({
    users,
    filters,
}: {
    users: Paginated<UserItem>;
    filters: { search: string };
}) {
    return (
        <>
            <Head title="Kelola Pengguna" />
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                    <p className="text-xs font-semibold tracking-[0.22em] text-[#8a681e] uppercase">
                        Identity control
                    </p>
                    <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                        Pengguna platform
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        {users.total} akun terdaftar di seluruh toko.
                    </p>
                </div>
                <Form
                    action="/super-admin/users"
                    method="get"
                    className="flex w-full max-w-sm gap-2"
                >
                    <Input
                        name="search"
                        defaultValue={filters.search}
                        placeholder="Cari nama atau email"
                        className="bg-white/70"
                    />
                    <Button variant="outline">
                        <Search /> Cari
                    </Button>
                </Form>
            </div>
            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-900/10 bg-white/75">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-slate-900/10 bg-[#102b31] text-xs tracking-wider text-slate-300 uppercase">
                            <tr>
                                <th className="px-5 py-4">Pengguna</th>
                                <th className="px-5 py-4">Toko</th>
                                <th className="px-5 py-4">Terdaftar</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4 text-right">
                                    Tindakan
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/8">
                            {users.data.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-5 py-4">
                                        <p className="font-medium">
                                            {user.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {user.email}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="inline-flex items-center gap-2">
                                            <Users className="size-4 text-slate-400" />
                                            {user.stores_count}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">
                                        {user.created_at}
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge
                                            variant={
                                                user.status === 'active'
                                                    ? 'secondary'
                                                    : 'destructive'
                                            }
                                        >
                                            {user.status === 'active'
                                                ? 'Aktif'
                                                : 'Ditangguhkan'}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <Form
                                            action={`/super-admin/users/${user.id}/status`}
                                            method="patch"
                                        >
                                            <input
                                                type="hidden"
                                                name="status"
                                                value={
                                                    user.status === 'active'
                                                        ? 'suspended'
                                                        : 'active'
                                                }
                                            />
                                            <Button size="sm" variant="outline">
                                                {user.status === 'active'
                                                    ? 'Tangguhkan'
                                                    : 'Aktifkan'}
                                            </Button>
                                        </Form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {users.data.length === 0 && (
                    <div className="py-14 text-center text-sm text-slate-500">
                        Pengguna tidak ditemukan.
                    </div>
                )}
                <div className="flex flex-col gap-3 border-t border-slate-900/8 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Halaman {users.current_page} dari {users.last_page}
                    </span>
                    <Pagination links={users.links} />
                </div>
            </div>
        </>
    );
}
