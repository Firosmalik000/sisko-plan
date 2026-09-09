export type ScannerPurpose = 'sale' | 'purchase' | 'stock_count' | 'product';
export type ScannerStatus = 'found' | 'uncertain' | 'unknown' | 'failed';
export type ScannerErrorCode =
    | 'DISCOVERY_QUOTA_EXCEEDED'
    | 'DISCOVERY_SPEND_LIMIT_EXCEEDED'
    | 'SCANNER_DISABLED'
    | 'SCANNER_SETUP_PENDING'
    | 'SCANNER_NOT_CONNECTED'
    | 'SCANNER_RATE_LIMITED'
    | 'SCANNER_BUSY'
    | 'SCANNER_UNAVAILABLE'
    | 'SCAN_LIMIT_REACHED'
    | 'SCANNER_REQUEST_FAILED';

export type ScannerSaleOption = {
    id: string;
    productId: string;
    productPublicId: string;
    variantPublicId: string | null;
    variantName: string | null;
    unitId: string;
    unitName: string;
    unitSymbol: string;
    purchasePrice: string;
    sellingPrice: string;
    stockQuantity: string;
};

export type ScannerProductCandidate = {
    productPublicId: string;
    name: string;
    photoUrl: string | null;
    confidence: number | null;
    methods: string[];
    options: ScannerSaleOption[];
};

export type ScannerCatalogItem = {
    captureId: string;
    imageIndex: number;
    itemIndex: number;
    status: ScannerStatus;
    match: ScannerProductCandidate | null;
    selectedOption: ScannerSaleOption | null;
    candidates: ScannerProductCandidate[];
    skipped?: boolean;
    quantity?: number;
};

export type ScannerCapture = {
    id: string;
    requestId: string;
    attempts: number;
    retryAt: number;
    startedAt: number;
    blob: Blob | null;
    previewUrl: string;
    status: 'queued' | 'recognizing' | 'retry_wait' | 'recognized' | 'failed';
    error: string | null;
    errorCode: ScannerErrorCode | null;
    retryable: boolean;
    results: ScannerCatalogItem[];
};

export type ScannerSelection = ScannerSaleOption & {
    captureId: string;
    itemIndex: number;
    name: string;
    photoUrl: string | null;
    quantity: number;
};

export type ScannerConfig = {
    max_images_per_request: number;
    auto_capture_enabled: boolean;
    visual_recognition_enabled: boolean;
};

export type ScannerApplyResult = {
    applied: Array<{ captureId: string; itemIndex: number }>;
    failures: Array<{ captureId: string; itemIndex: number; message: string }>;
};
