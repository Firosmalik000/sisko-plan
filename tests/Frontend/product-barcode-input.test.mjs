import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../resources/js/features/customer/products/products-page.tsx', import.meta.url), 'utf8');

test('product barcode supports manual entry alongside camera scanning', () => {
    assert.match(source, /aria-label="Barcode \/ QR"/);
    assert.match(source, /placeholder="Ketik atau scan barcode"/);
    assert.match(source, /onChange=\{\(event\) => onChange\(event\.target\.value\)\}/);
    assert.match(source, /onChange=\{\(value\) => form\.setData\('barcode', value\)\}/);
    assert.match(source, /onChange=\{\(value\) => updateVariant\(index, 'barcode', value\)\}/);
});
