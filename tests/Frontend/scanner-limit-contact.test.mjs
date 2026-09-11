import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('scanner limit actions open the contact dialog without linking to pricing', () => {
    const cameraViewport = source('../../resources/js/components/product-scanner/CameraViewport.tsx');
    const scanReview = source('../../resources/js/components/product-scanner/ScanReview.tsx');

    assert.doesNotMatch(cameraViewport, /href=["']\/pricing/);
    assert.doesNotMatch(scanReview, /href=["']\/pricing/);
    assert.match(cameraViewport, /onClick=\{onScanLimitContact\}/);
    assert.match(scanReview, /onClick=\{onScanLimitContact\}/);
});
