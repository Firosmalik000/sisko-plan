import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Coins, Globe2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type CountryOption = {
    code: string;
    name: string;
    currency: { code: string; name: string; symbol: string };
};

export default function CreateStore({ countries, defaultCountry }: { countries: CountryOption[]; defaultCountry: string }) {
    const [countryCode, setCountryCode] = useState(defaultCountry);
    const currency = countries.find((country) => country.code === countryCode)?.currency;

    return (
        <>
            <Head title="Buat Toko" />
            <div className="min-h-full bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto w-full max-w-xl">
                    <Card className="rounded-[1.35rem] border-[var(--app-ink)]/8 py-5 shadow-sm">
                        <CardContent className="space-y-5 px-4 sm:px-5">
                            <div>
                                <Link
                                    href="/stores"
                                    className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeft className="size-4" />
                                    Daftar toko
                                </Link>
                                <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--app-ink)]">Buat Toko</h1>
                            </div>
                            <Form action="/stores" method="post" className="space-y-4">
                                {({ processing, errors }) => (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Nama toko</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                placeholder="Contoh: Toko Berkah Utama"
                                                autoFocus
                                                required
                                                maxLength={120}
                                                className="h-11"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="country">Negara toko</Label>
                                                <div className="relative">
                                                    <Globe2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                                    <select
                                                        id="country"
                                                        name="country"
                                                        value={countryCode}
                                                        onChange={(event) => setCountryCode(event.target.value)}
                                                        required
                                                        className="h-11 w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                                    >
                                                        {countries.map((country) => (
                                                            <option key={country.code} value={country.code}>
                                                                {country.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <InputError message={errors.country} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Mata uang</Label>
                                                <div className="flex h-11 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm font-semibold">
                                                    <Coins className="size-4 text-muted-foreground" />
                                                    {currency ? `${currency.code} (${currency.symbol})` : '-'}
                                                </div>
                                            </div>
                                        </div>
                                        <Button disabled={processing} className="h-11 w-full bg-emerald-700 hover:bg-emerald-800">
                                            {processing && <Spinner />}
                                            Buat toko dan lanjutkan
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

CreateStore.layout = {
    breadcrumbs: [{ title: 'Buat toko', href: '/stores/create' }],
};
