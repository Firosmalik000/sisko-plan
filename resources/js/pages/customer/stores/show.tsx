import { Form } from '@inertiajs/react';
import { Archive, Building2, Coins, Globe2, MapPin, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FormInput, FormSelect, FormTextarea } from '@/components/forms';
import InputError from '@/components/input-error';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { PageSection } from '@/components/page/page-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { translate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import storesRoutes from '@/routes/stores';

type StoreDetail = {
    public_id: string;
    name: string;
    status: string;
    can_manage: boolean;
    can_archive: boolean;
    can_restore: boolean;
    can_delete: boolean;
    country_editable: boolean;
    country_code: string | null;
    country_name: string | null;
    currency_code: string | null;
    currency_symbol: string | null;
    address: string | null;
    timezone: string | null;
};

type CountryOption = {
    code: string;
    name: string;
    currency_code: string;
    currency_symbol: string;
    is_active: boolean;
    default_timezone: string;
    timezones: string[];
};

function StoreFact({ icon: Icon, label, value, wide = false }: { icon: typeof MapPin; label: string; value: string; wide?: boolean }) {
    return (
        <div className={cn('flex min-w-0 items-start gap-3 py-1', wide && 'sm:col-span-2')}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">{translate(label)}</p>
                <p className="mt-0.5 font-semibold break-words text-foreground">{value}</p>
            </div>
        </div>
    );
}

