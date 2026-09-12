import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../resources/js/pages/customer/master-data/products/index.tsx', import.meta.url), 'utf8');
const fieldSource = readFileSync(new URL('../../resources/js/components/forms/form-barcode-input.tsx', import.meta.url), 'utf8');

test('product barcode supports manual entry alongside camera scanning', () => {
    assert.match(fieldSource, /label=\{label\}/);
    assert.match(fieldSource, /placeholder=\{translate\('Ketik atau scan barcode'\)\}/);
    assert.match(fieldSource, /onChange=\{\(event\) => onChange\(event\.target\.value\)\}/);
    assert.match(fieldSource, /onClick=\{onScan\}/);
    assert.match(source, /onChange=\{\(value\) => form\.setData\('barcode', value\)\}/);
    assert.match(source, /onChange=\{\(value\) => updateVariant\(index, 'barcode', value\)\}/);
});
