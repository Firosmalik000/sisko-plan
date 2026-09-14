import { Form } from '@inertiajs/react';
import { Building2, Coins } from 'lucide-react';
import { useState } from 'react';
import { FormInput, FormSelect, FormTextarea } from '@/components/forms';
import { AppPage } from '@/components/page/app-page';
import { PageSection } from '@/components/page/page-section';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { translate } from '@/lib/i18n';
import storesRoutes from '@/routes/stores';

type CountryOption = {
    code: string;
    name: string;
    currency: { code: string; name: string; symbol: string };
    default_timezone: string;
    timezones: string[];
};

export default function CreateStore({ countries, defaultCountry }: { countries: CountryOption[]; defaultCountry: string }) {
    const [countryCode, setCountryCode] = useState(defaultCountry);
    const country = countries.find((option) => option.code === countryCode);
    const currency = country?.currency;

    return (
        <AppPage
            title={translate('Create store')}
            description={translate('Lengkapi identity dasar store.')}
            icon={Building2}
            back={{ href: storesRoutes.index.url(), label: translate('List store') }}
            size="form"
        >
            <PageSection>
                <Form {...storesRoutes.store.form()} className="grid gap-4 p-4 sm:p-5">
                    {({ processing, errors }) => (
                        <>
                            <FormInput
                                id="name"
                                name="name"
                                label={translate('Store name')}
                                placeholder={translate('Sample: Store Berkah Main')}
                                autoFocus
                                required
                                maxLength={120}
                                error={errors.name}
                            />
                            <FormTextarea
                                id="address"
                                name="address"
                                label={translate('Store address')}
                                rows={3}
                                maxLength={500}
                                placeholder={translate('Example: 10 Main Street')}
                                error={errors.address}
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormSelect
                                    id="country"
                                    name="country"
                                    label={translate('Store country')}
                                    value={countryCode}
                                    onChange={(event) => setCountryCode(event.target.value)}
                                    required
                                    error={errors.country}
                                >
                                    {countries.map((country) => (
                                        <option key={country.code} value={country.code}>
                                            {country.name}
                                        </option>
                                    ))}
                                </FormSelect>
                                <div>
                                    <p className="mb-2 text-sm font-medium">{translate('Currency')}</p>
                                    <div className="flex h-11 items-center gap-2 rounded-xl border border-input bg-muted/40 px-3 text-sm font-semibold">
                                        <Coins className="size-4 text-muted-foreground" />
                                        {currency ? `${currency.code} (${currency.symbol})` : '-'}
                                    </div>
                                </div>
                            </div>
                            <FormSelect
                                key={countryCode}
                                id="timezone"
                                name="timezone"
                                label={translate('Time zone')}
                                defaultValue={country?.default_timezone}
                                required
                                error={errors.timezone}
                            >
                                {(country?.timezones ?? []).map((timezone) => (
                                    <option key={timezone} value={timezone}>
                                        {timezone.replace('Asia/', '').replaceAll('_', ' ')}
                                    </option>
                                ))}
                            </FormSelect>
                            <Button disabled={processing} size="touch" className="w-full">
                                {processing && <Spinner />}
                                {translate('Create store and continue')}
                            </Button>
                        </>
                    )}
                </Form>
            </PageSection>
        </AppPage>
    );
}

CreateStore.layout = { breadcrumbs: [{ title: 'Create store', href: storesRoutes.create.url() }] };
