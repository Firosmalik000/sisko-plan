export type CustomerBackTarget = {
    href: string;
    label: string;
};

function salesQuery(searchParams: URLSearchParams): string {
    const query = new URLSearchParams();

    ['period', 'view', 'from'].forEach((key) => {
        const value = searchParams.get(key);

        if (value) {
            query.set(key, value);
        }
    });

    return query.size ? `?${query}` : '';
}

export function customerBackTarget(pathname: string, searchParams: URLSearchParams): CustomerBackTarget | null {
    if (pathname === '/sales' && searchParams.get('from') === 'pos') {
        return { href: '/pos', label: 'Kembali ke kasir' };
    }

    const returnMatch = pathname.match(/^\/sales\/([^/]+)\/returns\/create$/);

    if (returnMatch) {
        return {
            href: `/sales/${returnMatch[1]}${salesQuery(searchParams)}`,
            label: 'Kembali ke invoice',
        };
    }

    if (/^\/sales\/[^/]+$/.test(pathname)) {
        return {
            href: `/sales${salesQuery(searchParams)}`,
            label: 'Kembali ke transaksi',
        };
    }

    if (/^\/operations\/stock-opnames\/[^/]+$/.test(pathname)) {
        return {
            href: '/operations/stock-opnames',
            label: 'Kembali ke stok opname',
        };
    }

    const appSubpages = [
        '/pos',
        '/purchasing',
        '/operations/inventory',
        '/operations/stock-opnames',
        '/operations/cash',
        '/operations/capital',
        '/master-data/suppliers',
        '/master-data/categories',
        '/master-data/units',
        '/master-data/financial-accounts',
        '/expenses',
        '/reports',
        '/stores',
        '/subscription',
        '/settings',
    ];

    return appSubpages.some((path) => pathname.startsWith(path)) ? { href: '/dashboard', label: 'Kembali ke beranda' } : null;
}
