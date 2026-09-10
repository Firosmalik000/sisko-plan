export type BarcodeScanStatus = 'scanning' | 'reading' | 'success' | 'not_found';
export type AutoCaptureStatus = 'idle' | 'positioning' | 'stabilizing' | 'captured' | 'processing';

type BarcodeScannerFeedback = {
    message: string;
    tone: 'active' | 'progress' | 'success' | 'warning';
};

const feedbackByStatus: Record<BarcodeScanStatus, BarcodeScannerFeedback> = {
    scanning: { message: 'Mencari barcode…', tone: 'active' },
    reading: { message: 'Barcode terbaca, mencari produk…', tone: 'progress' },
    success: { message: 'Berhasil. Barcode ditemukan.', tone: 'success' },
    not_found: { message: 'Kode terbaca, tetapi produk belum ada di katalog.', tone: 'warning' },
};

export function barcodeScannerFeedback(status: BarcodeScanStatus): BarcodeScannerFeedback {
    return feedbackByStatus[status];
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

const autoFeedbackByStatus: Record<AutoCaptureStatus, BarcodeScannerFeedback> = {
    idle: { message: 'Arahkan ke satu barang', tone: 'active' },
    positioning: { message: 'Posisikan barang lalu tahan stabil', tone: 'active' },
    stabilizing: { message: 'Tahan stabil…', tone: 'progress' },
    captured: { message: 'Foto berhasil diambil', tone: 'success' },
    processing: { message: 'Mengenali produk…', tone: 'progress' },
};

export function autoCaptureFeedback(status: AutoCaptureStatus): BarcodeScannerFeedback {
    return autoFeedbackByStatus[status];
}
