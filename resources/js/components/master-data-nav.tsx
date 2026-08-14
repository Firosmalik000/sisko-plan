import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const links = [
    { label: 'Produk', href: '/master-data/products' },
    { label: 'Kategori', href: '/master-data/categories' },
    { label: 'Satuan', href: '/master-data/units' },
    { label: 'Supplier', href: '/master-data/suppliers' },
    { label: 'Kas & rekening', href: '/master-data/financial-accounts' },
];

export function MasterDataNav() {
    const { url } = usePage();

    return (
        <nav
            className="flex gap-2 overflow-x-auto pb-1"
            aria-label="Master data"
        >
            {links.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
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
