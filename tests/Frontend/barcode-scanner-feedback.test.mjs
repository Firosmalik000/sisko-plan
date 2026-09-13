import assert from 'node:assert/strict';
import test from 'node:test';
import {
    autoCaptureFeedback,
    barcodeScannerFeedback,
    barcodeStatusResetDelay,
} from '../../resources/js/components/widgets/product-scanner/barcode-scanner-feedback.ts';

test('barcode scanner feedback gives every state explicit text and tone', () => {
    assert.deepEqual(barcodeScannerFeedback('scanning'), {
        message: 'Searching for a barcode…',
        tone: 'active',
    });
    assert.deepEqual(barcodeScannerFeedback('reading'), {
        message: 'Barcode detected. Searching for the product…',
        tone: 'progress',
    });
    assert.deepEqual(barcodeScannerFeedback('success'), {
        message: 'Barcode found.',
        tone: 'success',
    });
    assert.deepEqual(barcodeScannerFeedback('not_found'), {
        message: 'The code was read, but no matching product was found.',
        tone: 'warning',
    });
});

test('automatic photo feedback describes positioning, progress, capture, and processing', () => {
    assert.deepEqual(autoCaptureFeedback('positioning'), {
        message: 'Position the item and hold steady',
        tone: 'active',
    });
    assert.deepEqual(autoCaptureFeedback('stabilizing'), {
        message: 'Hold steady…',
        tone: 'progress',
    });
    assert.deepEqual(autoCaptureFeedback('captured'), {
        message: 'Photo captured.',
        tone: 'success',
    });
    assert.deepEqual(autoCaptureFeedback('processing'), {
        message: 'Recognizing product…',
        tone: 'progress',
    });
});

test('terminal barcode feedback returns to scanning without adding another user step', () => {
    assert.equal(barcodeStatusResetDelay('success'), 700);
    assert.equal(barcodeStatusResetDelay('not_found'), 1000);
    assert.equal(barcodeStatusResetDelay('scanning'), null);
    assert.equal(barcodeStatusResetDelay('reading'), null);
});
