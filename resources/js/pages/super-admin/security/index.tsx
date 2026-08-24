import { Form, Head, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    KeyRound,
    LockKeyhole,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { PlatformAdmin } from '@/types';

type Props = {
    twoFactorEnabled: boolean;
    twoFactorRequired: boolean;
    setupPending: boolean;
    qrCodeSvg: string | null;
    recoveryCodes: string[];
};

type SettingsSection = 'profile' | 'password' | 'security';

export default function PlatformSecurity({
    twoFactorEnabled,
    twoFactorRequired,
    setupPending,
    qrCodeSvg,
    recoveryCodes,
}: Props) {
    const { platformAdmin } = usePage<{ platformAdmin: PlatformAdmin }>().props;
    const role =
        platformAdmin.role === 'super_admin' ? 'Super Admin' : 'Admin Platform';
    const [section, setSection] = useState<SettingsSection>('profile');

    return (
        <>
            <Head title="Pengaturan Akun" />
            <div className="platform-enter mx-auto max-w-6xl">
                <header className="mb-5">
                    <h1 className="text-3xl font-black tracking-tight text-[#0b292f]">
                        Pengaturan akun
                    </h1>
                </header>

                <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <aside className="platform-panel overflow-hidden lg:sticky lg:top-8">
                        <div className="border-b border-slate-900/8 p-4">
                            <div className="flex items-center gap-3">
                                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0b292f] text-sm font-black text-[#e9c96f]">
                                    {platformAdmin.name
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-[#0b292f]">
                                        {platformAdmin.name}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {platformAdmin.email}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <nav
                            aria-label="Pengaturan akun"
                            className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1"
                        >
                            <SettingsNavItem
                                active={section === 'profile'}
                                icon={UserRound}
                                label="Profil akun"
                                onClick={() => setSection('profile')}
                            />
                            <SettingsNavItem
                                active={section === 'password'}
                                icon={KeyRound}
                                label="Kata sandi"
                                onClick={() => setSection('password')}
                            />
                            <SettingsNavItem
                                active={section === 'security'}
                                icon={LockKeyhole}
                                label="Keamanan"
                                onClick={() => setSection('security')}
                            />
                        </nav>
                    </aside>

                    <div className="min-w-0 space-y-5">
                        {section === 'profile' && (
                            <ProfileSettings
                                admin={platformAdmin}
                                role={role}
                            />
                        )}
                        {section === 'password' && <PasswordSettings />}
                        {section === 'security' && (
                            <SecuritySettings
                                role={role}
                                twoFactorEnabled={twoFactorEnabled}
                                twoFactorRequired={twoFactorRequired}
                                setupPending={setupPending}
                                qrCodeSvg={qrCodeSvg}
                                recoveryCodes={recoveryCodes}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

function SettingsNavItem({
    active,
    icon: Icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: typeof UserRound;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-bold transition outline-none focus-visible:ring-2 focus-visible:ring-[#d7a941] ${active ? 'bg-[#0b292f] text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0b292f]'}`}
            aria-current={active ? 'page' : undefined}
            onClick={onClick}
        >
            <Icon className={`size-4 ${active ? 'text-[#e9c96f]' : ''}`} />
            {label}
        </button>
    );
}

function ProfileSettings({
    admin,
    role,
}: {
    admin: PlatformAdmin;
    role: string;
}) {
    return (
        <SettingsPanel icon={UserRound} title="Profil akun" status={role}>
            <Form
                action="/super-admin/security/profile"
                method="patch"
                className="grid gap-4 p-4 sm:max-w-xl sm:p-5"
            >
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        <FormField
                            htmlFor="profile_name"
                            label="Nama lengkap"
                            error={errors.name}
                        >
                            <Input
                                id="profile_name"
                                name="name"
                                defaultValue={admin.name}
                                autoComplete="name"
                                required
                            />
                        </FormField>
                        <FormField
                            htmlFor="profile_email"
                            label="Email"
                            error={errors.email}
                        >
                            <Input
                                id="profile_email"
                                name="email"
                                type="email"
                                defaultValue={admin.email}
                                autoComplete="email"
                                required
                            />
                        </FormField>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Button
                                disabled={processing}
                                className="bg-[#0b292f] text-white hover:bg-[#16434c]"
                            >
                                {processing ? <Spinner /> : null}
                                Simpan profil
                            </Button>
                            {recentlySuccessful && (
                                <span className="text-sm font-bold text-emerald-700">
                                    Tersimpan
                                </span>
                            )}
                        </div>
                    </>
                )}
            </Form>
        </SettingsPanel>
    );
}

function PasswordSettings() {
    return (
        <SettingsPanel icon={KeyRound} title="Kata sandi">
            <Form
                action="/super-admin/security/password"
                method="put"
                resetOnSuccess
                className="grid gap-4 p-4 sm:max-w-xl sm:p-5"
            >
                {({ processing, errors, recentlySuccessful }) => (
                    <>
                        <FormField
                            htmlFor="account_current_password"
                            label="Kata sandi saat ini"
                            error={errors.current_password}
                        >
                            <Input
                                id="account_current_password"
                                name="current_password"
                                type="password"
                                autoComplete="current-password"
                                required
                            />
                        </FormField>
                        <FormField
                            htmlFor="account_new_password"
                            label="Kata sandi baru"
                            error={errors.password}
                        >
                            <Input
                                id="account_new_password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                            />
                        </FormField>
                        <FormField
                            htmlFor="account_password_confirmation"
                            label="Konfirmasi kata sandi baru"
                        >
                            <Input
                                id="account_password_confirmation"
                                name="password_confirmation"
                                type="password"
                                autoComplete="new-password"
                                required
                            />
                        </FormField>
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Button
                                disabled={processing}
                                className="bg-[#0b292f] text-white hover:bg-[#16434c]"
                            >
                                {processing ? <Spinner /> : null}
                                Perbarui kata sandi
                            </Button>
                            {recentlySuccessful && (
                                <span className="text-sm font-bold text-emerald-700">
                                    Diperbarui
                                </span>
                            )}
                        </div>
                    </>
                )}
            </Form>
        </SettingsPanel>
    );
}

function SecuritySettings({
    role,
    twoFactorEnabled,
    twoFactorRequired,
    setupPending,
    qrCodeSvg,
    recoveryCodes,
}: {
    role: string;
    twoFactorEnabled: boolean;
    twoFactorRequired: boolean;
    setupPending: boolean;
    qrCodeSvg: string | null;
    recoveryCodes: string[];
}) {
    return (
        <>
            <SettingsPanel
                icon={ShieldCheck}
                title="Keamanan akun"
                status={role}
                badge={<StatusBadge active={twoFactorEnabled} />}
            >
                <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-[minmax(170px,220px)_minmax(0,1fr)] md:gap-8">
                    <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[#0b292f]">
                            <KeyRound className="size-4" />
                        </span>
                        <div>
                            <h3 className="text-sm font-black text-[#0b292f]">
                                Autentikasi dua langkah
                            </h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                {twoFactorRequired
                                    ? 'Wajib untuk akun ini'
                                    : 'Proteksi login tambahan'}
                            </p>
                        </div>
                    </div>
                    <TwoFactorControl
                        enabled={twoFactorEnabled}
                        setupPending={setupPending}
                        qrCodeSvg={qrCodeSvg}
                    />
                </div>
            </SettingsPanel>
            {recoveryCodes.length > 0 && (
                <div className="mt-5">
                    <RecoveryCodes codes={recoveryCodes} />
                </div>
            )}
        </>
    );
}

function SettingsPanel({
    icon: Icon,
    title,
    status,
    badge,
    children,
}: {
    icon: typeof UserRound;
    title: string;
    status?: string;
    badge?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="platform-panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900/8 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#0b292f] text-white">
                        <Icon className="size-5" />
                    </span>
                    <div>
                        <h2 className="font-black text-[#0b292f]">{title}</h2>
                        {status && (
                            <p className="text-xs font-semibold text-slate-500">
                                {status}
                            </p>
                        )}
                    </div>
                </div>
                {badge}
            </div>
            {children}
        </section>
    );
}

function FormField({
    htmlFor,
    label,
    error,
    children,
}: {
    htmlFor: string;
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

function TwoFactorControl({
    enabled,
    setupPending,
    qrCodeSvg,
}: {
    enabled: boolean;
    setupPending: boolean;
    qrCodeSvg: string | null;
}) {
    if (!enabled && !setupPending) {
        return (
            <Form
                action="/super-admin/security/two-factor"
                method="post"
                className="grid max-w-md gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-950">
                            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                            <p>
                                Setelah aktivasi, pindai QR lalu masukkan kode
                                dari aplikasi authenticator.
                            </p>
                        </div>
                        <PasswordField error={errors.current_password} />
                        <Button
                            disabled={processing}
                            className="w-full bg-[#0b292f] text-white hover:bg-[#16434c] sm:w-fit"
                        >
                            {processing ? <Spinner /> : <KeyRound />}
                            Aktifkan 2FA
                        </Button>
                    </>
                )}
            </Form>
        );
    }

    if (!enabled && setupPending && qrCodeSvg) {
        return (
            <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start">
                <div
                    className="rounded-xl border border-slate-200 bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                />
                <div>
                    <h4 className="text-sm font-black text-[#0b292f]">
                        Pindai dan konfirmasi
                    </h4>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                        Masukkan kode enam digit yang muncul di authenticator.
                    </p>
                    <Form
                        action="/super-admin/security/two-factor/confirm"
                        method="post"
                        className="mt-4 grid max-w-sm gap-3 sm:grid-cols-[1fr_auto]"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div>
                                    <Input
                                        name="code"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        required
                                        autoFocus
                                        aria-label="Kode autentikasi"
                                        placeholder="123456"
                                        className="font-mono tracking-[0.2em]"
                                    />
                                    <InputError message={errors.code} />
                                </div>
                                <Button
                                    disabled={processing}
                                    className="bg-[#0b292f] text-white hover:bg-[#16434c]"
                                >
                                    {processing ? (
                                        <Spinner />
                                    ) : (
                                        <CheckCircle2 />
                                    )}
                                    Konfirmasi
                                </Button>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-emerald-950">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <div>
                    <p className="text-sm font-black">2FA aktif</p>
                    <p className="mt-0.5 text-sm leading-5">
                        Login memerlukan authenticator atau satu recovery code.
                    </p>
                </div>
            </div>
            <Form
                action="/super-admin/security/recovery-codes"
                method="post"
                className="grid max-w-md gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div>
                            <h4 className="text-sm font-black text-[#0b292f]">
                                Recovery code
                            </h4>
                            <p className="mt-1 text-sm text-slate-600">
                                Membuat kode baru akan membatalkan seluruh kode
                                lama.
                            </p>
                        </div>
                        <PasswordField error={errors.current_password} />
                        <Button
                            variant="outline"
                            disabled={processing}
                            className="w-full sm:w-fit"
                        >
                            {processing ? <Spinner /> : <RefreshCw />}
                            Buat kode baru
                        </Button>
                    </>
                )}
            </Form>
        </div>
    );
}

function RecoveryCodes({ codes }: { codes: string[] }) {
    return (
        <section className="overflow-hidden rounded-2xl bg-[#0b292f] text-white shadow-lg shadow-[#0b292f]/10">
            <div className="border-b border-white/10 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="size-5 text-[#e9c96f]" />
                    <div>
                        <h2 className="font-black">Simpan recovery code</h2>
                        <p className="mt-0.5 text-xs text-slate-300">
                            Kode hanya ditampilkan satu kali.
                        </p>
                    </div>
                </div>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
                {codes.map((code) => (
                    <code
                        key={code}
                        className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white"
                    >
                        {code}
                    </code>
                ))}
            </div>
        </section>
    );
}

function StatusBadge({ active }: { active: boolean }) {
    return (
        <span
            className={`rounded-md px-2.5 py-1 text-xs font-black ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-900'}`}
        >
            2FA {active ? 'aktif' : 'belum aktif'}
        </span>
    );
}

function PasswordField({ error }: { error?: string }) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor="current_password">Kata sandi saat ini</Label>
            <Input
                id="current_password"
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
            />
            <InputError message={error} />
        </div>
    );
}
