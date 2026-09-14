export type BarcodeScanStatus = 'scanning' | 'reading' | 'success' | 'not_found';
export type AutoCaptureStatus = 'idle' | 'positioning' | 'stabilizing' | 'captured' | 'processing';

type BarcodeScannerFeedback = {
    message: string;
    tone: 'active' | 'progress' | 'success' | 'warning';
};

const feedbackToneByStatus: Record<BarcodeScanStatus, BarcodeScannerFeedback['tone']> = {
    scanning: 'active',
    reading: 'progress',
    success: 'success',
    not_found: 'warning',
};

export function barcodeScannerFeedback(status: BarcodeScanStatus): BarcodeScannerFeedback {
    const message =
        status === 'scanning'
            ? 'Searching for a barcode…'
            : status === 'reading'
              ? 'Barcode detected. Searching for the product…'
              : status === 'success'
                ? 'Barcode found.'
                : 'The code was read, but no matching product was found.';

    return { message, tone: feedbackToneByStatus[status] };
}

export function barcodeStatusResetDelay(status: BarcodeScanStatus): number | null {
    if (status === 'success') {
        return 700;
    }

    if (status === 'not_found') {
        return 1000;
    }

    return null;
}

export function autoCaptureFeedback(status: AutoCaptureStatus): BarcodeScannerFeedback {
    if (status === 'idle') {
        return { message: 'Point to one item', tone: 'active' };
    }

    if (status === 'positioning') {
        return { message: 'Position the item and hold steady', tone: 'active' };
    }

    if (status === 'stabilizing') {
        return { message: 'Hold steady…', tone: 'progress' };
    }

    if (status === 'captured') {
        return { message: 'Photo captured.', tone: 'success' };
    }

    return { message: 'Recognizing product…', tone: 'progress' };
}
