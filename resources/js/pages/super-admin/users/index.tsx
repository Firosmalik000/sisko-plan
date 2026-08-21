import { Form, Head, Link } from '@inertiajs/react';
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
    platform_role: 'super_admin' | 'admin' | null;
    stores_count: number;
    created_at: string;
    can_impersonate: boolean;
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
            <div className="platform-enter flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div>
                    <p className="platform-kicker">Identity management</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0b292f]">
                        Pengguna platform
                    </h1>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                        {users.total} akun
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
            <div className="platform-panel mt-5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[840px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <th className="px-5 py-4">Pengguna</th>
                                <th className="px-5 py-4">Role</th>
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
                                        <Badge variant="outline">
                                            {user.platform_role ===
                                            'super_admin'
                                                ? 'Super Admin'
                                                : user.platform_role === 'admin'
                                                  ? 'Admin Platform'
                                                  : 'Pengguna Toko'}
                                        </Badge>
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
                                        <div className="flex justify-end gap-2">
                                            {user.can_impersonate && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    asChild
                                                >
                                                    <Link
                                                        href={`/super-admin/users/${user.id}/impersonate`}
                                                        method="post"
                                                        as="button"
                                                    >
                                                        Impersonate
                                                    </Link>
                                                </Button>
                                            )}
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
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    {user.status === 'active'
                                                        ? 'Tangguhkan'
                                                        : 'Aktifkan'}
                                                </Button>
                                            </Form>
                                        </div>
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
