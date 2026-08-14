import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

export const money = (value: string | number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));

export const quantity = (value: string | number) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: 6 }).format(
        Number(value),
    );

export const currentDateTime = (timezone: string) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    })
        .formatToParts(new Date())
        .reduce<Record<string, string>>((values, part) => {
            values[part.type] = part.value;

            return values;
        }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const ledgerDateTime = (value: string, timezone: string) =>
    new Intl.DateTimeFormat('id-ID', {
        timeZone: timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));

export const postingToken = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        const value = character === 'x' ? random : (random & 0x3) | 0x8;

        return value.toString(16);
    });

const tabs = [
    { label: 'Inventory', href: '/operations/inventory' },
    { label: 'Kas & akun', href: '/operations/cash' },
    { label: 'Modal pemilik', href: '/operations/capital' },
];

export function OperationsShell({
    active,
    eyebrow,
    title,
    description,
    children,
}: {
    active: string;
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.12),transparent_32%),linear-gradient(135deg,#fffdf7_0%,#f8faf7_48%,#f0fdfa_100%)] p-4 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="overflow-hidden rounded-3xl border border-stone-200/80 bg-stone-950 px-6 py-7 text-stone-50 shadow-xl shadow-stone-950/10 md:px-9">
                    <p className="text-xs font-bold tracking-[0.24em] text-amber-400 uppercase">
                        {eyebrow}
                    </p>
                    <div className="mt-3 max-w-3xl">
                        <h1 className="font-serif text-3xl tracking-tight md:text-5xl">
                            {title}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300 md:text-base">
                            {description}
                        </p>
                    </div>
                    <nav className="mt-7 flex flex-wrap gap-2">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                                    active === tab.href
                                        ? 'bg-amber-400 text-stone-950'
                                        : 'bg-white/10 text-stone-200 hover:bg-white/15'
                                }`}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </nav>
                </header>
                {children}
            </div>
        </div>
    );
}

export function LedgerCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm backdrop-blur md:p-7">
            <h2 className="font-serif text-2xl text-stone-900">{title}</h2>
            {description && (
                <p className="mt-1 text-sm text-stone-500">{description}</p>
            )}
            <div className="mt-5">{children}</div>
        </section>
    );
}

export const fieldClass =
    'h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15';
export const buttonClass =
    'h-11 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50';
