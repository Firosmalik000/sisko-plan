import { Form, Head, usePage } from '@inertiajs/react';
import { Plus, ShieldCheck, ShieldOff } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlatformAdmin } from '@/types';

type AdminItem = {
    id: number;
    name: string;
    email: string;
    role: 'super_admin' | 'admin';
    is_active: boolean;
    two_factor_enabled: boolean;
    last_login_at: string | null;
};

export default function PlatformAdmins({ admins }: { admins: AdminItem[] }) {
    const { platformAdmin } = usePage<{ platformAdmin: PlatformAdmin }>().props;

    return (
        <>
            <Head title="Admin Platform" />
            <div className="platform-enter mb-5 flex items-end justify-between">
                <div>
                    <p className="platform-kicker">Privileged access</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0b292f]">
                        Admin Platform
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Kelola akses tertinggi dan kesiapan 2FA tim operasional.
                    </p>
                </div>
                <span className="rounded-full border border-slate-900/10 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {admins.length} akun
                </span>
            </div>

            <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                <Form
                    action="/super-admin/platform-admins"
                    method="post"
                    resetOnSuccess
                    className="platform-panel h-fit p-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="mb-4 flex items-center gap-2">
                                <Plus className="size-4" />
                                <h2 className="text-sm font-bold">
                                    Admin baru
                                </h2>
                            </div>
                            <div className="space-y-3">
                                <Field label="Nama" error={errors.name}>
                                    <Input
                                        name="name"
                                        required
                                        autoComplete="name"
                                    />
                                </Field>
                                <Field label="Email" error={errors.email}>
                                    <Input
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                    />
                                </Field>
                                <Field label="Password" error={errors.password}>
                                    <Input
                                        name="password"
                                        type="password"
                                        required
                                        minLength={12}
                                        autoComplete="new-password"
                                    />
                                </Field>
                                <Button
                                    className="w-full bg-[#0b292f] text-white hover:bg-[#16434c]"
                                    disabled={processing}
                                >
                                    Tambah admin
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="platform-panel overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-left text-sm">
                            <thead className="platform-table-head">
                                <tr>
                                    <th className="px-4 py-3">Admin</th>
                                    <th className="px-4 py-3">Peran</th>
                                    <th className="px-4 py-3">2FA</th>
                                    <th className="px-4 py-3">
                                        Login terakhir
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/8">
                                {admins.map((admin) => (
                                    <tr key={admin.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">
                                                {admin.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {admin.email}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
                                                {admin.role === 'super_admin'
                                                    ? 'Super Admin'
                                                    : 'Admin'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {admin.two_factor_enabled ? (
                                                <ShieldCheck className="size-4 text-emerald-600" />
                                            ) : (
                                                <ShieldOff className="size-4 text-amber-600" />
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">
                                            {admin.last_login_at
                                                ? new Date(
                                                      admin.last_login_at,
                                                  ).toLocaleString('id-ID', {
                                                      dateStyle: 'medium',
                                                      timeStyle: 'short',
                                                  })
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {admin.id === platformAdmin.id ? (
                                                <span className="text-xs font-semibold text-emerald-700">
                                                    Akun aktif
                                                </span>
                                            ) : (
                                                <Form
                                                    action={`/super-admin/platform-admins/${admin.id}/status`}
                                                    method="patch"
                                                >
                                                    <input
                                                        type="hidden"
                                                        name="is_active"
                                                        value={
                                                            admin.is_active
                                                                ? '0'
                                                                : '1'
                                                        }
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant={
                                                            admin.is_active
                                                                ? 'outline'
                                                                : 'default'
                                                        }
                                                    >
                                                        {admin.is_active
                                                            ? 'Nonaktifkan'
                                                            : 'Aktifkan'}
                                                    </Button>
                                                </Form>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}
