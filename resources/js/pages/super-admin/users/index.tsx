import { Form, Head } from '@inertiajs/react';
import { Power, Search, Trash2, UserRoundCog, Users } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import {
    paginatedRowNumber,
    PlatformTableLeadCell,
    PlatformTableLeadHeader,
} from '@/components/platform-table-lead-cell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type UserItem = {
    id: number;
    name: string;
    email: string;
    status: 'active' | 'suspended';
    platform_role: 'super_admin' | 'admin' | null;
    stores_count: number;
    created_at: string;
    can_update_status: boolean;
    can_impersonate: boolean;
    can_delete: boolean;
};
type Paginated<T> = {
    data: T[];
    current_page: number;
    per_page: number;
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
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3b211b]">
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
                                <PlatformTableLeadHeader />
                                <th className="px-5 py-4">Pengguna</th>
                                <th className="px-5 py-4">Role</th>
                                <th className="px-5 py-4">Toko</th>
                                <th className="px-5 py-4">Terdaftar</th>
                                <th className="px-5 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/8">
                            {users.data.map((user, index) => (
                                <tr key={user.id}>
                                    <UserLeadCell
                                        user={user}
                                        index={paginatedRowNumber(
                                            users.current_page,
                                            users.per_page,
                                            index,
                                        )}
                                    />
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

function UserLeadCell({ user, index }: { user: UserItem; index: number }) {
    const [open, setOpen] = useState(false);
    const actions = [];

    if (user.can_impersonate) {
        actions.push({
            label: 'Masuk sebagai pengguna',
            icon: UserRoundCog,
            href: `/super-admin/users/${user.id}/impersonate`,
            method: 'post' as const,
        });
    }

    if (user.can_update_status) {
        actions.push({
            label:
                user.status === 'active' ? 'Tangguhkan akun' : 'Aktifkan akun',
            icon: Power,
            href: `/super-admin/users/${user.id}/status`,
            method: 'patch' as const,
            data: {
                status: user.status === 'active' ? 'suspended' : 'active',
            },
            destructive: user.status === 'active',
        });
    }

    if (user.can_delete) {
        actions.push({
            label: 'Hapus akun',
            icon: Trash2,
            destructive: true,
            onSelect: () => setOpen(true),
        });
    }

    return (
        <PlatformTableLeadCell
            index={index}
            label={user.name}
            actions={actions}
            overlays={
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-md">
                        <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-12 text-left">
                            <DialogTitle>Hapus akun {user.name}?</DialogTitle>
                            <DialogDescription className="mt-2">
                                Akun tanpa histori transaksi akan dihapus
                                permanen.
                            </DialogDescription>
                        </DialogHeader>
                        <Form
                            action={`/super-admin/users/${user.id}`}
                            method="delete"
                            onSuccess={() => setOpen(false)}
                        >
                            {({ processing, errors }) => (
                                <>
                                    {errors.user && (
                                        <p
                                            role="alert"
                                            className="mx-5 mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                                        >
                                            {errors.user}
                                        </p>
                                    )}
                                    <DialogFooter className="px-5 py-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={processing}
                                            onClick={() => setOpen(false)}
                                        >
                                            Batal
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? 'Menghapus...'
                                                : 'Hapus akun'}
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            }
        />
    );
}