export default function StoreShow({ store, countries }: { store: StoreDetail; countries: CountryOption[] }) {
    const [editOpen, setEditOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const statusLabel = store.status === 'active' ? 'Active store' : store.status === 'archived' ? 'Store archived' : 'Store suspended';

    return (
        <>
            <AppPage
                title={store.name}
                description={translate('Details store and members')}
                icon={Building2}
                back={{ href: storesRoutes.index.url(), label: translate('Back to store list') }}
                actions={<Badge variant={store.status === 'active' ? 'secondary' : 'destructive'}>{translate(statusLabel)}</Badge>}
            >
                <PageSection title={translate('Information store')}>
                    <div className="grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
                        <StoreFact icon={MapPin} label="Store address" value={store.address ?? '-'} wide />
                        <StoreFact icon={Globe2} label="Country" value={store.country_name ?? store.country_code ?? '-'} />
                        <StoreFact
                            icon={Coins}
                            label="Currency"
                            value={`${store.currency_code ?? '-'}${store.currency_symbol ? ` (${store.currency_symbol})` : ''}`}
                        />
                        <StoreFact icon={Globe2} label="Time zone" value={store.timezone ?? '-'} />
                    </div>
                </PageSection>

                {store.can_manage && (
                    <PageSection title={translate('Manage store')}>
                        <div className="flex flex-wrap gap-2 p-4 sm:justify-end sm:p-5">
                            <Button type="button" variant="outline" size="touch" onClick={() => setEditOpen(true)}>
                                {translate('Change identity')}
                            </Button>
                            {store.can_archive && (
                                <Button type="button" variant="destructive" size="touch" onClick={() => setArchiveOpen(true)}>
                                    <Archive /> {translate('Archive store')}
                                </Button>
                            )}
                        </div>
                    </PageSection>
                )}

                {store.can_restore && (
                    <PageSection>
                        <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
                            <Form {...storesRoutes.restore.form(store.public_id)}>
                                {({ processing, errors }) => (
                                    <>
                                        <Button disabled={processing} size="touch" className="w-full">
                                            <RotateCcw /> {translate('Restore store')}
                                        </Button>
                                        <InputError className="mt-2" message={errors.name ?? errors.subscription} />
                                    </>
                                )}
                            </Form>
                            {store.can_delete && (
                                <Button type="button" variant="destructive" size="touch" onClick={() => setDeleteOpen(true)}>
                                    <Trash2 /> {translate('Delete permanen')}
                                </Button>
                            )}
                        </div>
                    </PageSection>
                )}
            </AppPage>

            <ResponsiveDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                title={translate('Edit store details')}
                size="md"
                footer={
                    <>
                        <Button type="button" variant="outline" size="touch" onClick={() => setEditOpen(false)}>
                            {translate('Cancel')}
                        </Button>
                        <Button type="submit" form="edit-store-form" size="touch">
                            {translate('Save changes')}
                        </Button>
                    </>
                }
            >
                <Form
                    id="edit-store-form"
                    {...storesRoutes.update.form(store.public_id)}
                    className="grid gap-4"
                    onSuccess={() => setEditOpen(false)}
                >
                    {({ errors }) => (
                        <>
                            <FormInput
                                id="store-name"
                                name="name"
                                label={translate('Store name')}
                                defaultValue={store.name}
                                placeholder={translate('Sample: Store Berkah Main')}
                                required
                                maxLength={120}
                                error={errors.name}
                            />
                            <FormTextarea
                                id="store-address"
                                name="address"
                                label={translate('Store address')}
                                defaultValue={store.address ?? ''}
                                rows={3}
                                maxLength={500}
                                placeholder={translate('Example: 10 Main Street')}
                                error={errors.address}
                            />
                            {store.country_editable ? (
                                <EditableGeography store={store} countries={countries} errors={errors} />
                            ) : (
                                <div>
                                    <p className="mb-1.5 text-sm font-semibold">{translate('Store country')}</p>
                                    <div className="flex h-11 items-center rounded-xl border border-input bg-muted/40 px-3 text-sm font-semibold">
                                        {store.country_name ?? store.country_code ?? '-'} · {store.currency_code ?? '-'} (
                                        {store.currency_symbol})
                                    </div>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {translate('The country is locked because the store already has transactions.')}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </Form>
            </ResponsiveDialog>

            <ResponsiveDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title={translate('Archive store?')}
                size="sm"
                footer={
                    <>
                        <Button type="button" variant="outline" size="touch" onClick={() => setArchiveOpen(false)}>
                            {translate('Cancel')}
                        </Button>
                        <Form {...storesRoutes.destroy.form(store.public_id)}>
                            {({ processing }) => (
                                <Button variant="destructive" size="touch" disabled={processing} className="w-full">
                                    <Archive /> {translate('Archive')}
                                </Button>
                            )}
                        </Form>
                    </>
                }
            >
                <p className="text-sm leading-6 text-muted-foreground">
                    {translate('The store can no longer process transactions, but all data and history remain preserved.')}
                </p>
            </ResponsiveDialog>

            <ResponsiveDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={translate('Permanently delete this store?')}
                size="sm"
                footer={
                    <>
                        <Button type="button" variant="outline" size="touch" onClick={() => setDeleteOpen(false)}>
                            {translate('Cancel')}
                        </Button>
                        <Button type="submit" form="delete-store-form" variant="destructive" size="touch">
                            <Trash2 /> {translate('Delete permanen')}
                        </Button>
                    </>
                }
            >
                <p className="mb-4 text-sm leading-6 text-muted-foreground">
                    {translate('All store products, transactions, members, and history will be permanently deleted.')}
                </p>
                <Form id="delete-store-form" {...storesRoutes.forceDestroy.form(store.public_id)}>
                    {({ errors }) => (
                        <>
                            <input type="hidden" name="confirmation" value="1" />
                            <FormInput
                                id="delete-store-name"
                                name="store_name"
                                label={translate('Enter the store name')}
                                placeholder={store.name}
                                autoComplete="off"
                                required
                                error={errors.store_name}
                            />
                        </>
                    )}
                </Form>
            </ResponsiveDialog>
        </>
    );
}

function EditableGeography({
    store,
    countries,
    errors,
}: {
    store: StoreDetail;
    countries: CountryOption[];
    errors: Partial<Record<'country' | 'timezone', string>>;
}) {
    const [countryCode, setCountryCode] = useState(store.country_code ?? '');
    const country = countries.find((option) => option.code === countryCode);

    return (
        <>
            <FormSelect
                id="store-country"
                name="country"
                label={translate('Store country')}
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                error={errors.country}
            >
                {countries.map((option) => (
                    <option key={option.code} value={option.code} disabled={!option.is_active}>
                        {option.name} · {option.currency_code} ({option.currency_symbol})
                    </option>
                ))}
            </FormSelect>
            <FormSelect
                key={countryCode}
                id="store-timezone"
                name="timezone"
                label={translate('Time zone')}
                defaultValue={
                    countryCode === store.country_code ? (store.timezone ?? country?.default_timezone) : country?.default_timezone
                }
                error={errors.timezone}
            >
                {(country?.timezones ?? []).map((timezone) => (
                    <option key={timezone} value={timezone}>
                        {timezone.replace('Asia/', '').replaceAll('_', ' ')}
                    </option>
                ))}
            </FormSelect>
        </>
    );
}

StoreShow.layout = {
    breadcrumbs: [{ title: 'Stores & Members', href: storesRoutes.index.url() }],
};
