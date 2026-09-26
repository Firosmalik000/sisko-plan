import { Link, router, useForm } from '@inertiajs/react';
import { KeyRound, MonitorSmartphone, Plus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FormInput, FormSelect } from '@/components/forms';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import businessesRoutes from '@/routes/businesses';
import posDevicesRoutes from '@/routes/pos-devices';
import teamRoutes from '@/routes/team';
import { TeamHubNav } from './team-hub-nav';

type StoreOption = { public_id: string; name: string };
type Member = {
    public_id: string;
    display_name: string;
    business_role: string;
    status: string;
    email: string | null;
    has_pin: boolean;
    stores: StoreOption[];
};
type Device = {
    public_id: string;
    name: string;
    status: string;
    last_seen_at: string | null;
    store: StoreOption | null;
};

export default function TeamIndex({
    business,
    canManage,
    assignableStores,
    members,
    devices,
}: {
    business: { public_id: string; name: string };
    canManage: boolean;
    assignableStores: StoreOption[];
    members: Member[];
    devices: Device[];
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [deviceOpen, setDeviceOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<'staff' | 'devices'>('staff');

    useEffect(() => {
        const updateFromHash = () => {
            if (typeof window !== 'undefined' && window.location.hash === '#cashier-devices') {
                setActiveSection('devices');
            } else {
                setActiveSection('staff');
            }
        };
        updateFromHash();
        window.addEventListener('hashchange', updateFromHash);

        return () => window.removeEventListener('hashchange', updateFromHash);
    }, []);

    const handleSectionChange = (section: 'staff' | 'devices') => {
        setActiveSection(section);

        if (section === 'devices') {
            if (window.location.hash !== '#cashier-devices') {
                window.location.hash = '#cashier-devices';
            }

            document.getElementById('cashier-devices')?.scrollIntoView({ behavior: 'smooth' });
        } else {
            if (window.location.hash) {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const form = useForm({
        display_name: '',
        role: 'cashier',
        store_ids: assignableStores[0] ? [assignableStores[0].public_id] : ([] as string[]),
        pin: '',
        personal_device_access: false,
        email: '',
    });
    const deviceForm = useForm({ store_id: assignableStores[0]?.public_id ?? '', name: '' });
    const toggleStore = (id: string) =>
        form.setData(
            'store_ids',
            form.data.store_ids.includes(id) ? form.data.store_ids.filter((value) => value !== id) : [...form.data.store_ids, id],
        );
    const submit = () =>
        form.post(businessesRoutes.members.store.url(business.public_id), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });

    return (
        <AppPage
            title={t('Staff & checkout')}
            icon={UsersRound}
            headerSurface
            actions={
                canManage && (
                    <Button onClick={() => (activeSection === 'devices' ? setDeviceOpen(true) : setOpen(true))}>
                        <Plus className="size-4" /> {activeSection === 'devices' ? t('Activate device') : t('Add staff')}
                    </Button>
                )
            }
        >
            <TeamHubNav active={activeSection} onSectionChange={handleSectionChange} />

            <section id="staff-section" aria-labelledby="staff-heading">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 id="staff-heading" className="font-bold">
                        {t('Staff')}
                    </h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {members.map((member) => (
                        <Link
                            key={member.public_id}
                            href={teamRoutes.show.url(member.public_id)}
                            className="rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-bold">{member.display_name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{t(member.business_role)}</p>
                                </div>
                                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{t(member.status)}</span>
                            </div>
                            <p className="mt-3 truncate text-sm text-muted-foreground">{member.email ?? t('POS device only')}</p>
                            <p className="mt-2 text-xs text-muted-foreground">
                                {member.stores.map((store) => store.name).join(', ') || t('All stores')}
                            </p>
                        </Link>
                    ))}
                    {members.length === 0 && (
                        <div className="rounded-2xl border border-dashed p-6 text-center sm:col-span-2 xl:col-span-3">
                            <p className="font-semibold">{t('No staff yet.')}</p>
                            {canManage && (
                                <Button className="mt-4" variant="outline" onClick={() => setOpen(true)}>
                                    <Plus className="size-4" /> {t('Add staff')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <section id="cashier-devices" aria-labelledby="devices-heading" className="scroll-mt-24 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <MonitorSmartphone className="size-5 text-primary" />
                        <h2 id="devices-heading" className="font-bold">
                            {t('Cashier devices')}
                        </h2>
                    </div>
                    {canManage && (
                        <Button variant="outline" size="sm" onClick={() => setDeviceOpen(true)}>
                            <Plus className="size-4" /> {t('Activate device')}
                        </Button>
                    )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {devices.map((device) => (
                        <div
                            key={device.public_id}
                            className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 transition focus-within:ring-2 focus-within:ring-ring hover:border-primary/40"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-bold">{device.name}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{device.store?.name ?? t('All stores')}</p>
                                    </div>
                                    <span
                                        className={cn(
                                            'rounded-full px-2.5 py-1 text-xs font-semibold',
                                            device.status === 'active' ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {t(device.status)}
                                    </span>
                                </div>
                            </div>
                            {canManage && device.status === 'active' && device.store && (
                                <div className="mt-4 flex justify-end border-t border-border pt-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() =>
                                            router.delete(
                                                posDevicesRoutes.destroy.url({ store: device.store!.public_id, device: device.public_id }),
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {t('Revoke device')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                    {devices.length === 0 && (
                        <div className="rounded-2xl border border-dashed p-6 text-center sm:col-span-2 xl:col-span-3">
                            <p className="font-semibold">{t('No cashier device has been activated.')}</p>
                            {canManage && (
                                <Button className="mt-4" variant="outline" onClick={() => setDeviceOpen(true)}>
                                    <Plus className="size-4" /> {t('Activate device')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <ResponsiveDialog open={open} onOpenChange={setOpen} title={t('Add staff')} size="md" bodyClassName="space-y-5">
                <FormInput
                    id="staff-name"
                    name="display_name"
                    label={t('Name')}
                    value={form.data.display_name}
                    onChange={(event) => form.setData('display_name', event.target.value)}
                    error={form.errors.display_name}
                    required
                />
                <FormSelect
                    id="staff-role"
                    name="role"
                    label={t('Role')}
                    value={form.data.role}
                    onChange={(event) => form.setData('role', event.target.value)}
                    error={form.errors.role}
                >
                    <option value="cashier">{t('Cashier')}</option>
                    <option value="manager">{t('Manager')}</option>
                    <option value="admin">{t('Business admin')}</option>
                </FormSelect>
                {form.data.role !== 'admin' && (
                    <fieldset>
                        <legend className="text-sm font-semibold">{t('Stores')}</legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {assignableStores.map((store) => (
                                <label
                                    key={store.public_id}
                                    className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.data.store_ids.includes(store.public_id)}
                                        onChange={() => toggleStore(store.public_id)}
                                    />
                                    {store.name}
                                </label>
                            ))}
                        </div>
                        {form.errors.store_ids && <p className="mt-1 text-xs text-destructive">{form.errors.store_ids}</p>}
                    </fieldset>
                )}
                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-semibold">
                    <input
                        type="checkbox"
                        checked={form.data.personal_device_access}
                        onChange={(event) => form.setData('personal_device_access', event.target.checked)}
                    />
                    {t('Allow login on a personal device')}
                </label>
                {form.data.personal_device_access && (
                    <FormInput
                        id="staff-email"
                        name="email"
                        type="email"
                        label={t('Email')}
                        value={form.data.email}
                        onChange={(event) => form.setData('email', event.target.value)}
                        error={form.errors.email}
                        required
                    />
                )}
                <FormInput
                    id="staff-pin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    label={t('Six-digit cashier PIN')}
                    value={form.data.pin}
                    onChange={(event) => form.setData('pin', event.target.value.replace(/\D/g, '').slice(0, 6))}
                    error={form.errors.pin}
                    required={!form.data.personal_device_access}
                />
                <Button className="min-h-11 w-full" disabled={form.processing} onClick={submit}>
                    <KeyRound className="size-4" /> {form.processing ? t('Saving...') : t('Create staff access')}
                </Button>
            </ResponsiveDialog>
            <ResponsiveDialog
                open={deviceOpen}
                onOpenChange={setDeviceOpen}
                title={t('Activate cashier device')}
                size="sm"
                bodyClassName="space-y-4"
            >
                <FormSelect
                    id="device-store"
                    name="store_id"
                    label={t('Store')}
                    value={deviceForm.data.store_id}
                    onChange={(event) => deviceForm.setData('store_id', event.target.value)}
                    required
                >
                    {assignableStores.map((store) => (
                        <option key={store.public_id} value={store.public_id}>
                            {store.name}
                        </option>
                    ))}
                </FormSelect>
                <FormInput
                    id="device-name"
                    name="name"
                    label={t('Device name')}
                    value={deviceForm.data.name}
                    onChange={(event) => deviceForm.setData('name', event.target.value)}
                    error={deviceForm.errors.name}
                    required
                />
                <Button
                    className="min-h-11 w-full"
                    disabled={deviceForm.processing || !deviceForm.data.store_id}
                    onClick={() => deviceForm.post(posDevicesRoutes.store.url(deviceForm.data.store_id))}
                >
                    {deviceForm.processing ? t('Activating...') : t('Activate and open cashier mode')}
                </Button>
            </ResponsiveDialog>
        </AppPage>
    );
}
