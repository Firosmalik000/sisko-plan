import { useForm } from '@inertiajs/react';
import { CreditCard, MonitorDot, Plus } from 'lucide-react';
import { useState } from 'react';
import { FormInput, FormSelect } from '@/components/forms';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { TeamHubNav } from '@/pages/customer/team/team-hub-nav';
import registersRoutes from '@/routes/registers';

type Account = { public_id: string; name: string };
type Register = { public_id: string; name: string; status: string; cash_account: Account };

export default function RegistersIndex({ registers, cashAccounts }: { registers: Register[]; cashAccounts: Account[] }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const form = useForm({ name: '', cash_account_id: cashAccounts[0]?.public_id ?? '' });
    const submit = () =>
        form.post(registersRoutes.store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });

    return (
        <AppPage
            title={t('Staff & checkout')}
            icon={MonitorDot}
            headerSurface
            actions={
                <Button onClick={() => setOpen(true)} disabled={cashAccounts.length === 0}>
                    <Plus className="size-4" /> {t('Add register')}
                </Button>
            }
        >
            <TeamHubNav active="registers" />
            <section aria-labelledby="registers-heading">
                <div className="mb-3">
                    <h2 id="registers-heading" className="font-bold">
                        {t('Registers')}
                    </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {registers.map((register) => (
                        <article key={register.public_id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex items-start justify-between gap-3">
                                <h3 className="font-bold">{register.name}</h3>
                                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{t(register.status)}</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                                <CreditCard className="size-4 shrink-0 text-primary" />
                                <span className="truncate">{register.cash_account.name}</span>
                            </div>
                        </article>
                    ))}
                    {registers.length === 0 && (
                        <div className="rounded-2xl border border-dashed p-6 text-center sm:col-span-2 xl:col-span-3">
                            <p className="font-semibold">{t('No register configured yet.')}</p>
                            <Button className="mt-4" variant="outline" onClick={() => setOpen(true)} disabled={cashAccounts.length === 0}>
                                <Plus className="size-4" /> {t('Create first register')}
                            </Button>
                        </div>
                    )}
                </div>
            </section>
            <ResponsiveDialog open={open} onOpenChange={setOpen} title={t('Add register')} size="sm" bodyClassName="space-y-4">
                <FormInput
                    id="register-name"
                    name="name"
                    label={t('Register name')}
                    value={form.data.name}
                    onChange={(event) => form.setData('name', event.target.value)}
                    error={form.errors.name}
                    required
                />
                <FormSelect
                    id="register-account"
                    name="cash_account_id"
                    label={t('Cash account')}
                    value={form.data.cash_account_id}
                    onChange={(event) => form.setData('cash_account_id', event.target.value)}
                    error={form.errors.cash_account_id}
                    required
                >
                    {cashAccounts.map((account) => (
                        <option key={account.public_id} value={account.public_id}>
                            {account.name}
                        </option>
                    ))}
                </FormSelect>
                <Button className="min-h-11 w-full" disabled={form.processing} onClick={submit}>
                    {form.processing ? t('Saving...') : t('Save register')}
                </Button>
            </ResponsiveDialog>
        </AppPage>
    );
}
