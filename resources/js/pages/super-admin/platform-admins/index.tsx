import { Form, Head, useForm, usePage } from '@inertiajs/react';
import { KeyRound, Plus, Power, ShieldCheck, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import {
    PlatformTableLeadCell,
    PlatformTableLeadHeader,
} from '@/components/platform-table-lead-cell';
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
    permissions: string[];
};

type PermissionGroup = {
    label: string;
    permissions: Array<{ name: string; label: string }>;
};

export default function PlatformAdmins({
    admins,
    permission_groups,
    can_manage,
}: {
    admins: AdminItem[];
    permission_groups: PermissionGroup[];
    can_manage: boolean;
}) {
    const { platformAdmin } = usePage<{ platformAdmin: PlatformAdmin }>().props;
    const [createOpen, setCreateOpen] = useState(false);

    return (
        <>
            <Head title="Admin Platform" />
            <div className="platform-enter mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-3xl font-black tracking-tight text-[#0b292f]">
                        Admin Platform
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                        {admins.length} akun terdaftar
                    </p>
                </div>
                {can_manage && (
                    <Button
                        className="min-h-11 bg-[#0b292f] px-4 text-white hover:bg-[#16434c]"
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus className="size-4" />
                        Tambah admin
                    </Button>
                )}
            </div>

            <div className="platform-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <PlatformTableLeadHeader />
                                <th className="px-4 py-3">Admin</th>
                                <th className="px-4 py-3">Peran</th>
                                <th className="px-4 py-3">2FA</th>
                                <th className="px-4 py-3">Login terakhir</th>
                                <th className="px-4 py-3">Akses</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/8">
                            {admins.map((admin, index) => (
                                <tr key={admin.id}>
                                    <PlatformTableLeadCell
                                        index={index + 1}
                                        label={admin.name}
                                        actions={
                                            !can_manage ||
                                            admin.id === platformAdmin.id
                                                ? []
                                                : [
                                                      {
                                                          label: admin.is_active
                                                              ? 'Nonaktifkan admin'
                                                              : 'Aktifkan admin',
                                                          icon: Power,
                                                          href: `/super-admin/platform-admins/${admin.id}/status`,
                                                          method: 'patch',
                                                          data: {
                                                              is_active:
                                                                  admin.is_active
                                                                      ? '0'
                                                                      : '1',
                                                          },
                                                          destructive:
                                                              admin.is_active,
                                                      },
                                                  ]
                                        }
                                    />
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
                                    <td className="px-4 py-3">
                                        {admin.role === 'super_admin' ? (
                                            <span className="text-xs font-bold text-emerald-700">
                                                Akses penuh
                                            </span>
                                        ) : can_manage ? (
                                            <PermissionDialog
                                                admin={admin}
                                                groups={permission_groups}
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-slate-500">
                                                {admin.permissions.length} izin
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`text-xs font-semibold ${admin.is_active ? 'text-emerald-700' : 'text-slate-500'}`}
                                        >
                                            {admin.is_active
                                                ? admin.id === platformAdmin.id
                                                    ? 'Akun Anda'
                                                    : 'Aktif'
                                                : 'Nonaktif'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {can_manage && (
                <AddAdminDialog open={createOpen} setOpen={setCreateOpen} />
            )}
        </>
    );
}

function AddAdminDialog({
    open,
    setOpen,
}: {
    open: boolean;
    setOpen: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-[calc(100%-1rem)] gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-md">
                <DialogHeader className="border-b border-slate-200 px-4 py-4 pr-12 text-left sm:px-5">
                    <DialogTitle className="text-lg font-black text-[#0b292f]">
                        Tambah admin platform
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500">
                        Akun baru memperoleh izin operasional standar.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    action="/super-admin/platform-admins"
                    method="post"
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 px-4 py-5 sm:px-5">
                                <Field label="Nama lengkap" error={errors.name}>
                                    <Input
                                        name="name"
                                        required
                                        autoFocus
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
                                <Field
                                    label="Kata sandi awal"
                                    error={errors.password}
                                >
                                    <Input
                                        name="password"
                                        type="password"
                                        required
                                        minLength={12}
                                        autoComplete="new-password"
                                    />
                                </Field>
                            </div>
                            <DialogFooter className="border-t border-slate-200 px-4 py-3 sm:px-5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={processing}
                                    onClick={() => setOpen(false)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    className="bg-[#0b292f] text-white hover:bg-[#16434c]"
                                    disabled={processing}
                                >
                                    {processing
                                        ? 'Menambahkan...'
                                        : 'Tambah admin'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function PermissionDialog({
    admin,
    groups,
}: {
    admin: AdminItem;
    groups: PermissionGroup[];
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({ permissions: admin.permissions });
    const toggle = (permission: string, checked: boolean) => {
        form.setData(
            'permissions',
            checked
                ? [...form.data.permissions, permission]
                : form.data.permissions.filter((item) => item !== permission),
        );
    };
    const close = () => {
        if (!form.processing) {
            form.setData('permissions', admin.permissions);
            form.clearErrors();
            setOpen(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => (next ? setOpen(true) : close())}
        >
            <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setOpen(true)}
            >
                <KeyRound className="size-3.5" />
                {admin.permissions.length} izin
            </button>
            <DialogContent className="flex max-h-[92svh] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-2xl">
                <DialogHeader className="border-b border-slate-200 px-4 py-4 pr-12 text-left sm:px-5">
                    <DialogTitle className="text-lg font-black text-[#0b292f]">
                        Akses {admin.name}
                    </DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.put(
                            `/super-admin/platform-admins/${admin.id}/permissions`,
                            {
                                preserveScroll: true,
                                onSuccess: () => setOpen(false),
                            },
                        );
                    }}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="grid min-h-0 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
                        {groups.map((group) => (
                            <fieldset
                                key={group.label}
                                className="rounded-xl border border-slate-200 p-3"
                            >
                                <legend className="px-1 text-xs font-black tracking-wide text-slate-500 uppercase">
                                    {group.label}
                                </legend>
                                <div className="mt-1 space-y-1">
                                    {group.permissions.map((permission) => (
                                        <label
                                            key={permission.name}
                                            className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            <input
                                                type="checkbox"
                                                className="size-4 rounded border-slate-300 text-[#0b292f] focus:ring-[#0b292f]"
                                                checked={form.data.permissions.includes(
                                                    permission.name,
                                                )}
                                                onChange={(event) =>
                                                    toggle(
                                                        permission.name,
                                                        event.target.checked,
                                                    )
                                                }
                                            />
                                            {permission.label}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        ))}
                        <InputError
                            message={
                                form.errors.permissions ??
                                form.errors['permissions.0']
                            }
                            className="sm:col-span-2"
                        />
                    </div>
                    <DialogFooter className="border-t border-slate-200 px-4 py-3 sm:px-5">
                        <Button type="button" variant="outline" onClick={close}>
                            Batal
                        </Button>
                        <Button
                            className="bg-[#0b292f] text-white hover:bg-[#16434c]"
                            disabled={form.processing}
                        >
                            {form.processing ? 'Menyimpan...' : 'Simpan akses'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
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
