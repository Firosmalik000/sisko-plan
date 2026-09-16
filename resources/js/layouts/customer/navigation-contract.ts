export const customerNavigationContract = [
    { key: 'home', kind: 'link', title: 'Home', capability: 'sales.checkout' },
    { key: 'products', kind: 'link', title: 'Product', capability: 'catalog.manage' },
    {
        key: 'cashier',
        kind: 'launcher',
        title: 'Cashier',
        capability: 'sales.checkout',
        options: [
            {
                key: 'scan',
                title: 'Scan barcode',
                description: 'Open the camera and scan products.',
            },
            {
                key: 'manual',
                title: 'Select manually',
                description: 'Browse products and build the cart.',
            },
        ],
    },
    { key: 'transactions', kind: 'link', title: 'Transactions', capability: 'sales.view-all' },
    { key: 'more', kind: 'link', title: 'More' },
] as const;
