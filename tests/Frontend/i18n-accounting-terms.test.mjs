import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('accounting and retail terms are localized without Indonesian abbreviations', () => {
    const english = source('../../resources/js/lang/en/application.ts');
    const malay = source('../../resources/js/lang/ms/reviewed.ts');
    const vietnameseCustomer = source('../../resources/js/lang/vi/customer.ts');
    const vietnameseExtended = source('../../resources/js/lang/vi/extended.ts');

    assert.match(english, /HPP: 'COGS'/u);
    assert.match(english, /'HPP rata-rata\/unit': 'Average unit cost'/u);
    assert.match(malay, /HPP: 'Kos barang dijual'/u);
    assert.match(malay, /'HPP rata-rata\/unit': 'Purata kos seunit'/u);
    assert.match(malay, /'Harga jual per 1 ecer': 'Harga jualan seunit runcit'/u);
    assert.match(vietnameseCustomer, /HPP: 'Giá vốn hàng bán'/u);
    assert.match(vietnameseExtended, /'HPP rata-rata\/unit': 'Giá vốn bình quân\/đơn vị'/u);
});

test('Vietnamese landing demo products are localized and included in the catalog', () => {
    const catalog = source('../../resources/js/lang/vi/index.ts');
    const publicCatalog = source('../../resources/js/lang/vi/public.ts');

    assert.match(catalog, /\.\.\.vietnamesePublicCatalog/u);
    assert.match(publicCatalog, /'Beras Premium 5 kg': 'Gạo cao cấp 5 kg'/u);
    assert.match(publicCatalog, /'Minyak Goreng 2 L': 'Dầu ăn 2 L'/u);
    assert.match(publicCatalog, /'Gula Pasir 1 kg': 'Đường cát 1 kg'/u);
});

test('standard cash payment labels are localized', () => {
    const malay = source('../../resources/js/lang/ms/reviewed.ts');
    const vietnamese = source('../../resources/js/lang/vi/customer.ts');

    assert.match(malay, /Cash: 'Tunai'/u);
    assert.match(vietnamese, /Cash: 'Tiền mặt'/u);
});
