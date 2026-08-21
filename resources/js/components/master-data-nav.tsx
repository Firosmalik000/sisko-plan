import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const links = [
    { label: 'Produk', href: '/master-data/products' },
    { label: 'Kategori', href: '/master-data/categories' },
    { label: 'Satuan', href: '/master-data/units' },
    { label: 'Supplier', href: '/master-data/suppliers' },
    { label: 'Kas & rekening', href: '/master-data/financial-accounts' },
];

type MasterDataLink = (typeof links)[number];

export function MasterDataNav({
    links: visibleLinks = links,
}: {
    links?: MasterDataLink[];
}) {
    const { url } = usePage();

    return (
        <nav
            className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5"
            aria-label="Master data"
        >
            {visibleLinks.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                        'shrink-0 rounded-xl border px-3 py-1.5 text-xs font-bold transition',
                        url.startsWith(link.href)
                            ? 'border-emerald-800 bg-emerald-800 text-white'
                            : 'border-stone-200 bg-white/70 text-stone-600 hover:border-emerald-700 hover:text-emerald-800',
                    )}
                >
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}
