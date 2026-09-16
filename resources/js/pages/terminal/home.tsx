import { router, useForm } from '@inertiajs/react';
import { CircleStop, LogOut, MonitorDot, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { FormCurrencyInput, FormSelect } from '@/components/forms';
import { ResponsiveDialog } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import PosIndex from '@/pages/customer/pos';
import type { ActiveRegisterSession, Marketplace, PaymentMethod, ProductOption } from '@/pages/customer/pos/types';
import terminalRoutes from '@/routes/terminal';
import registerSessionRoutes from '@/routes/terminal/register-sessions';
import terminalSalesRoutes from '@/routes/terminal/sales';

export default function TerminalHome(props: {
    products: ProductOption[];
    paymentMethods: PaymentMethod[];
    marketplaces: Marketplace[];
    timezone: string;
    registers: Array<{ public_id: string; name: string }>;
    activeRegisterSession: ActiveRegisterSession | null;
    device: { public_id: string; name: string };
    store: { public_id: string; name: string };
    actor: { public_id: string; display_name: string };
}) {
    const { t } = useTranslation();
    const [closeOpen, setCloseOpen] = useState(false);
    const openShift = useForm({ register_id: props.registers[0]?.public_id ?? '', opening_cash: '0' });
    const closeShift = useForm({ counted_cash: props.activeRegisterSession?.expected_cash ?? '0' });

    if (!props.activeRegisterSession) {
        return (
            <div className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-lg flex-col justify-center px-4 py-6">
                <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
                    <span className="grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
                        <MonitorDot className="size-5" />
                    </span>
                    <h1 className="mt-4 text-2xl font-bold">{t('Open register shift')}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {props.actor.display_name} · {props.store.name} · {props.device.name}
                    </p>
                    <div className="mt-6 space-y-4">
                        <FormSelect
                            id="terminal-register"
                            name="register_id"
                            label={t('Register')}
                            value={openShift.data.register_id}
                            onChange={(event) => openShift.setData('register_id', event.target.value)}
                            error={openShift.errors.register_id}
                            required
                        >
                            {props.registers.map((register) => (
                                <option key={register.public_id} value={register.public_id}>
                                    {register.name}
                                </option>
                            ))}
                        </FormSelect>
                        <FormCurrencyInput
                            id="terminal-opening-cash"
                            name="opening_cash"
                            label={t('Opening cash')}
                            value={openShift.data.opening_cash}
                            onValueChange={(value) => openShift.setData('opening_cash', value)}
                            error={openShift.errors.opening_cash}
                            required
                        />
                        <Button
                            className="min-h-12 w-full"
                            disabled={openShift.processing || !openShift.data.register_id}
                            onClick={() => openShift.post(registerSessionRoutes.store.url())}
                        >
                            {openShift.processing ? t('Opening...') : t('Open shift')}
                        </Button>
                        <Button variant="ghost" className="min-h-11 w-full" onClick={() => router.post(terminalRoutes.lock.store.url())}>
                            <LogOut className="size-4" /> {t('Switch cashier')}
                        </Button>
                    </div>
                    {props.registers.length === 0 && (
                        <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                            {t('Ask an owner or manager to configure a Register first.')}
                        </p>
                    )}
                </section>
            </div>
        );
    }

    return (
        <>
            <div className="sticky top-[env(safe-area-inset-top)] z-50 flex min-h-14 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:gap-3 sm:px-5">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                        {props.actor.display_name} · {props.activeRegisterSession.register.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {props.store.name} · {props.device.name}
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <Button className="min-h-11" variant="outline" size="sm" onClick={() => setCloseOpen(true)}>
                        <CircleStop className="size-4" />
                        <span className="hidden sm:inline">{t('Close shift')}</span>
                        <span className="sr-only sm:hidden">{t('Close shift')}</span>
                    </Button>
                    <Button className="min-h-11" variant="ghost" size="sm" onClick={() => router.post(terminalRoutes.lock.store.url())}>
                        <UsersRound className="size-4" />
                        <span className="hidden sm:inline">{t('Switch cashier')}</span>
                        <span className="sr-only sm:hidden">{t('Switch cashier')}</span>
                    </Button>
                </div>
            </div>
            <PosIndex
                {...props}
                submitUrl={terminalSalesRoutes.store.url()}
                terminalContext={{ cashier: props.actor.display_name, device: props.device.name }}
            />
            <ResponsiveDialog
                open={closeOpen}
                onOpenChange={setCloseOpen}
                title={t('Close register shift')}
                description={t('Count the physical cash before closing. The variance is recorded in history.')}
                size="sm"
                bodyClassName="space-y-4"
            >
                <FormCurrencyInput
                    id="terminal-counted-cash"
                    name="counted_cash"
                    label={t('Counted cash')}
                    value={closeShift.data.counted_cash}
                    onValueChange={(value) => closeShift.setData('counted_cash', value)}
                    error={closeShift.errors.counted_cash}
                    required
                />
                <Button
                    className="min-h-12 w-full"
                    disabled={closeShift.processing}
                    onClick={() =>
                        closeShift.post(registerSessionRoutes.close.url(props.activeRegisterSession!.public_id), {
                            onSuccess: () => setCloseOpen(false),
                        })
                    }
                >
                    {closeShift.processing ? t('Closing...') : t('Close shift')}
                </Button>
            </ResponsiveDialog>
        </>
    );
}
