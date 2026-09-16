import { Form, Head } from '@inertiajs/react';
import { CreditCard, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import marketplaceRoutes from '@/routes/super-admin/commerce/marketplaces';
import paymentMethodRoutes from '@/routes/super-admin/commerce/payment-methods';

type Reference = { code: string; label: string; is_active: boolean; is_enabled: boolean };
type Country = { code: string; name: string; payment_methods: Reference[]; marketplaces: Reference[] };

export default function CommerceIndex({ countries }: { countries: Country[] }) {
    return (
        <>
            <Head title="Commerce references" />
            <header className="platform-enter">
                <p className="platform-kicker">Regional configuration</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3b211b]">Commerce references</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Control country availability without changing historical transaction snapshots.
                </p>
            </header>
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
                {countries.map((country) => (
                    <section key={country.code} className="platform-panel overflow-hidden">
                        <div className="border-b border-slate-900/8 px-4 py-4 sm:px-5">
                            <h2 className="font-black">
                                {country.name} <span className="text-xs text-slate-500">{country.code}</span>
                            </h2>
                        </div>
                        <ReferenceList
                            icon={CreditCard}
                            title="Payment methods"
                            country={country.code}
                            items={country.payment_methods}
                            route={(code) => paymentMethodRoutes.update.url(code)}
                        />
                        <ReferenceList
                            icon={ShoppingBag}
                            title="Marketplaces"
                            country={country.code}
                            items={country.marketplaces}
                            route={(code) => marketplaceRoutes.update.url(code)}
                        />
                    </section>
                ))}
            </div>
        </>
    );
}

function ReferenceList({
    icon: Icon,
    title,
    country,
    items,
    route,
}: {
    icon: typeof CreditCard;
    title: string;
    country: string;
    items: Reference[];
    route: (code: string) => string;
}) {
    return (
        <div className="border-b border-slate-900/8 p-4 last:border-b-0 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-black">
                <Icon className="size-4 text-[#d83f22]" />
                {title}
            </h3>
            <div className="mt-3 space-y-2">
                {items.map((item) => (
                    <Form
                        key={item.code}
                        action={route(item.code)}
                        method="patch"
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-900/10 px-3"
                    >
                        <input type="hidden" name="country_code" value={country} />
                        <input type="hidden" name="is_enabled" value={item.is_enabled ? '0' : '1'} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{item.label}</p>
                            <p className="text-xs text-slate-500">
                                {item.code} · {item.is_active ? 'active' : 'inactive'}
                            </p>
                        </div>
                        <Button size="sm" variant="outline">
                            {item.is_enabled ? 'Disable' : 'Enable'}
                        </Button>
                    </Form>
                ))}
            </div>
        </div>
    );
}
