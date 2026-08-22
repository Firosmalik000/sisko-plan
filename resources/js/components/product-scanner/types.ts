export type ScannerPurpose = 'sale' | 'purchase' | 'stock_count' | 'product';
export type ScannerStatus = 'found' | 'uncertain' | 'unknown' | 'failed';
export type ScannerErrorCode =
    | 'SCANNER_DISABLED'
    | 'SCANNER_SETUP_PENDING'
    | 'SCANNER_NOT_CONNECTED'
    | 'SCANNER_BUSY'
    | 'SCANNER_UNAVAILABLE'
    | 'SCANNER_REQUEST_FAILED';

export type ScannerCandidate = {
    productId: string;
    productPublicId: string;
    variantPublicId: string | null;
    unitId: string;
    name: string;
    variantName: string | null;
    unitName: string;
    unitSymbol: string;
    purchasePrice: string;
    sellingPrice: string;
    stockQuantity: string;
    photoUrl: string | null;
    confidence: number | null;
    methods: string[];
};

export type ScannerCatalogItem = {
    captureId: string;
    imageIndex: number;
    itemIndex: number;
    status: ScannerStatus;
    productId: string | null;
    productPublicId: string | null;
    variantPublicId: string | null;
    unitId: string | null;
    name: string | null;
    variantName: string | null;
    unitName: string | null;
    unitSymbol: string | null;
    purchasePrice: string | null;
    sellingPrice: string | null;
    stockQuantity: string | null;
    photoUrl: string | null;
    confidence: number | null;
    methods: string[];
    candidates: ScannerCandidate[];
};

export type ScannerCapture = {
    id: string;
    blob: Blob;
    previewUrl: string;
    status: 'queued' | 'recognizing' | 'recognized' | 'failed';
    error: string | null;
    errorCode: ScannerErrorCode | null;
    retryable: boolean;
    results: ScannerCatalogItem[];
};

export type ScannerSelection = ScannerCandidate & {
    captureId: string;
    itemIndex: number;
    quantity: number;
};

export type ScannerConfig = {
    max_images_per_request: number;
    auto_capture_enabled: boolean;
    visual_recognition_enabled: boolean;
};
