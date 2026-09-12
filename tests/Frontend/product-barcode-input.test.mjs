import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../resources/js/pages/customer/master-data/products/index.tsx', import.meta.url), 'utf8');

test('product barcode supports manual entry alongside camera scanning', () => {
    assert.match(source, /aria-label=\{translate\('Barcode \/ QR'\)\}/);
    assert.match(source, /placeholder=\{translate\('Ketik atau scan barcode'\)\}/);
    assert.match(source, /onChange=\{\(event\) => onChange\(event\.target\.value\)\}/);
    assert.match(source, /onChange=\{\(value\) => form\.setData\('barcode', value\)\}/);
    assert.match(source, /onChange=\{\(value\) => updateVariant\(index, 'barcode', value\)\}/);
});
