import assert from 'node:assert/strict';
import test from 'node:test';
import { readReceiptPrintPreferences, receiptPrintStyles, writeReceiptPrintPreferences } from '../../resources/js/lib/receipt-printing.ts';

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

test('receipt print preferences default safely and persist only the device auto-dialog choice', () => {
    assert.deepEqual(readReceiptPrintPreferences(storageWith(null)), { autoOpenDialog: false });
    assert.deepEqual(readReceiptPrintPreferences(storageWith('{bad')), { autoOpenDialog: false });
    assert.deepEqual(readReceiptPrintPreferences(storageWith('{"autoOpenDialog":"yes"}')), { autoOpenDialog: false });
    assert.deepEqual(readReceiptPrintPreferences(storageWith('{"autoOpenDialog":true}')), { autoOpenDialog: true });

    const storage = storageWith(null);
    writeReceiptPrintPreferences({ autoOpenDialog: true }, storage);
    assert.equal(storage.value, '{"autoOpenDialog":true}');
});

test('receipt print styles isolate the receipt at the selected paper width', () => {
    assert.match(receiptPrintStyles('58mm'), /@page \{ size: 58mm auto/);
    assert.match(receiptPrintStyles('80mm'), /@page \{ size: 80mm auto/);
    assert.match(receiptPrintStyles('80mm'), /\[data-print-receipt\]/);
});
