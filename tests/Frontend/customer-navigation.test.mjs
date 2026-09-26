import assert from 'node:assert/strict';
import test from 'node:test';
import { customerPageParent } from '../../resources/js/layouts/customer/customer-page-parent.ts';
import { customerNavigationContract } from '../../resources/js/layouts/customer/navigation-contract.ts';

test('customer navigation exposes cashier as a launcher between products and transactions', () => {
    assert.deepEqual(
        customerNavigationContract.map(({ key, kind }) => ({ key, kind })),
        [
            { key: 'home', kind: 'link' },
            { key: 'products', kind: 'link' },
            { key: 'cashier', kind: 'launcher' },
            { key: 'transactions', kind: 'link' },
            { key: 'more', kind: 'link' },
        ],
    );
});

test('cashier launcher preserves scan and manual checkout entry points', () => {
    const cashier = customerNavigationContract.find((item) => item.key === 'cashier');

    assert.ok(cashier && cashier.kind === 'launcher');
    assert.deepEqual(cashier.options, [
        { key: 'scan', title: 'Scan barcode', description: 'Open the camera and scan products.' },
        { key: 'manual', title: 'Select manually', description: 'Browse products and build the cart.' },
    ]);
});

test('top-level destinations have no back button while more destinations return to More', () => {
    for (const path of ['/dashboard', '/master-data/products', '/pos', '/sales', '/more']) {
        assert.equal(customerPageParent(path), null);
    }

    assert.deepEqual(customerPageParent('/operations/inventory'), { destination: 'more', label: 'More', title: 'Inventory' });
    assert.deepEqual(customerPageParent('/master-data/categories'), { destination: 'more', label: 'More', title: 'Category' });
    assert.deepEqual(customerPageParent('/reports'), { destination: 'more', label: 'More', title: 'Business reports' });
    assert.deepEqual(customerPageParent('/team'), { destination: 'more', label: 'More', title: 'Staff & checkout' });
    assert.deepEqual(customerPageParent('/registers'), { destination: 'more', label: 'More', title: 'Staff & checkout' });
    assert.deepEqual(customerPageParent('/team/activity'), { destination: 'more', label: 'More', title: 'Staff & checkout' });
});

test('compact detail pages return to their owning list from the top bar', () => {
    assert.deepEqual(customerPageParent('/sales/sale-123'), {
        destination: 'sales',
        label: 'Transactions',
        title: 'Transaction details',
    });
    assert.deepEqual(customerPageParent('/operations/stock-opnames/count-123'), {
        destination: 'stockCounts',
        label: 'Stock count',
        title: 'Stock count details',
    });
    assert.deepEqual(customerPageParent('/stores/create'), {
        destination: 'stores',
        label: 'Stores & team',
        title: 'Create store',
    });
    assert.deepEqual(customerPageParent('/stores/store-123'), {
        destination: 'stores',
        label: 'Stores & team',
        title: 'Store details',
    });
    assert.deepEqual(customerPageParent('/team/member-123'), {
        destination: 'team',
        label: 'Staff & checkout',
        title: 'Staff',
    });
});

test('the return sales form returns to transactions from the compact top bar', () => {
    assert.deepEqual(customerPageParent('/sales/sale-123/returns/create'), {
        destination: 'sales',
        label: 'Transactions',
        title: 'Return sales',
    });
});
