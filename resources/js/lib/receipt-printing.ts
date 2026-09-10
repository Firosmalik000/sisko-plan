export type ReceiptPrintPreferences = {
    autoOpenDialog: boolean;
};

const STORAGE_KEY = 'xsisten.receipt-printing.v1';
const DEFAULT_PREFERENCES: ReceiptPrintPreferences = { autoOpenDialog: false };

export function readReceiptPrintPreferences(storage: Pick<Storage, 'getItem'> | undefined): ReceiptPrintPreferences {
    if (!storage) {
        return DEFAULT_PREFERENCES;
    }

    try {
        const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');

        if (typeof value === 'object' && value !== null && 'autoOpenDialog' in value && typeof value.autoOpenDialog === 'boolean') {
            return { autoOpenDialog: value.autoOpenDialog };
        }
    } catch {
        // Device storage can be unavailable or contain stale data.
    }

    return DEFAULT_PREFERENCES;
}

export function writeReceiptPrintPreferences(preferences: ReceiptPrintPreferences, storage: Pick<Storage, 'setItem'> | undefined): void {
    try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
        // Printing still works manually when device storage is unavailable.
    }
}

export function receiptPrintStyles(paperWidth: '58mm' | '80mm'): string {
    return `@page { size: ${paperWidth} auto; margin: 3mm; } @media print { body * { visibility: hidden !important; } [data-print-receipt], [data-print-receipt] * { visibility: visible !important; } [data-print-receipt] { position: absolute !important; inset: 0 !important; width: ${paperWidth} !important; max-width: ${paperWidth} !important; padding: 2mm !important; box-shadow: none !important; border: 0 !important; font-size: 10px !important; } }`;
}
