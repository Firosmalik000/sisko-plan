import assert from 'node:assert/strict';
import test from 'node:test';
import { enCustomerCatalog } from '../../resources/js/lang/en/customer.ts';
import { filCustomerCatalog } from '../../resources/js/lang/fil/customer.ts';
import { idCustomerCatalog } from '../../resources/js/lang/id/customer.ts';
import { kmCustomerCatalog } from '../../resources/js/lang/km/customer.ts';
import { loCustomerCatalog } from '../../resources/js/lang/lo/customer.ts';
import { msCustomerCatalog } from '../../resources/js/lang/ms/customer.ts';
import { myCustomerCatalog } from '../../resources/js/lang/my/customer.ts';
import { tetCustomerCatalog } from '../../resources/js/lang/tet/customer.ts';
import { thCustomerCatalog } from '../../resources/js/lang/th/customer.ts';
import { viCustomerCatalog } from '../../resources/js/lang/vi/customer.ts';

const customerCatalogs = {
    en: enCustomerCatalog,
    id: idCustomerCatalog,
    ms: msCustomerCatalog,
    fil: filCustomerCatalog,
    vi: viCustomerCatalog,
    km: kmCustomerCatalog,
    lo: loCustomerCatalog,
    my: myCustomerCatalog,
    tet: tetCustomerCatalog,
    th: thCustomerCatalog,
};

const localizedKeys = [
    'Search products, sales, and more',
    'Global search',
    'Filter products',
    'Cashier',
    'Start transaction',
    'Transaction details',
    'Stock count details',
    'Store details',
];

test('new customer UI is localized for every configured non-English locale', () => {
    for (const locale of ['id', 'ms', 'fil', 'vi', 'km', 'lo', 'my', 'tet', 'th']) {
        for (const key of localizedKeys) {
            assert.notEqual(customerCatalogs[locale][key], customerCatalogs.en[key], `${locale}.${key}`);
        }
    }
});
