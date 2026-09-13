const moreDestinations: ReadonlyMap<string, string> = new Map([
    ['/operations/inventory', 'Inventory'],
    ['/operations/stock-opnames', 'Stock count'],
    ['/purchasing', 'Purchases'],
    ['/master-data/suppliers', 'Suppliers'],
    ['/operations/cash', 'Cash & bank'],
    ['/expenses', 'Expenses'],
    ['/operations/capital', 'Capital'],
    ['/reports', 'Business reports'],
    ['/master-data/categories', 'Category'],
    ['/master-data/units', 'Unit'],
    ['/master-data/financial-accounts', 'Account keuangan'],
    ['/stores', 'Stores & team'],
    ['/subscription', 'Subscriptions'],
    ['/settings/profile', 'Settings'],
    ['/settings/security', 'Security'],
    ['/settings/appearance', 'Appearance'],
] as const);

export type CustomerParentDestination = 'more' | 'sales' | 'stockCounts' | 'stores';

export function customerPageParent(pathname: string): { destination: CustomerParentDestination; label: string; title: string } | null {
    const title = moreDestinations.get(pathname);

    if (title) {
        return { destination: 'more', label: 'More', title };
    }

    if (/^\/sales\/[^/]+\/returns\/create$/.test(pathname)) {
        return { destination: 'sales', label: 'Transactions', title: 'Return sales' };
    }

    if (/^\/sales\/[^/]+$/.test(pathname)) {
        return { destination: 'sales', label: 'Transactions', title: 'Transaction details' };
    }

    if (/^\/operations\/stock-opnames\/[^/]+$/.test(pathname)) {
        return { destination: 'stockCounts', label: 'Stock count', title: 'Stock count details' };
    }

    if (pathname === '/stores/create') {
        return { destination: 'stores', label: 'Stores & team', title: 'Create store' };
    }

    if (/^\/stores\/[^/]+$/.test(pathname)) {
        return { destination: 'stores', label: 'Stores & team', title: 'Store details' };
    }

    return null;
}
