import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Delete, LockKeyhole, LogOut } from 'lucide-react';
import { FormInput } from '@/components/forms';
import { ResponsiveDialog } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import terminalRoutes from '@/routes/terminal';

type Member = { public_id: string; display_name: string };

export default function TerminalLock({
    device,
    store,
    members,
}: {
    device: { public_id: string; name: string };
    store: { public_id: string; name: string };
    members: Member[];
}) {
    const { t } = useTranslation();
    const [exitOpen, setExitOpen] = useState(false);
    const form = useForm({ member_id: members[0]?.public_id ?? '', pin: '' });
    const exitForm = useForm({ email: '', password: '' });
    const append = (digit: string) => form.setData('pin', `${form.data.pin}${digit}`.slice(0, 6));
    const submit = () => form.post(terminalRoutes.unlock.url(), { preserveScroll: true, onError: () => form.setData('pin', '') });

    return (
        <div className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-md flex-col justify-center px-4 py-6">
            <Head title={t('Cashier login')} />
            <div className="rounded-3xl border border-border bg-card p-5 shadow-xl sm:p-7 dark:shadow-none">
                <div className="text-center">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
                        <LockKeyhole className="size-6" />
                    </span>
                    <h1 className="mt-4 text-2xl font-bold">{store.name}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {device.name} · {t('Choose your name and enter your PIN')}
                    </p>
                </div>
                {members.length === 0 ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center">
                        <p className="text-sm font-semibold">{t('No cashier staff with PIN found for this store.')}</p>
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {members.map((member) => (
                            <button
                                key={member.public_id}
                                type="button"
                                aria-pressed={form.data.member_id === member.public_id}
                                onClick={() => {
                                    form.setData('member_id', member.public_id);
                                    form.setData('pin', '');
                                }}
                                className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${form.data.member_id === member.public_id ? 'border-primary bg-secondary text-primary' : 'border-border'}`}
                            >
                                {member.display_name}
                            </button>
                        ))}
                    </div>
                )}
                <label htmlFor="terminal-pin" className="mt-6 block text-center text-sm font-semibold">
                    {t('Six-digit PIN')}
                </label>
                <input
                    id="terminal-pin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoComplete="off"
                    value={form.data.pin}
                    onChange={(event) => form.setData('pin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="mt-2 h-12 w-full rounded-xl border border-input bg-background text-center text-2xl tracking-[0.45em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-invalid={Boolean(form.errors.pin)}
                />
                {(form.errors.pin || form.errors.member_id) && (
                    <p role="alert" className="mt-2 text-center text-sm font-semibold text-destructive">
                        {form.errors.pin || form.errors.member_id}
                    </p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                            key={digit}
                            type="button"
                            onClick={() => append(digit)}
                            className="min-h-14 rounded-xl bg-secondary text-xl font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            {digit}
                        </button>
                    ))}
                    <span />
                    <button
                        type="button"
                        onClick={() => append('0')}
                        className="min-h-14 rounded-xl bg-secondary text-xl font-bold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        0
                    </button>
                    <button
                        type="button"
                        aria-label={t('Delete digit')}
                        onClick={() => form.setData('pin', form.data.pin.slice(0, -1))}
                        className="grid min-h-14 place-items-center rounded-xl bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <Delete className="size-5" />
                    </button>
                </div>
                <Button
                    className="mt-4 min-h-12 w-full"
                    disabled={form.processing || form.data.pin.length !== 6 || !form.data.member_id}
                    onClick={submit}
                >
                    {form.processing ? t('Checking...') : t('Enter cashier')}
                </Button>
                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => setExitOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <LogOut className="size-3.5" />
                        {t('Exit terminal mode')}
                    </button>
                </div>
            </div>

            <ResponsiveDialog
                open={exitOpen}
                onOpenChange={(open) => {
                    setExitOpen(open);
                    if (!open) {
                        exitForm.reset();
                        exitForm.clearErrors();
                    }
                }}
                title={t('Exit terminal mode')}
                description={t('Enter business owner or admin credentials to exit terminal mode on this device.')}
                size="sm"
                bodyClassName="space-y-4"
            >
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        exitForm.post(terminalRoutes.exit.url(), {
                            preserveScroll: true,
                        });
                    }}
                    className="space-y-4"
                >
                    <FormInput
                        id="exit-email"
                        name="email"
                        type="email"
                        label={t('Email')}
                        value={exitForm.data.email}
                        onChange={(event) => exitForm.setData('email', event.target.value)}
                        error={exitForm.errors.email}
                        required
                        autoFocus
                    />
                    <FormInput
                        id="exit-password"
                        name="password"
                        type="password"
                        label={t('Password')}
                        value={exitForm.data.password}
                        onChange={(event) => exitForm.setData('password', event.target.value)}
                        error={exitForm.errors.password}
                        required
                    />
                    <Button
                        type="submit"
                        className="min-h-11 w-full"
                        disabled={exitForm.processing || !exitForm.data.email || !exitForm.data.password}
                    >
                        {exitForm.processing ? t('Verifying...') : t('Verify and exit')}
                    </Button>
                </form>
            </ResponsiveDialog>
        </div>
    );
}
