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

type CountryOption = { code: string; name: string; currency: { code: string; name: string; symbol: string } };

export default function CreateStore({ countries, defaultCountry }: { countries: CountryOption[]; defaultCountry: string }) {
    const [countryCode, setCountryCode] = useState(defaultCountry);
    const currency = countries.find((country) => country.code === countryCode)?.currency;

    return (
        <AppPage
            title={translate('Buat toko')}
            description={translate('Lengkapi identitas dasar toko.')}
            icon={Building2}
            back={{ href: storesRoutes.index.url(), label: translate('Daftar toko') }}
            size="form"
        >
            <PageSection>
                <Form {...storesRoutes.store.form()} className="grid gap-4 p-4 sm:p-5">
                    {({ processing, errors }) => (
                        <>
                            <FormInput
                                id="name"
                                name="name"
                                label={translate('Nama toko')}
                                placeholder={translate('Contoh: Toko Berkah Utama')}
                                autoFocus
                                required
                                maxLength={120}
                                error={errors.name}
                            />
                            <FormTextarea
                                id="address"
                                name="address"
                                label={translate('Alamat toko')}
                                rows={3}
                                maxLength={500}
                                placeholder={translate('Contoh: Jalan Utama No. 10')}
                                error={errors.address}
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <FormSelect
                                    id="country"
                                    name="country"
                                    label={translate('Negara toko')}
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
                                    <p className="mb-2 text-sm font-medium">{translate('Mata uang')}</p>
                                    <div className="flex h-11 items-center gap-2 rounded-xl border border-input bg-muted/40 px-3 text-sm font-semibold">
                                        <Coins className="size-4 text-muted-foreground" />
                                        {currency ? `${currency.code} (${currency.symbol})` : '-'}
                                    </div>
                                </div>
                            </div>
                            <Button disabled={processing} size="touch" className="w-full">
                                {processing && <Spinner />}
                                {translate('Buat toko dan lanjutkan')}
                            </Button>
                        </>
                    )}
                </Form>
            </PageSection>
        </AppPage>
    );
}

CreateStore.layout = { breadcrumbs: [{ title: 'Buat toko', href: storesRoutes.create.url() }] };
