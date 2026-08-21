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
    { label: 'Stock opname', href: '/operations/stock-opnames' },
    { label: 'Kas & akun', href: '/operations/cash' },
    { label: 'Modal pemilik', href: '/operations/capital' },
];

export function OperationsShell({
    active,
    title,
    children,
}: {
    active: string;
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="min-h-full bg-[linear-gradient(180deg,#f8faf6_0%,#f2f5f0_100%)] px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-4">
                <header className="rounded-[1.35rem] border border-[#173c35]/8 bg-white px-4 py-4 shadow-sm sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-2xl font-black tracking-[-0.04em] text-[#173c35]">
                            {title}
                        </h1>
                        <nav className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
                            {tabs.map((tab) => (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition ${
                                        active === tab.href
                                            ? 'bg-[#173f35] text-white'
                                            : 'bg-[#eef3ef] text-[#5f746d] hover:bg-[#e3ece7]'
                                    }`}
                                >
                                    {tab.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </header>
                {children}
            </div>
        </div>
    );
}

export function LedgerCard({
    title,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[1.35rem] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-black tracking-[-0.025em] text-stone-900">
                {title}
            </h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

export const fieldClass =
    'h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15';
export const buttonClass =
    'h-10 rounded-xl bg-teal-700 px-4 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50';
