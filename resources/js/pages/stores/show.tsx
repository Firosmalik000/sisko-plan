import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Mail, Shield, UserPlus, Users } from 'lucide-react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    return (
        <>
            <Head title={store.name} />
            <div className="flex flex-1 flex-col gap-7 p-4 md:p-8">
                <div>
                    <Link
                        href="/stores"
                        className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke daftar toko
                    </Link>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                        <div>
                            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-emerald-700 uppercase">
                                Pengaturan toko
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight">
                                {store.name}
                            </h1>
                        </div>
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
                    <div className="grid gap-5 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Identitas toko
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Form
                                    action={`/stores/${store.public_id}`}
                                    method="patch"
                                    className="space-y-4"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="name">
                                                    Nama toko
                                                </Label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    defaultValue={store.name}
                                                    required
                                                    maxLength={120}
                                                />
                                                <InputError
                                                    message={errors.name}
                                                />
                                            </div>
                                            <Button disabled={processing}>
                                                Simpan nama
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <UserPlus className="size-4" />
                                    Tambah anggota terdaftar
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Form
                                    action={`/stores/${store.public_id}/members`}
                                    method="post"
                                    className="space-y-4"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">
                                                    Email pengguna
                                                </Label>
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    placeholder="anggota@example.com"
                                                    required
                                                />
                                                <InputError
                                                    message={errors.email}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="role">
                                                    Peran
                                                </Label>
                                                <select
                                                    id="role"
                                                    name="role"
                                                    defaultValue="cashier"
                                                    className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                                                >
                                                    <option value="cashier">
                                                        Kasir
                                                    </option>
                                                    <option value="admin">
                                                        Admin toko
                                                    </option>
                                                </select>
                                                <InputError
                                                    message={errors.role}
                                                />
                                            </div>
                                            <Button
                                                disabled={processing}
                                                className="bg-emerald-700 hover:bg-emerald-800"
                                            >
                                                Tambahkan anggota
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Card>
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
                                className="flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center"
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
        </>
    );
}

StoreShow.layout = {
    breadcrumbs: [{ title: 'Toko & Anggota', href: '/stores' }],
};
