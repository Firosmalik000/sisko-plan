import { Form, Head } from '@inertiajs/react';
import {
    CheckCircle2,
    KeyRound,
    LockKeyhole,
    RefreshCw,
    ShieldAlert,
} from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import SuperAdminLayout from '@/layouts/super-admin-layout';

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
    return (
        <SuperAdminLayout>
            <Head title="Keamanan Platform Admin" />
            <div className="mx-auto max-w-4xl">
                <div className="flex items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#d7a941] text-[#102b31]">
                        <LockKeyhole className="size-6" />
                    </span>
                    <div>
                        <p className="text-xs font-semibold tracking-[0.2em] text-[#8a681e] uppercase">
                            Security hardening
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                            Keamanan Platform Admin
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            Lindungi kendali seluruh platform dengan kode TOTP
                            yang berbeda dari kata sandi.
                        </p>
                    </div>
                </div>

                <section className="mt-8 overflow-hidden rounded-3xl border border-slate-900/10 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-900/8 p-6">
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
                    <section className="mt-6 rounded-3xl bg-[#102b31] p-6 text-white sm:p-8">
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
        </SuperAdminLayout>
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
