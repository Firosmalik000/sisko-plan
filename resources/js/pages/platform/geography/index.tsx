import { Form, Head } from '@inertiajs/react';
import { Coins, Globe2, Save } from 'lucide-react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { translate } from '@/lib/i18n';

type Currency = {
    code: string;
    name: string;
    symbol: string;
    decimal_places: number;
    symbol_position: 'before' | 'after';
    is_active: boolean;
    countries_count: number;
};
type Country = {
    code: string;
    name: string;
    currency_code: string;
    default_timezone: string;
    is_active: boolean;
    stores_count: number;
};

export default function GeographyIndex({
    countries,
    currencies,
    can_manage,
}: {
    countries: Country[];
    currencies: Currency[];
    can_manage: boolean;
}) {
    return (
        <>
            <Head title="Countries & Currencies" />
            <header className="platform-enter">
                <h1 className="text-3xl font-black tracking-tight text-[#3b211b]">Countries & currencies</h1>
            </header>

            <section className="platform-panel mt-5 overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-900/8 px-4 py-4 sm:px-5">
                    <Globe2 className="size-5 text-[#d83f22]" />
                    <h2 className="font-black">Store country</h2>
                </div>
                {can_manage && (
                    <Form
                        action="/super-admin/geography/countries"
                        method="post"
                        className="grid gap-3 border-b border-slate-900/8 bg-[#fffaf7] p-4 sm:grid-cols-2 xl:grid-cols-[90px_1fr_150px_1fr_auto]"
                    >
                        {({ processing, errors }) => (
                            <>
                                <CreateField label="Code" htmlFor="new-country-code">
                                    <Input
                                        id="new-country-code"
                                        name="code"
                                        placeholder="ID"
                                        maxLength={2}
                                        required
                                        className="h-11 uppercase"
                                    />
                                </CreateField>
                                <CreateField label="Name" htmlFor="new-country-name">
                                    <Input id="new-country-name" name="name" placeholder="Singapore" required className="h-11" />
                                </CreateField>
                                <CreateField label="Time zone" htmlFor="new-country-timezone">
                                    <Input
                                        id="new-country-timezone"
                                        name="default_timezone"
                                        placeholder="Asia/Singapore"
                                        required
                                        className="h-11"
                                    />
                                </CreateField>
                                <CreateField label="Currency" htmlFor="new-country-currency">
                                    <select
                                        id="new-country-currency"
                                        name="currency_code"
                                        required
                                        className="h-11 rounded-md border border-input bg-white px-2"
                                    >
                                        {currencies
                                            .filter((item) => item.is_active)
                                            .map((item) => (
                                                <option key={item.code} value={item.code}>
                                                    {item.code}
                                                </option>
                                            ))}
                                    </select>
                                </CreateField>
                                <Button disabled={processing} className="h-11 self-end">
                                    <Globe2 /> Add
                                </Button>
                                <InputError className="sm:col-span-2 xl:col-span-5" message={Object.values(errors)[0]} />
                            </>
                        )}
                    </Form>
                )}
                <div className="divide-y divide-slate-900/8 xl:hidden">
                    {countries.map((country) => (
                        <CountryCard key={country.code} country={country} currencies={currencies} canManage={can_manage} />
                    ))}
                </div>
                <div className="hidden overflow-x-auto xl:block">
                    <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Currency</th>
                                <th className="px-4 py-3">Time zone</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Store</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/8">
                            {countries.map((country) => (
                                <CountryRow key={country.code} country={country} currencies={currencies} canManage={can_manage} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="platform-panel mt-5 overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-900/8 px-4 py-4 sm:px-5">
                    <Coins className="size-5 text-[#d83f22]" />
                    <h2 className="font-black">Currency format</h2>
                </div>
                {can_manage && (
                    <Form
                        action="/super-admin/geography/currencies"
                        method="post"
                        className="grid gap-3 border-b border-slate-900/8 bg-[#fffaf7] p-4 sm:grid-cols-2 xl:grid-cols-[90px_1fr_100px_100px_130px_auto]"
                    >
                        {({ processing, errors }) => (
                            <>
                                <CreateField label="Code" htmlFor="new-currency-code">
                                    <Input
                                        id="new-currency-code"
                                        name="code"
                                        placeholder="USD"
                                        maxLength={3}
                                        required
                                        className="h-11 uppercase"
                                    />
                                </CreateField>
                                <CreateField label="Name" htmlFor="new-currency-name">
                                    <Input id="new-currency-name" name="name" required className="h-11" />
                                </CreateField>
                                <CreateField label="Symbol" htmlFor="new-currency-symbol">
                                    <Input id="new-currency-symbol" name="symbol" placeholder="$" required className="h-11" />
                                </CreateField>
                                <CreateField label="Decimal" htmlFor="new-currency-decimals">
                                    <Input
                                        id="new-currency-decimals"
                                        name="decimal_places"
                                        type="number"
                                        min={0}
                                        max={4}
                                        defaultValue={2}
                                        required
                                        className="h-11"
                                    />
                                </CreateField>
                                <CreateField label="Position" htmlFor="new-currency-position">
                                    <select
                                        id="new-currency-position"
                                        name="symbol_position"
                                        defaultValue="before"
                                        className="h-11 rounded-md border border-input bg-white px-2"
                                    >
                                        <option value="before">Front</option>
                                        <option value="after">Rear</option>
                                    </select>
                                </CreateField>
                                <Button disabled={processing} className="h-11 self-end">
                                    <Coins /> Add
                                </Button>
                                <InputError className="sm:col-span-2 xl:col-span-6" message={Object.values(errors)[0]} />
                            </>
                        )}
                    </Form>
                )}
                <div className="divide-y divide-slate-900/8 xl:hidden">
                    {currencies.map((currency) => (
                        <CurrencyCard key={currency.code} currency={currency} canManage={can_manage} />
                    ))}
                </div>
                <div className="hidden overflow-x-auto xl:block">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <th className="px-4 py-3">Code</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Symbol</th>
                                <th className="px-4 py-3">Decimal</th>
                                <th className="px-4 py-3">Position</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/8">
                            {currencies.map((currency) => (
                                <CurrencyRow key={currency.code} currency={currency} canManage={can_manage} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}

function CreateField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={htmlFor} className="text-xs font-bold">
                {translate(label)}
            </Label>
            {children}
        </div>
    );
}

function CountryCard({ country, currencies, canManage }: { country: Country; currencies: Currency[]; canManage: boolean }) {
    const prefix = `mobile-country-${country.code}`;

    return (
        <Form action={`/super-admin/geography/countries/${country.code}`} method="patch" className="grid gap-3 p-4">
            {({ processing, errors }) => (
                <>
                    <div className="flex items-center justify-between gap-3">
                        <strong>{country.code}</strong>
                        <Badge variant="outline">{country.stores_count} stores</Badge>
                    </div>
                    <CreateField label="Name" htmlFor={`${prefix}-name`}>
                        <Input id={`${prefix}-name`} name="name" defaultValue={country.name} disabled={!canManage} className="h-11" />
                    </CreateField>
                    <CreateField label="Time zone" htmlFor={`${prefix}-timezone`}>
                        <Input
                            id={`${prefix}-timezone`}
                            name="default_timezone"
                            defaultValue={country.default_timezone}
                            disabled={!canManage}
                            className="h-11"
                        />
                    </CreateField>
                    <div className="grid grid-cols-2 gap-3">
                        <CreateField label="Currency" htmlFor={`${prefix}-currency`}>
                            <select
                                id={`${prefix}-currency`}
                                name="currency_code"
                                defaultValue={country.currency_code}
                                disabled={!canManage}
                                className="h-11 w-full rounded-md border border-input bg-white px-2"
                            >
                                {currencies
                                    .filter((item) => item.is_active || item.code === country.currency_code)
                                    .map((item) => (
                                        <option key={item.code} value={item.code}>
                                            {item.code} ({item.symbol})
                                        </option>
                                    ))}
                            </select>
                        </CreateField>
                        <CreateField label="Status" htmlFor={`${prefix}-status`}>
                            <select
                                id={`${prefix}-status`}
                                name="is_active"
                                defaultValue={country.is_active ? '1' : '0'}
                                disabled={!canManage}
                                className="h-11 w-full rounded-md border border-input bg-white px-2"
                            >
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </CreateField>
                    </div>
                    {canManage && (
                        <Button disabled={processing} className="h-11 w-full">
                            <Save /> Save
                        </Button>
                    )}
                    <InputError message={Object.values(errors)[0]} />
                </>
            )}
        </Form>
    );
}

function CurrencyCard({ currency, canManage }: { currency: Currency; canManage: boolean }) {
    const prefix = `mobile-currency-${currency.code}`;

    return (
        <Form action={`/super-admin/geography/currencies/${currency.code}`} method="patch" className="grid gap-3 p-4">
            {({ processing, errors }) => (
                <>
                    <div className="flex items-center justify-between gap-3">
                        <strong>{currency.code}</strong>
                        <Badge variant="outline">
                            {currency.countries_count} {translate('country')}
                        </Badge>
                    </div>
                    <CreateField label="Name" htmlFor={`${prefix}-name`}>
                        <Input id={`${prefix}-name`} name="name" defaultValue={currency.name} disabled={!canManage} className="h-11" />
                    </CreateField>
                    <div className="grid grid-cols-2 gap-3">
                        <CreateField label="Symbol" htmlFor={`${prefix}-symbol`}>
                            <Input
                                id={`${prefix}-symbol`}
                                name="symbol"
                                defaultValue={currency.symbol}
                                disabled={!canManage}
                                className="h-11"
                            />
                        </CreateField>
                        <CreateField label="Decimal" htmlFor={`${prefix}-decimals`}>
                            <Input
                                id={`${prefix}-decimals`}
                                name="decimal_places"
                                type="number"
                                min={0}
                                max={4}
                                defaultValue={currency.decimal_places}
                                disabled={!canManage}
                                className="h-11"
                            />
                        </CreateField>
                        <CreateField label="Position" htmlFor={`${prefix}-position`}>
                            <select
                                id={`${prefix}-position`}
                                name="symbol_position"
                                defaultValue={currency.symbol_position}
                                disabled={!canManage}
                                className="h-11 w-full rounded-md border border-input bg-white px-2"
                            >
                                <option value="before">Front</option>
                                <option value="after">Rear</option>
                            </select>
                        </CreateField>
                        <CreateField label="Status" htmlFor={`${prefix}-status`}>
                            <select
                                id={`${prefix}-status`}
                                name="is_active"
                                defaultValue={currency.is_active ? '1' : '0'}
                                disabled={!canManage}
                                className="h-11 w-full rounded-md border border-input bg-white px-2"
                            >
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </CreateField>
                    </div>
                    {canManage && (
                        <Button disabled={processing} className="h-11 w-full">
                            <Save /> Save
                        </Button>
                    )}
                    <InputError message={Object.values(errors)[0]} />
                </>
            )}
        </Form>
    );
}

function CountryRow({ country, currencies, canManage }: { country: Country; currencies: Currency[]; canManage: boolean }) {
    const formId = `country-${country.code}`;

    return (
        <tr>
            <td className="px-4 py-3 font-black">{country.code}</td>
            <td className="px-2 py-2">
                <Input
                    form={formId}
                    name="name"
                    defaultValue={country.name}
                    disabled={!canManage}
                    aria-label={`Name${country.code}`}
                    className="h-11"
                />
            </td>
            <td className="px-2 py-2">
                <select
                    form={formId}
                    name="currency_code"
                    defaultValue={country.currency_code}
                    disabled={!canManage}
                    aria-label={`Currency${country.code}`}
                    className="h-11 w-full rounded-md border border-input bg-white px-2"
                >
                    {currencies
                        .filter((item) => item.is_active || item.code === country.currency_code)
                        .map((item) => (
                            <option key={item.code} value={item.code}>
                                {item.code} ({item.symbol})
                            </option>
                        ))}
                </select>
            </td>
            <td className="px-2 py-2">
                <Input
                    form={formId}
                    name="default_timezone"
                    defaultValue={country.default_timezone}
                    disabled={!canManage}
                    aria-label={`Time zone${country.code}`}
                    className="h-11"
                />
            </td>
            <td className="px-2 py-2">
                <select
                    form={formId}
                    name="is_active"
                    defaultValue={country.is_active ? '1' : '0'}
                    disabled={!canManage}
                    aria-label={`Status ${country.code}`}
                    className="h-11 rounded-md border border-input bg-white px-2"
                >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                </select>
            </td>
            <td className="px-4 py-3">
                <Badge variant="outline">{country.stores_count}</Badge>
            </td>
            <td className="px-3 py-2">
                <Form id={formId} action={`/super-admin/geography/countries/${country.code}`} method="patch">
                    {({ processing, errors }) => (
                        <>
                            <Button size="sm" disabled={!canManage || processing} className="h-11">
                                <Save /> Save
                            </Button>
                            <InputError message={Object.values(errors)[0]} />
                        </>
                    )}
                </Form>
            </td>
        </tr>
    );
}

function CurrencyRow({ currency, canManage }: { currency: Currency; canManage: boolean }) {
    const formId = `currency-${currency.code}`;

    return (
        <tr>
            <td className="px-4 py-3 font-black">{currency.code}</td>
            <td className="px-2 py-2">
                <Input
                    form={formId}
                    name="name"
                    defaultValue={currency.name}
                    disabled={!canManage}
                    aria-label={`Name${currency.code}`}
                    className="h-11"
                />
            </td>
            <td className="px-2 py-2">
                <Input
                    form={formId}
                    name="symbol"
                    defaultValue={currency.symbol}
                    disabled={!canManage}
                    aria-label={`Symbol${currency.code}`}
                    className="h-11 w-24"
                />
            </td>
            <td className="px-2 py-2">
                <Input
                    form={formId}
                    name="decimal_places"
                    type="number"
                    min={0}
                    max={4}
                    defaultValue={currency.decimal_places}
                    disabled={!canManage}
                    aria-label={`Decimal${currency.code}`}
                    className="h-11 w-24"
                />
            </td>
            <td className="px-2 py-2">
                <select
                    form={formId}
                    name="symbol_position"
                    defaultValue={currency.symbol_position}
                    disabled={!canManage}
                    aria-label={`Symbol position${currency.code}`}
                    className="h-11 rounded-md border border-input bg-white px-2"
                >
                    <option value="before">Front</option>
                    <option value="after">Rear</option>
                </select>
            </td>
            <td className="px-2 py-2">
                <select
                    form={formId}
                    name="is_active"
                    defaultValue={currency.is_active ? '1' : '0'}
                    disabled={!canManage}
                    aria-label={`Status ${currency.code}`}
                    className="h-11 rounded-md border border-input bg-white px-2"
                >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                </select>
            </td>
            <td className="px-3 py-2">
                <Form id={formId} action={`/super-admin/geography/currencies/${currency.code}`} method="patch">
                    {({ processing, errors }) => (
                        <>
                            <Button size="sm" disabled={!canManage || processing} className="h-11">
                                <Save /> Save
                            </Button>
                            <InputError message={Object.values(errors)[0]} />
                        </>
                    )}
                </Form>
            </td>
        </tr>
    );
}
