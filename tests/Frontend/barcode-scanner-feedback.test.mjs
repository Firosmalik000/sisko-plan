import assert from 'node:assert/strict';
import test from 'node:test';
import {
    autoCaptureFeedback,
    barcodeScannerFeedback,
    barcodeStatusResetDelay,
} from '../../resources/js/features/product-scanner/barcode-scanner-feedback.ts';

test('barcode scanner feedback gives every state explicit text and tone', () => {
    assert.deepEqual(barcodeScannerFeedback('scanning'), {
        message: 'Mencari barcode…',
        tone: 'active',
    });
    assert.deepEqual(barcodeScannerFeedback('reading'), {
        message: 'Barcode terbaca, mencari produk…',
        tone: 'progress',
    });
    assert.deepEqual(barcodeScannerFeedback('success'), {
        message: 'Berhasil. Barcode ditemukan.',
        tone: 'success',
    });
    assert.deepEqual(barcodeScannerFeedback('not_found'), {
        message: 'Kode terbaca, tetapi produk belum ada di katalog.',
        tone: 'warning',
    });
});

test('automatic photo feedback describes positioning, progress, capture, and processing', () => {
    assert.deepEqual(autoCaptureFeedback('positioning'), {
        message: 'Posisikan barang lalu tahan stabil',
        tone: 'active',
    });
    assert.deepEqual(autoCaptureFeedback('stabilizing'), {
        message: 'Tahan stabil…',
        tone: 'progress',
    });
    assert.deepEqual(autoCaptureFeedback('captured'), {
        message: 'Foto berhasil diambil',
        tone: 'success',
    });
    assert.deepEqual(autoCaptureFeedback('processing'), {
        message: 'Mengenali produk…',
        tone: 'progress',
    });
});

test('terminal barcode feedback returns to scanning without adding another user step', () => {
    assert.equal(barcodeStatusResetDelay('success'), 700);
    assert.equal(barcodeStatusResetDelay('not_found'), 1000);
    assert.equal(barcodeStatusResetDelay('scanning'), null);
    assert.equal(barcodeStatusResetDelay('reading'), null);
});
