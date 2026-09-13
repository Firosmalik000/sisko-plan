export const customerNavigationContract = [
    { key: 'home', kind: 'link', title: 'Home' },
    { key: 'products', kind: 'link', title: 'Product' },
    {
        key: 'cashier',
        kind: 'launcher',
        title: 'Cashier',
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
    { key: 'transactions', kind: 'link', title: 'Transactions' },
    { key: 'more', kind: 'link', title: 'More' },
] as const;
