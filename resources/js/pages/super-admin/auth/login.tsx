import { Form, Head } from '@inertiajs/react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function SuperAdminLogin() {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#102b31] px-5 py-12">
            <Head title="Super Admin Login" />
            <div className="absolute -top-36 -left-36 size-[32rem] rounded-full border border-white/5" />
            <div className="absolute -right-32 -bottom-52 size-[34rem] rounded-full bg-[#d7a941]/10" />
            <div className="relative grid w-full max-w-4xl overflow-hidden rounded-3xl bg-[#f7f3e8] shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
                <section className="hidden bg-[#d7a941] p-10 lg:flex lg:flex-col lg:justify-between">
                    <ShieldCheck className="size-10 text-[#102b31]" />
                    <div>
                        <p className="text-xs font-semibold tracking-[0.25em] text-[#102b31]/65 uppercase">
                            Restricted access
                        </p>
                        <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight text-[#102b31]">
                            Kendali platform tetap terpisah dari data toko.
                        </h1>
                    </div>
                </section>
                <section className="p-7 sm:p-12">
                    <div className="mb-9 flex size-12 items-center justify-center rounded-2xl bg-[#102b31] text-white lg:hidden">
                        <ShieldCheck />
                    </div>
                    <p className="text-xs font-semibold tracking-[0.22em] text-[#8a681e] uppercase">
                        Sisko Control
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                        Masuk sebagai Super Admin
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Gunakan akun operator platform, bukan akun pemilik toko.
                    </p>
                    <Form
                        action="/super-admin/login"
                        method="post"
                        resetOnSuccess={['password']}
                        className="mt-8 space-y-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="email">
                                        Email operator
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="username"
                                        autoFocus
                                        required
                                        className="h-11 bg-white/70"
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Kata sandi</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        className="h-11 bg-white/70"
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Checkbox id="remember" name="remember" />
                                    <Label
                                        htmlFor="remember"
                                        className="text-sm font-normal"
                                    >
                                        Ingat sesi ini
                                    </Label>
                                </div>
                                <Button
                                    disabled={processing}
                                    className="h-11 w-full bg-[#102b31] hover:bg-[#173f47]"
                                >
                                    {processing ? <Spinner /> : <KeyRound />}{' '}
                                    Masuk ke panel kontrol
                                </Button>
                            </>
                        )}
                    </Form>
                </section>
            </div>
        </div>
    );
}
