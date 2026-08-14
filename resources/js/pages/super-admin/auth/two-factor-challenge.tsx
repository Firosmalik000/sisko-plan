import { Form, Head, Link } from '@inertiajs/react';
import { KeyRound, LifeBuoy, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function PlatformTwoFactorChallenge() {
    const [recovery, setRecovery] = useState(false);

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#102b31] px-5 py-12">
            <Head title="Verifikasi Super Admin" />
            <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,#d7a94133,transparent_68%)]" />
            <section className="relative w-full max-w-md rounded-3xl bg-[#f7f3e8] p-7 shadow-2xl sm:p-10">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#d7a941] text-[#102b31]">
                    <ShieldCheck />
                </div>
                <p className="mt-7 text-xs font-semibold tracking-[0.22em] text-[#8a681e] uppercase">
                    Langkah keamanan kedua
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                    Verifikasi identitas operator
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                    {recovery
                        ? 'Masukkan salah satu recovery code yang belum pernah digunakan.'
                        : 'Masukkan enam digit kode dari aplikasi authenticator.'}
                </p>

                <Form
                    action="/super-admin/two-factor-challenge"
                    method="post"
                    resetOnSuccess
                    className="mt-7 space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            {recovery ? (
                                <div className="space-y-2">
                                    <Label htmlFor="recovery_code">
                                        Recovery code
                                    </Label>
                                    <Input
                                        id="recovery_code"
                                        name="recovery_code"
                                        autoComplete="one-time-code"
                                        autoFocus
                                        required
                                        className="h-11 bg-white/80 font-mono"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="code">
                                        Kode authenticator
                                    </Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        autoFocus
                                        required
                                        maxLength={20}
                                        className="h-12 bg-white/80 text-center font-mono text-xl tracking-[0.35em]"
                                    />
                                </div>
                            )}
                            <InputError message={errors.code} />
                            <Button
                                disabled={processing}
                                className="h-11 w-full bg-[#102b31] hover:bg-[#173f47]"
                            >
                                {processing ? <Spinner /> : <KeyRound />}
                                Verifikasi dan masuk
                            </Button>
                        </>
                    )}
                </Form>

                <button
                    type="button"
                    onClick={() => setRecovery((value) => !value)}
                    className="mt-5 flex w-full items-center justify-center gap-2 text-sm font-medium text-[#49666c] hover:text-[#102b31]"
                >
                    <LifeBuoy className="size-4" />
                    {recovery
                        ? 'Gunakan kode authenticator'
                        : 'Gunakan recovery code'}
                </button>
                <Link
                    href="/super-admin/login"
                    className="mt-4 block text-center text-xs text-slate-500 hover:text-slate-800"
                >
                    Kembali ke halaman login
                </Link>
            </section>
        </div>
    );
}
