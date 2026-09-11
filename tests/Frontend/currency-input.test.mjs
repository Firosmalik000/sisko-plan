import assert from 'node:assert/strict';
import test from 'node:test';
import { formatCurrencyNumber, parseCurrencyInput } from '../../resources/js/lib/currency.ts';

test('currency input parses grouped rupiah into a canonical integer', () => {
    assert.equal(parseCurrencyInput('Rp 12.500', 'id', 'id'), '12500');
    assert.equal(formatCurrencyNumber('12500', 'id', 'id'), '12.500');
});

test('currency input preserves configured decimal precision', () => {
    const previousDocument = globalThis.document;
    globalThis.document = {
        documentElement: {
            dataset: { currencyDecimals: '2' },
        },
    };

    try {
        assert.equal(parseCurrencyInput('1,234.56', 'en', 'ms'), '1234.56');
        assert.equal(parseCurrencyInput('1.234,56', 'id', 'id'), '1234.56');
        assert.equal(formatCurrencyNumber('1234.5', 'en', 'ms'), '1,234.50');
    } finally {
        globalThis.document = previousDocument;
    }
});
