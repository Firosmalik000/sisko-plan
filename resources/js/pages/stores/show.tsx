import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Mail, Shield, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Member = {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'cashier';
    status: 'active' | 'suspended';
};
type StoreDetail = {
    public_id: string;
    name: string;
    status: string;
    owner_user_id: number;
    can_manage: boolean;
    members: Member[];
};

export default function StoreShow({ store }: { store: StoreDetail }) {
    const [editOpen, setEditOpen] = useState(false);
    const [memberOpen, setMemberOpen] = useState(false);
    const [memberMode, setMemberMode] = useState<'create' | 'link'>('create');

    return (
        <>
            <Head title={store.name} />
            <div className="flex flex-1 flex-col gap-4 bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white p-4 shadow-sm sm:p-5">
                    <Link
                        href="/stores"
                        className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke daftar toko
                    </Link>
                    <div className="flex items-center justify-between gap-3">
                        <h1 className="truncate text-2xl font-black tracking-[-0.04em] text-[var(--app-ink)]">
                            {store.name}
                        </h1>
                        <Badge
                            variant={
                                store.status === 'active'
                                    ? 'secondary'
                                    : 'destructive'
                            }
                        >
                            {store.status === 'active'
                                ? 'Toko aktif'
                                : 'Toko ditangguhkan'}
                        </Badge>
                    </div>
                </div>

                {store.can_manage && (
                    <Card className="rounded-[1.25rem] border-[var(--app-ink)]/8 py-5 shadow-sm">
                        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-black text-[var(--app-ink)]">
                                Kelola toko
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditOpen(true)}
                                >
                                    Ubah identitas
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-emerald-700 hover:bg-emerald-800"
                                    onClick={() => setMemberOpen(true)}
                                >
                                    <UserPlus className="mr-2 size-4" />
                                    Tambah Anggota
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="rounded-[1.25rem] py-5 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-5" />
                            Anggota toko{' '}
                            <Badge variant="outline">
                                {store.members.length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {store.members.map((member) => (
                            <div
                                key={member.id}
                                className="flex flex-col gap-3 rounded-xl border p-3 md:flex-row md:items-center"
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800">
                                        {member.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium">
                                            {member.name}
                                        </p>
                                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                            <Mail className="size-3" />
                                            {member.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="size-4 text-muted-foreground" />
                                    <Badge
                                        variant="outline"
                                        className="capitalize"
                                    >
                                        {member.role}
                                    </Badge>
                                    <Badge
                                        variant={
                                            member.status === 'active'
                                                ? 'secondary'
                                                : 'destructive'
                                        }
                                    >
                                        {member.status === 'active'
                                            ? 'Aktif'
                                            : 'Nonaktif'}
                                    </Badge>
                                </div>
                                {store.can_manage &&
                                    member.id !== store.owner_user_id && (
                                        <Form
                                            action={`/stores/${store.public_id}/members/${member.id}`}
                                            method="patch"
                                            className="flex flex-wrap items-end gap-2"
                                        >
                                            {({ processing }) => (
                                                <>
                                                    <div>
                                                        <Label
                                                            className="sr-only"
                                                            htmlFor={`role-${member.id}`}
                                                        >
                                                            Peran
                                                        </Label>
                                                        <select
                                                            id={`role-${member.id}`}
                                                            name="role"
                                                            defaultValue={
                                                                member.role
                                                            }
                                                            className="h-9 rounded-md border bg-transparent px-3 text-sm"
                                                        >
                                                            <option value="cashier">
                                                                Kasir
                                                            </option>
                                                            <option value="admin">
                                                                Admin
                                                            </option>
                                                        </select>
                                                    </div>
                                                    <input
                                                        type="hidden"
                                                        name="status"
                                                        value={
                                                            member.status ===
                                                            'active'
                                                                ? 'suspended'
                                                                : 'active'
                                                        }
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={processing}
                                                    >
                                                        {member.status ===
                                                        'active'
                                                            ? 'Nonaktifkan'
                                                            : 'Aktifkan'}
                                                    </Button>
                                                </>
                                            )}
                                        </Form>
                                    )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-stone-200 bg-white p-0 shadow-2xl sm:max-w-lg">
                    <Form
                        action={`/stores/${store.public_id}`}
                        method="patch"
                        className="flex min-h-0 flex-col"
                        onSuccess={() => setEditOpen(false)}
                    >
                        {({ processing, errors }) => (
                            <>
                                <DialogHeader className="border-b border-stone-200 px-4 py-4 pr-12 text-left sm:px-5">
                                    <DialogTitle className="text-lg font-black tracking-[-0.03em] text-[var(--app-ink)]">
                                        Ubah identitas toko
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 overflow-y-auto px-4 py-4 sm:px-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="store-name">
                                            Nama toko
                                        </Label>
                                        <Input
                                            id="store-name"
                                            name="name"
                                            defaultValue={store.name}
                                            required
                                            maxLength={120}
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                </div>
                                <div className="flex flex-col-reverse gap-2 border-t border-stone-200 px-4 py-3 min-[375px]:flex-row min-[375px]:justify-end sm:px-5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditOpen(false)}
                                    >
                                        Batal
                                    </Button>
                                    <Button disabled={processing}>
                                        Simpan nama
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
                <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-stone-200 bg-white p-0 shadow-2xl sm:max-w-lg">
                    <Form
                        action={`/stores/${store.public_id}/members`}
                        method="post"
                        className="flex min-h-0 flex-col"
                        resetOnSuccess
                        onSuccess={() => setMemberOpen(false)}
                    >
                        {({ processing, errors }) => (
                            <>
                                <DialogHeader className="border-b border-stone-200 px-4 py-4 pr-12 text-left sm:px-5">
                                    <DialogTitle className="text-lg font-black tracking-[-0.03em] text-[var(--app-ink)]">
                                        Tambah Anggota
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 overflow-y-auto px-4 py-4 sm:px-5">
                                    <input
                                        type="hidden"
                                        name="mode"
                                        value={memberMode}
                                    />
                                    <div className="grid grid-cols-2 rounded-xl bg-stone-100 p-1">
                                        <button
                                            type="button"
                                            aria-pressed={
                                                memberMode === 'create'
                                            }
                                            onClick={() =>
                                                setMemberMode('create')
                                            }
                                            className={`min-h-10 rounded-lg px-3 text-sm font-bold transition-colors ${
                                                memberMode === 'create'
                                                    ? 'bg-white text-[var(--app-ink)] shadow-sm'
                                                    : 'text-stone-500'
                                            }`}
                                        >
                                            Buat akun baru
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={memberMode === 'link'}
                                            onClick={() =>
                                                setMemberMode('link')
                                            }
                                            className={`min-h-10 rounded-lg px-3 text-sm font-bold transition-colors ${
                                                memberMode === 'link'
                                                    ? 'bg-white text-[var(--app-ink)] shadow-sm'
                                                    : 'text-stone-500'
                                            }`}
                                        >
                                            Akun sudah ada
                                        </button>
                                    </div>
                                    {memberMode === 'create' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="member-name">
                                                Nama pekerja
                                            </Label>
                                            <Input
                                                id="member-name"
                                                name="name"
                                                autoComplete="name"
                                                required
                                                maxLength={255}
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="member-email">
                                            Email
                                        </Label>
                                        <Input
                                            id="member-email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            placeholder="anggota@example.com"
                                            required
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                    {memberMode === 'create' && (
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="member-password">
                                                    Password awal
                                                </Label>
                                                <Input
                                                    id="member-password"
                                                    name="password"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    required
                                                />
                                                <InputError
                                                    message={errors.password}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="member-password-confirmation">
                                                    Ulangi password
                                                </Label>
                                                <Input
                                                    id="member-password-confirmation"
                                                    name="password_confirmation"
                                                    type="password"
                                                    autoComplete="new-password"
                                                    required
                                                />
                                                <InputError
                                                    message={
                                                        errors.password_confirmation
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Label htmlFor="member-role">
                                            Peran
                                        </Label>
                                        <select
                                            id="member-role"
                                            name="role"
                                            defaultValue="cashier"
                                            className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                                        >
                                            <option value="cashier">
                                                Kasir
                                            </option>
                                            <option value="admin">
                                                Admin toko
                                            </option>
                                        </select>
                                        <InputError message={errors.role} />
                                    </div>
                                </div>
                                <div className="flex flex-col-reverse gap-2 border-t border-stone-200 px-4 py-3 min-[375px]:flex-row min-[375px]:justify-end sm:px-5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setMemberOpen(false)}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        disabled={processing}
                                        className="bg-emerald-700 hover:bg-emerald-800"
                                    >
                                        {memberMode === 'create'
                                            ? 'Buat akun pekerja'
                                            : 'Hubungkan akun'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}

StoreShow.layout = {
    breadcrumbs: [{ title: 'Toko & Anggota', href: '/stores' }],
};
