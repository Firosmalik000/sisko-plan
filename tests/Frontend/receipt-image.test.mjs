import assert from 'node:assert/strict';
import test from 'node:test';
import { drawReceiptToContext, wrapCanvasText } from '../../resources/js/lib/receipt-image.ts';

test('wrapCanvasText wraps lines when text exceeds maximum width', () => {
    // Measure width mock: 1 char = 10px
    const measure = (text) => text.length * 10;

    const shortText = 'Hello World';
    const shortWrapped = wrapCanvasText(measure, shortText, 200);
    assert.deepEqual(shortWrapped, ['Hello World']);

    const longText = 'Produk Kopi Susu Aren Gula Merah Spesial';
    // Max width 150px (approx 15 chars)
    const longWrapped = wrapCanvasText(measure, longText, 150);
    assert.ok(longWrapped.length > 1);
    assert.equal(longWrapped.join(' '), longText);
});

test('drawReceiptToContext measures total height without context', () => {
    const mockProps = {
        receipt: {
            store_name: 'Toko Kopi Barokah',
            address: 'Jl. Sudirman No. 123, Jakarta',
            header: 'Nota Penjualan',
            footer: 'Terima kasih atas kunjungan Anda',
            paper_size: '58mm',
            show_address: true,
            show_cashier: true,
        },
        sale: {
            public_id: 'sale-123',
            document_number: 'SL-20260925-001',
            customer_name: 'Budi Santoso',
            customer_phone: '081234567890',
            customer_email: 'budi@example.com',
            sales_channel: 'in_store',
            marketplace_code: null,
            marketplace_label: null,
            external_order_number: null,
            subtotal: '50000',
            item_discount_amount: '5000',
            transaction_discount_amount: '0',
            total_amount: '45000',
            paid_amount: '50000',
            change_amount: '5000',
            occurred_at: '2026-09-25T08:00:00Z',
            notes: 'Pesanan take-away',
            cashier_name: 'Kasir 1',
        },
        items: [
            {
                public_id: 'item-1',
                product_name: 'Kopi Susu Aren',
                sku: 'KSA-01',
                unit_symbol: 'cup',
                quantity: '2',
                unit_price: '25000',
                net_total: '45000',
                returned_quantity: '0',
            },
        ],
        payment: {
            amount: '45000',
            tendered_amount: '50000',
            change_amount: '5000',
            account_name: 'Kas Toko',
        },
        timezone: 'Asia/Jakarta',
    };

    const calculatedHeight = drawReceiptToContext(null, mockProps, 480, 32);
    assert.ok(calculatedHeight > 200);

    const calls = [];
    const mockCtx = {
        font: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        textAlign: '',
        measureText: (text) => ({ width: text.length * 8 }),
        fillText: (text, x, y) => calls.push({ type: 'fillText', text, x, y }),
        save: () => {},
        restore: () => {},
        setLineDash: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        rect: () => {},
        roundRect: () => {},
    };

    const drawnHeight = drawReceiptToContext(mockCtx, mockProps, 480, 32);
    assert.equal(drawnHeight, calculatedHeight);

    const documentTextCalls = calls.filter((c) => c.text === 'SL-20260925-001');
    assert.equal(documentTextCalls.length, 1);
    assert.equal(documentTextCalls[0].x, 240); // 480 / 2 (centered)

    const brandingCalls = calls.filter((c) => c.text === 'Powered by XSISTEN · xsisten.com');
    assert.equal(brandingCalls.length, 1);
    assert.equal(brandingCalls[0].x, 240); // centered
});

test('drawReceiptToContext renders logo when provided and show_logo is true', () => {
    const mockProps = {
        receipt: {
            store_name: 'Toko Kopi Barokah',
            address: 'Jl. Sudirman No. 123, Jakarta',
            header: 'Nota Penjualan',
            footer: 'Terima kasih atas kunjungan Anda',
            paper_size: '58mm',
            show_address: true,
            show_cashier: true,
            show_logo: true,
            logo_url: 'http://example.com/logo.png',
        },
        sale: {
            public_id: 'sale-123',
            document_number: 'SL-20260925-001',
            customer_name: null,
            customer_phone: null,
            customer_email: null,
            sales_channel: 'in_store',
            marketplace_code: null,
            marketplace_label: null,
            external_order_number: null,
            subtotal: '50000',
            item_discount_amount: '0',
            transaction_discount_amount: '0',
            total_amount: '50000',
            paid_amount: '50000',
            change_amount: '0',
            occurred_at: '2026-09-25T08:00:00Z',
            notes: null,
            cashier_name: 'Kasir 1',
        },
        items: [],
        payment: {
            amount: '50000',
            tendered_amount: '50000',
            change_amount: '0',
            account_name: 'Kas',
        },
        timezone: 'Asia/Jakarta',
    };

    const mockLogo = { width: 100, height: 50 };
    const withoutLogoHeight = drawReceiptToContext(null, mockProps, 480, 32, null);
    const withLogoHeight = drawReceiptToContext(null, mockProps, 480, 32, mockLogo);

    // Height with logo should be larger (by logo height 50 + 12px margin)
    assert.equal(withLogoHeight, withoutLogoHeight + 62);

    let drawImageCalled = false;
    const mockCtx = {
        font: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        textAlign: '',
        measureText: (text) => ({ width: text.length * 8 }),
        fillText: () => {},
        drawImage: (img, x, y, w, h) => {
            drawImageCalled = true;
            assert.equal(img, mockLogo);
            assert.equal(w, 100);
            assert.equal(h, 50);
            assert.equal(x, (480 - 100) / 2); // centered
        },
        save: () => {},
        restore: () => {},
        setLineDash: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        rect: () => {},
        roundRect: () => {},
    };

    const drawnHeight = drawReceiptToContext(mockCtx, mockProps, 480, 32, mockLogo);
    assert.equal(drawnHeight, withLogoHeight);
    assert.ok(drawImageCalled);
});
