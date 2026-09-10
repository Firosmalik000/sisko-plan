export type ReceiptPrintMode = 'system' | 'android-direct';

export type ReceiptPrintPreferences = {
    mode: ReceiptPrintMode;
    autoPrint: boolean;
};

const DEFAULT_PREFERENCES: ReceiptPrintPreferences = { mode: 'system', autoPrint: false };

function storageKey(storeId: string): string {
    return `xsisten.receipt-printing.v2.${storeId}`;
}

export function readReceiptPrintPreferences(storeId: string, storage: Pick<Storage, 'getItem'> | undefined): ReceiptPrintPreferences {
    if (!storage) {
        return DEFAULT_PREFERENCES;
    }

    try {
        const current: unknown = JSON.parse(storage.getItem(storageKey(storeId)) ?? 'null');

        if (
            typeof current === 'object' &&
            current !== null &&
            'mode' in current &&
            (current.mode === 'system' || current.mode === 'android-direct') &&
            'autoPrint' in current &&
            typeof current.autoPrint === 'boolean'
        ) {
            return { mode: current.mode, autoPrint: current.autoPrint };
        }
    } catch {
        // Device storage can be unavailable or contain stale data.
    }

    return DEFAULT_PREFERENCES;
}

export function writeReceiptPrintPreferences(
    storeId: string,
    preferences: ReceiptPrintPreferences,
    storage: Pick<Storage, 'setItem'> | undefined,
): void {
    try {
        storage?.setItem(storageKey(storeId), JSON.stringify(preferences));
    } catch {
        // Printing still works manually when device storage is unavailable.
    }
}

export function buildAndroidPrinterIntent(action: 'settings' | 'print', storeId: string, payloadUrl?: string, locale?: string): string {
    const parameters = new URLSearchParams({ store_id: storeId });

    if (payloadUrl) {
        parameters.set('payload_url', payloadUrl);
    }

    if (locale) {
        parameters.set('locale', locale);
    }

    return `intent://printer/${action}?${parameters.toString().replaceAll('+', '%20')}#Intent;scheme=xsisten;package=com.xsisten.app;end`;
}

export function receiptPrintStyles(paperWidth: '58mm' | '80mm'): string {
    return `@page { size: ${paperWidth} auto; margin: 3mm; } @media print { body * { visibility: hidden !important; } [data-print-receipt], [data-print-receipt] * { visibility: visible !important; } [data-print-receipt] { position: absolute !important; inset: 0 !important; width: ${paperWidth} !important; max-width: ${paperWidth} !important; padding: 2mm !important; box-shadow: none !important; border: 0 !important; font-size: 10px !important; } }`;
}
