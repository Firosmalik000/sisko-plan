import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('accounting and retail terms are localized without Indonesian abbreviations', () => {
    const english = source('../../resources/js/lang/en/customer.ts');
    const malay = source('../../resources/js/lang/ms/customer.ts');
    const vietnameseCustomer = source('../../resources/js/lang/vi/customer.ts');

    assert.match(english, /'Cost of goods sold': 'Cost of goods sold'/u);
    assert.match(english, /'Average unit cost': 'Average unit cost'/u);
    assert.match(malay, /'Cost of goods sold': 'Kos barang dijual'/u);
    assert.match(malay, /'Average unit cost': 'Purata kos seunit'/u);
    assert.match(vietnameseCustomer, /'Cost of goods sold': 'Giá vốn hàng bán'/u);
    assert.match(vietnameseCustomer, /'Average unit cost': 'Giá vốn bình quân\/đơn vị'/u);
});

test('Vietnamese landing demo products are localized and included in the catalog', () => {
    const catalog = source('../../resources/js/lang/vi/index.ts');
    const publicCatalog = source('../../resources/js/lang/vi/public.ts');

    assert.match(catalog, /\.\.\.viPublicCatalog/u);
    assert.match(publicCatalog, /'Cooking Oil 2 L': 'Dầu ăn 2 L'/u);
});

test('standard cash payment labels are localized', () => {
    const malay = source('../../resources/js/lang/ms/shared.ts');
    const vietnamese = source('../../resources/js/lang/vi/shared.ts');

    assert.match(malay, /Cash: 'Tunai'/u);
    assert.match(vietnamese, /Cash: 'Tiền mặt'/u);
});
