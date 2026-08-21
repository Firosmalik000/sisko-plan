import { Form, Head, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    KeyRound,
    LockKeyhole,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    UserRoundCheck,
} from 'lucide-react';
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

export default function PlatformSecurity({
    twoFactorEnabled,
    twoFactorRequired,
    setupPending,
    qrCodeSvg,
    recoveryCodes,
}: Props) {
    const { platformAdmin } = usePage<{ platformAdmin: PlatformAdmin }>().props;

    return (
        <>
            <Head title="Keamanan Platform Admin" />
            <div className="platform-enter mx-auto max-w-5xl">
                <header>
                    <p className="platform-kicker">Access protection</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0b292f]">
                        Keamanan akun
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Kontrol autentikasi dan pemulihan akses Platform Admin.
                    </p>
                </header>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <SecurityStat
                        icon={UserRoundCheck}
                        label="Status akun"
                        value="Aktif"
                    />
                    <SecurityStat
                        icon={ShieldCheck}
                        label="Role akses"
                        value={
                            platformAdmin.role === 'super_admin'
                                ? 'Super Admin'
                                : 'Admin Platform'
                        }
                    />
                    <SecurityStat
                        icon={LockKeyhole}
                        label="Autentikasi 2FA"
                        value={twoFactorEnabled ? 'Terlindungi' : 'Belum aktif'}
                        warning={!twoFactorEnabled}
                    />
                </div>

                <section className="platform-panel mt-5 overflow-hidden">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-900/8 p-5">
                        <div>
                            <h2 className="font-semibold">
                                Autentikasi dua langkah
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {twoFactorRequired
                                    ? 'Wajib pada environment ini.'
                                    : 'Direkomendasikan sebelum pilot.'}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${twoFactorEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
                        >
                            {twoFactorEnabled ? 'Aktif' : 'Belum aktif'}
                        </span>
                    </div>

                    <div className="p-6 sm:p-8">
                        {!twoFactorEnabled && !setupPending && (
                            <Form
                                action="/super-admin/security/two-factor"
                                method="post"
                                className="max-w-md space-y-4"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                                            <ShieldAlert className="mr-2 inline size-4" />
                                            Anda akan diminta memindai QR dan
                                            mengonfirmasi kode sebelum proteksi
                                            aktif.
                                        </div>
                                        <PasswordField
                                            error={errors.current_password}
                                        />
                                        <Button disabled={processing}>
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <KeyRound />
                                            )}
                                            Mulai aktivasi 2FA
                                        </Button>
                                    </>
                                )}
                            </Form>
                        )}

                        {!twoFactorEnabled && setupPending && qrCodeSvg && (
                            <div className="grid gap-8 md:grid-cols-[220px_1fr] md:items-center">
                                <div
                                    className="rounded-2xl border bg-white p-3 shadow-sm [&>svg]:h-auto [&>svg]:w-full"
                                    dangerouslySetInnerHTML={{
                                        __html: qrCodeSvg,
                                    }}
                                />
                                <div>
                                    <h3 className="text-lg font-semibold">
                                        Pindai lalu konfirmasi
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Pindai QR dengan aplikasi authenticator,
                                        lalu masukkan kode enam digit yang
                                        muncul.
                                    </p>
                                    <Form
                                        action="/super-admin/security/two-factor/confirm"
                                        method="post"
                                        className="mt-5 flex max-w-sm items-start gap-3"
                                    >
                                        {({ processing, errors }) => (
                                            <>
                                                <div className="flex-1">
                                                    <Input
                                                        name="code"
                                                        inputMode="numeric"
                                                        autoComplete="one-time-code"
                                                        required
                                                        autoFocus
                                                        placeholder="123456"
                                                        className="font-mono tracking-[0.2em]"
                                                    />
                                                    <InputError
                                                        message={errors.code}
                                                    />
                                                </div>
                                                <Button disabled={processing}>
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
                        )}

                        {twoFactorEnabled && (
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-950">
                                    <CheckCircle2 className="size-6" />
                                    <h3 className="mt-4 font-semibold">
                                        Proteksi aktif
                                    </h3>
                                    <p className="mt-2 text-sm leading-6">
                                        Login berikutnya memerlukan
                                        authenticator atau satu recovery code.
                                    </p>
                                </div>
                                <Form
                                    action="/super-admin/security/recovery-codes"
                                    method="post"
                                    className="rounded-2xl border border-slate-200 p-5"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <h3 className="font-semibold">
                                                Buat recovery code baru
                                            </h3>
                                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                                Kode lama langsung tidak
                                                berlaku.
                                            </p>
                                            <div className="mt-4">
                                                <PasswordField
                                                    error={
                                                        errors.current_password
                                                    }
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                disabled={processing}
                                                className="mt-4"
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <RefreshCw />
                                                )}
                                                Regenerasi kode
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </div>
                        )}
                    </div>
                </section>

                {recoveryCodes.length > 0 && (
                    <section className="mt-6 rounded-2xl bg-[#0b292f] p-6 text-white shadow-lg shadow-[#0b292f]/10 sm:p-8">
                        <p className="text-xs font-semibold tracking-[0.2em] text-[#d7a941] uppercase">
                            Tampilkan satu kali
                        </p>
                        <h2 className="mt-2 text-xl font-semibold">
                            Simpan recovery codes di tempat aman
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                            Setiap kode hanya dapat dipakai sekali dan tidak
                            akan ditampilkan kembali setelah halaman ini
                            ditutup.
                        </p>
                        <div className="mt-5 grid gap-2 sm:grid-cols-2">
                            {recoveryCodes.map((code) => (
                                <code
                                    key={code}
                                    className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white"
                                >
                                    {code}
                                </code>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}

function SecurityStat({
    icon: Icon,
    label,
    value,
    warning = false,
}: {
    icon: typeof ShieldCheck;
    label: string;
    value: string;
    warning?: boolean;
}) {
    return (
        <article
            className={`platform-panel flex items-center gap-3 p-4 ${warning ? 'border-amber-300 bg-amber-50/80' : ''}`}
        >
            <span
                className={`flex size-10 items-center justify-center rounded-xl ${warning ? 'bg-amber-200 text-amber-900' : 'bg-[#0b292f] text-white'}`}
            >
                <Icon className="size-4" />
            </span>
            <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">
                    {label}
                </p>
                <p className="mt-1 text-sm font-black text-[#0b292f]">
                    {value}
                </p>
            </div>
        </article>
    );
}

function PasswordField({ error }: { error?: string }) {
    return (
        <div className="space-y-2">
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
