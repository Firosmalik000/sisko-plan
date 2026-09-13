import assert from 'node:assert/strict';
import test from 'node:test';
import { applyStoreCurrency, formatCurrencyNumber, localeTag, parseCurrencyInput } from '../../resources/js/lib/currency.ts';
import { appLocaleOptions, appLocales } from '../../resources/js/lib/locales.ts';

test('language choices follow the market priority order', () => {
    const expected = ['en', 'id', 'ms', 'vi', 'th', 'fil', 'km', 'lo', 'my', 'tet'];

    assert.deepEqual([...appLocales], expected);
    assert.deepEqual(
        appLocaleOptions.map(({ code }) => code),
        expected,
    );
});

test('currency input parses grouped rupiah into a canonical integer', () => {
    assert.equal(parseCurrencyInput('Rp 12.500', 'id', 'ID'), '12500');
    assert.equal(formatCurrencyNumber('12500', 'id', 'ID'), '12.500');
});

test('currency input preserves configured decimal precision', () => {
    const previousDocument = globalThis.document;
    globalThis.document = {
        documentElement: {
            dataset: { currencyDecimals: '2' },
        },
    };

    try {
        assert.equal(parseCurrencyInput('1,234.56', 'en', 'MY'), '1234.56');
        assert.equal(parseCurrencyInput('1.234,56', 'id', 'ID'), '1234.56');
        assert.equal(formatCurrencyNumber('1234.5', 'en', 'MY'), '1,234.50');
    } finally {
        globalThis.document = previousDocument;
    }
});

test('market defaults include complete currency formatting metadata', () => {
    const previousDocument = globalThis.document;
    globalThis.document = { documentElement: { dataset: {} } };

    try {
        applyStoreCurrency(null, 'SG');
        assert.deepEqual(globalThis.document.documentElement.dataset, {
            currency: 'SGD',
            currencySymbol: 'S$',
            currencyDecimals: '2',
            currencyPosition: 'before',
        });

        applyStoreCurrency(null, 'VN');
        assert.equal(globalThis.document.documentElement.dataset.currencyDecimals, '0');
        assert.equal(globalThis.document.documentElement.dataset.currencyPosition, 'after');
    } finally {
        globalThis.document = previousDocument;
    }
});

test('number formatting combines the selected language with the store country', () => {
    assert.equal(localeTag('en', 'SG'), 'en-SG');
    assert.equal(localeTag('ms', 'BN'), 'ms-BN');
    assert.equal(localeTag('vi', 'VN'), 'vi-VN');
    assert.equal(localeTag('id', 'ID'), 'id-ID');
    assert.equal(localeTag('km', 'KH'), 'km-KH');
    assert.equal(localeTag('lo', 'LA'), 'lo-LA');
    assert.equal(localeTag('my', 'MM'), 'my-MM');
    assert.equal(localeTag('fil', 'PH'), 'fil-PH');
    assert.equal(localeTag('th', 'TH'), 'th-TH');
    assert.equal(localeTag('tet', 'TL'), 'tet-TL');
});

test('the active locale accepts every Southeast Asian language', async () => {
    const previousDocument = globalThis.document;

    try {
        for (const locale of ['en', 'fil', 'id', 'km', 'lo', 'ms', 'my', 'tet', 'th', 'vi']) {
            globalThis.document = { documentElement: { lang: locale, dataset: {} } };
            const { currentLocale } = await import(`../../resources/js/lib/currency.ts?locale=${locale}`);
            assert.equal(currentLocale(), locale);
        }
    } finally {
        globalThis.document = previousDocument;
    }
});
