import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildAndroidPrinterIntent,
    readReceiptPrintPreferences,
    receiptPrintStyles,
    writeReceiptPrintPreferences,
} from '../../resources/js/lib/receipt-printing.ts';

const storageWith = (initialValue) => {
    let value = initialValue;

    return {
        get value() {
            return value;
        },
        getItem: () => value,
        setItem: (_key, nextValue) => {
            value = nextValue;
        },
    };
};

test('receipt print preferences are isolated by store and reject stale formats', () => {
    assert.deepEqual(readReceiptPrintPreferences('store-a', storageWith(null)), { mode: 'system', autoPrint: false });
    assert.deepEqual(readReceiptPrintPreferences('store-a', storageWith('{bad')), { mode: 'system', autoPrint: false });
    assert.deepEqual(readReceiptPrintPreferences('store-a', storageWith('{"autoOpenDialog":true}')), { mode: 'system', autoPrint: false });
    assert.deepEqual(readReceiptPrintPreferences('store-a', storageWith('{"mode":"android-direct","autoPrint":true}')), {
        mode: 'android-direct',
        autoPrint: true,
    });

    const storage = storageWith(null);
    writeReceiptPrintPreferences('store-a', { mode: 'android-direct', autoPrint: true }, storage);
    assert.equal(storage.value, '{"mode":"android-direct","autoPrint":true}');
});

test('android printer intents target only the XSISTEN package and encode signed URLs', () => {
    assert.equal(
        buildAndroidPrinterIntent('settings', 'store A'),
        'intent://printer/settings?store_id=store%20A#Intent;scheme=xsisten;package=com.xsisten.app;end',
    );
    assert.equal(
        buildAndroidPrinterIntent('print', 'store-a', 'https://xsisten.com/native-print/sales/abc?expires=1&signature=x'),
        'intent://printer/print?store_id=store-a&payload_url=https%3A%2F%2Fxsisten.com%2Fnative-print%2Fsales%2Fabc%3Fexpires%3D1%26signature%3Dx#Intent;scheme=xsisten;package=com.xsisten.app;end',
    );
});

test('receipt print styles isolate the receipt at the selected paper width', () => {
    assert.match(receiptPrintStyles('58mm'), /@page \{ size: 58mm auto/);
    assert.match(receiptPrintStyles('80mm'), /@page \{ size: 80mm auto/);
    assert.match(receiptPrintStyles('80mm'), /\[data-print-receipt\]/);
});
