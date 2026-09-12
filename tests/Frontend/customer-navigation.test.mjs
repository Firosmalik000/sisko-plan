import assert from 'node:assert/strict';
import test from 'node:test';
import { customerBackTarget } from '../../resources/js/layouts/customer/customer-back-target.ts';

test('sales back navigation preserves list context', () => {
    const invoice = customerBackTarget('/sales/SALE-1', new URLSearchParams('period=month&view=returns&from=pos'));
    const returns = customerBackTarget('/sales/SALE-1/returns/create', new URLSearchParams('period=month&from=pos'));

    assert.deepEqual(invoice, {
        href: '/sales?period=month&view=returns&from=pos',
        label: 'Kembali ke transaksi',
    });
    assert.deepEqual(returns, {
        href: '/sales/SALE-1?period=month&from=pos',
        label: 'Kembali ke invoice',
    });
});

test('customer subpages return to their expected parent', () => {
    assert.deepEqual(customerBackTarget('/sales', new URLSearchParams('from=pos')), {
        href: '/pos',
        label: 'Kembali ke kasir',
    });
    assert.deepEqual(customerBackTarget('/operations/stock-opnames/COUNT-1', new URLSearchParams()), {
        href: '/operations/stock-opnames',
        label: 'Kembali ke stok opname',
    });
    assert.deepEqual(customerBackTarget('/purchasing', new URLSearchParams()), {
        href: '/dashboard',
        label: 'Kembali ke beranda',
    });
    assert.equal(customerBackTarget('/dashboard', new URLSearchParams()), null);
});
