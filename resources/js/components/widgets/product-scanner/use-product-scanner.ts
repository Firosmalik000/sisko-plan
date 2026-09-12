import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    ScannerCapture,
    ScannerCatalogItem,
    ScannerConfig,
    ScannerErrorCode,
    ScannerProductCandidate,
    ScannerPurpose,
    ScannerSaleOption,
    ScannerSelection,
} from '@/components/widgets/product-scanner/types';
import { normalizeImage } from '@/components/widgets/product-scanner/use-camera';
import { apiClient } from '@/lib/api-client';
import { lookup as lookupCatalogItem, recognize as recognizeCatalogItems } from '@/routes/scanner/catalog-items';

export function useProductScanner(purpose: ScannerPurpose, config: ScannerConfig) {
    const [captures, setCapturesState] = useState<ScannerCapture[]>([]);
    const [reviewing, setReviewing] = useState(false);
    const controllersRef = useRef(new Map<string, AbortController>());
    const capturesRef = useRef<ScannerCapture[]>([]);
    const setCaptures = useCallback((update: ScannerCapture[] | ((current: ScannerCapture[]) => ScannerCapture[])) => {
        const next = typeof update === 'function' ? update(capturesRef.current) : update;
        capturesRef.current = next;
        setCapturesState(next);
    }, []);
    const reservations = useRef(0);
    const generation = useRef(0);
    const [reserved, setReserved] = useState(0);
    const [wake, setWake] = useState(0);
    useEffect(() => {
        const resume = () => setWake((value) => value + 1);
        window.addEventListener('online', resume);
        document.addEventListener('visibilitychange', resume);
        const timer = window.setInterval(resume, 1000);

        return () => {
            window.removeEventListener('online', resume);
            document.removeEventListener('visibilitychange', resume);
            window.clearInterval(timer);
        };
    }, [setCaptures]);

    useEffect(
        () => () => {
            generation.current++;
            controllersRef.current.forEach((controller) => controller.abort());
            capturesRef.current.forEach((capture) => {
                if (capture.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(capture.previewUrl);
                }
            });
        },
        [],
    );

    const addBlobs = useCallback(
        async (blobs: Blob[], normalize = true) => {
            const space = Math.max(0, 10 - reservations.current - capturesRef.current.filter(isPending).length);
            const accepted = blobs.slice(0, space);
            reservations.current += accepted.length;
            setReserved(reservations.current);
            const session = generation.current;
            let remaining = accepted.length;

            try {
                for (const source of accepted) {
                    const blob = normalize ? await normalizeImage(source, 768, 0.66) : source;
                    const thumbnail = await normalizeImage(blob, 160, 0.7);

                    if (session !== generation.current) {
                        break;
                    }

                    const id = crypto.randomUUID();
                    const capture: ScannerCapture = {
                        id,
                        requestId: id,
                        attempts: 0,
                        retryAt: 0,
                        startedAt: 0,
                        blob,
                        previewUrl: URL.createObjectURL(thumbnail),
                        status: config.visual_recognition_enabled ? 'queued' : 'failed',
                        error: config.visual_recognition_enabled ? null : 'Layanan scanner belum terhubung.',
                        errorCode: config.visual_recognition_enabled ? null : 'SCANNER_DISABLED',
                        retryable: config.visual_recognition_enabled,
                        results: [],
                    };
                    capturesRef.current = [...capturesRef.current, capture];
                    setCaptures(capturesRef.current);
                    remaining--;
                    reservations.current--;
                    setReserved(reservations.current);
                }
            } finally {
                reservations.current -= remaining;
                setReserved(reservations.current);
            }

            return accepted.length;
        },
        [config.visual_recognition_enabled, setCaptures],
    );

    const recognizeCapture = useCallback(
        async (capture: ScannerCapture) => {
            if (controllersRef.current.size > 0 || !capture.blob) {
                return;
            }

            const controller = new AbortController();
            controllersRef.current.set(capture.id, controller);
            const startedAt = capture.startedAt || Date.now();
            const attempt = capture.attempts + 1;

            setCaptures((current) =>
                current.map((item) =>
                    item.id === capture.id
                        ? {
                              ...item,
                              status: 'recognizing',
                              attempts: attempt,
                              startedAt,
                              error: null,
                              errorCode: null,
                          }
                        : item,
                ),
            );

            const form = new FormData();
            form.append('purpose', purpose);
            form.append('scan_request_id', capture.requestId);
            form.append('images[]', capture.blob, `${capture.id}.jpg`);
            form.append('capture_ids[]', capture.id);

            try {
                const response = await apiClient.post<{
                    data?: ScannerCatalogItem[];
                    code?: string;
                    retryable?: boolean;
                    retry_after_ms?: number;
                }>(recognizeCatalogItems.url(), form, { signal: controller.signal });
                const payload = response.body;

                if (!response.ok) {
                    throw new ScannerRequestError(payload.code, payload.retryable === true, payload.retry_after_ms);
                }

                const results = (payload.data ?? [])
                    .filter((result) => result.captureId === capture.id)
                    .map((result) => ({
                        ...result,
                        skipped: false,
                        quantity: 1,
                    }));

                setCaptures((current) =>
                    current.map((item) =>
                        item.id === capture.id && item.requestId === capture.requestId
                            ? {
                                  ...item,
                                  status: 'recognized',
                                  blob: null,
                                  error: null,
                                  errorCode: null,
                                  retryable: false,
                                  results: results.length ? results : [unknownResult(capture.id)],
                              }
                            : item,
                    ),
                );
            } catch (error) {
                if (!controller.signal.aborted) {
                    const failure = scannerFailure(error instanceof ScannerRequestError ? error.code : null);
                    const delay = Math.max(
                        attempt * 1000 + Math.floor(Math.random() * 501),
                        error instanceof ScannerRequestError ? (error.retryAfter ?? 0) : 0,
                    );
                    const retrying =
                        error instanceof ScannerRequestError && error.capacity && attempt < 3 && Date.now() + delay - startedAt < 30000;
                    setCaptures((current) =>
                        current.map((item) =>
                            item.id === capture.id && item.requestId === capture.requestId
                                ? { ...item, status: retrying ? 'retry_wait' : 'failed', retryAt: Date.now() + delay, ...failure }
                                : item,
                        ),
                    );
                }
            } finally {
                if (controllersRef.current.get(capture.id) === controller) {
                    controllersRef.current.delete(capture.id);
                }

                setCaptures((current) => [...current]);
            }
        },
        [purpose, setCaptures],
    );

    useEffect(() => {
        if (
            purpose === 'product' ||
            !config.visual_recognition_enabled ||
            !navigator.onLine ||
            document.hidden ||
            controllersRef.current.size > 0
        ) {
            return;
        }

        const next = captures.find(
            (capture) => capture.status === 'queued' || (capture.status === 'retry_wait' && capture.retryAt <= Date.now()),
        );

        if (next) {
            void recognizeCapture(next);
        }
    }, [captures, config.visual_recognition_enabled, purpose, recognizeCapture, wake]);

    const lookupBarcode = useCallback(
        async (identifier: string, captureId?: string, itemIndex = 0): Promise<boolean | ScannerSelection> => {
            const session = generation.current;
            const target = capturesRef.current.find((capture) => capture.id === captureId);
            const targetEntry = target?.results.find((entry) => entry.itemIndex === itemIndex);
            const barcodeId = crypto.randomUUID();
            const response = await apiClient.post<{
                data?: ScannerCatalogItem[];
                code?: string;
            }>(lookupCatalogItem.url(), {
                purpose,
                type: 'barcode',
                identifier,
                capture_id: barcodeId,
            });
            const payload = response.body;

            if (!response.ok) {
                throw new ScannerRequestError(payload.code);
            }

            const result = payload.data?.[0];

            if (!result || result.status !== 'found') {
                return false;
            }

            if (session !== generation.current) {
                return false;
            }

            if (captureId) {
                const latest = capturesRef.current.find((capture) => capture.id === captureId);

                if (
                    !targetEntry ||
                    latest?.requestId !== target?.requestId ||
                    latest?.results.find((entry) => entry.itemIndex === itemIndex) !== targetEntry
                ) {
                    return false;
                }
            }

            setCaptures((current) => {
                const nextResult = { ...result, captureId: captureId ?? barcodeId, itemIndex, skipped: false, quantity: 1 };

                if (captureId) {
                    return current.map((item) =>
                        item.id !== captureId
                            ? item
                            : {
                                  ...item,
                                  results: item.results.map((entry) =>
                                      entry.itemIndex === itemIndex ? { ...nextResult, quantity: entry.quantity ?? 1 } : entry,
                                  ),
                              },
                    );
                }

                return [
                    ...current,
                    {
                        id: barcodeId,
                        requestId: barcodeId,
                        attempts: 0,
                        retryAt: 0,
                        startedAt: 0,
                        blob: null,
                        previewUrl: result.match?.photoUrl ?? '',
                        status: 'recognized',
                        error: null,
                        errorCode: null,
                        retryable: false,
                        results: [nextResult],
                    },
                ];
            });
            navigator.vibrate?.(45);

            if (!captureId && result.match && result.selectedOption) {
                return {
                    ...result.selectedOption,
                    captureId: barcodeId,
                    itemIndex,
                    name: result.match.name,
                    photoUrl: result.match.photoUrl,
                    quantity: 1,
                };
            }

            return true;
        },
        [purpose, setCaptures],
    );

    const removeCapture = useCallback(
        (id: string) => {
            setCaptures((current) => {
                const capture = current.find((item) => item.id === id);

                if (capture?.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(capture.previewUrl);
                }

                return current.filter((item) => item.id !== id);
            });
        },
        [setCaptures],
    );

    const removeResult = useCallback(
        (captureId: string, itemIndex: number) => {
            setCaptures((current) => {
                const capture = current.find((item) => item.id === captureId);

                if (!capture) {
                    return current;
                }

                const results = capture.results.filter((result) => result.itemIndex !== itemIndex);

                if (results.length > 0) {
                    return current.map((item) => (item.id === captureId ? { ...item, results } : item));
                }

                if (capture.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(capture.previewUrl);
                }

                return current.filter((item) => item.id !== captureId);
            });
        },
        [setCaptures],
    );

    const retry = useCallback(
        (id: string) => {
            if (!config.visual_recognition_enabled) {
                return;
            }

            setCaptures((current) =>
                current.map((capture) =>
                    capture.id === id && capture.blob
                        ? {
                              ...capture,
                              attempts: 0,
                              startedAt: 0,
                              retryAt: 0,
                              status: 'queued',
                              error: null,
                              errorCode: null,
                          }
                        : capture,
                ),
            );
        },
        [config.visual_recognition_enabled, setCaptures],
    );

    const replaceBlob = useCallback(
        async (id: string, blob: Blob, normalize = true) => {
            const original = capturesRef.current.find((capture) => capture.id === id);

            if (!original || (!original.blob && capturesRef.current.filter(isPending).length + reservations.current >= 10)) {
                throw new Error('Antrean penuh. Periksa hasil atau tunggu foto selesai.');
            }

            const session = generation.current;
            const normalized = normalize ? await normalizeImage(blob, 768, 0.66) : blob;

            if (session !== generation.current || !capturesRef.current.some((capture) => capture.id === id)) {
                return;
            }

            const previewUrl = URL.createObjectURL(await normalizeImage(normalized, 160, 0.7));

            setCaptures((current) =>
                current.map((capture) => {
                    if (capture.id !== id) {
                        return capture;
                    }

                    if (capture.previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(capture.previewUrl);
                    }

                    return {
                        ...capture,
                        requestId: crypto.randomUUID(),
                        attempts: 0,
                        startedAt: 0,
                        retryAt: 0,
                        blob: normalized,
                        previewUrl,
                        status: config.visual_recognition_enabled ? 'queued' : 'failed',
                        error: config.visual_recognition_enabled ? null : 'Layanan scanner belum terhubung. Hubungi administrator.',
                        errorCode: config.visual_recognition_enabled ? null : 'SCANNER_DISABLED',
                        retryable: config.visual_recognition_enabled,
                        results: [],
                    };
                }),
            );
        },
        [config.visual_recognition_enabled, setCaptures],
    );

    const selectProductCandidate = useCallback(
        (captureId: string, itemIndex: number, candidate: ScannerProductCandidate) => {
            setCaptures((current) =>
                current.map((capture) =>
                    capture.id !== captureId
                        ? capture
                        : {
                              ...capture,
                              results: capture.results.map((result) =>
                                  result.itemIndex !== itemIndex
                                      ? result
                                      : {
                                            ...result,
                                            status: 'uncertain',
                                            match: candidate,
                                            skipped: false,
                                            selectedOption: candidate.options.length === 1 ? candidate.options[0] : null,
                                        },
                              ),
                          },
                ),
            );
        },
        [setCaptures],
    );

    const selectSaleOption = useCallback(
        (captureId: string, itemIndex: number, option: ScannerSaleOption) => {
            setCaptures((current) =>
                current.map((capture) =>
                    capture.id !== captureId
                        ? capture
                        : {
                              ...capture,
                              results: capture.results.map((result) =>
                                  result.itemIndex !== itemIndex
                                      ? result
                                      : {
                                            ...result,
                                            skipped: false,
                                            selectedOption: option,
                                        },
                              ),
                          },
                ),
            );
        },
        [setCaptures],
    );

    const clearProductSelection = useCallback(
        (captureId: string, itemIndex: number) => {
            setCaptures((current) =>
                current.map((capture) =>
                    capture.id !== captureId
                        ? capture
                        : {
                              ...capture,
                              results: capture.results.map((result) =>
                                  result.itemIndex !== itemIndex
                                      ? result
                                      : {
                                            ...result,
                                            status: 'uncertain',
                                            match: null,
                                            selectedOption: null,
                                            skipped: false,
                                        },
                              ),
                          },
                ),
            );
        },
        [setCaptures],
    );

    const setResultSkipped = useCallback(
        (captureId: string, itemIndex: number, skipped: boolean) => {
            setCaptures((current) =>
                current.map((capture) =>
                    capture.id !== captureId
                        ? capture
                        : {
                              ...capture,
                              results: capture.results.map((result) => (result.itemIndex !== itemIndex ? result : { ...result, skipped })),
                          },
                ),
            );
        },
        [setCaptures],
    );

    const setResultQuantity = useCallback(
        (captureId: string, itemIndex: number, quantity: number) => {
            setCaptures((current) =>
                current.map((capture) =>
                    capture.id !== captureId
                        ? capture
                        : {
                              ...capture,
                              results: capture.results.map((result) => (result.itemIndex !== itemIndex ? result : { ...result, quantity })),
                          },
                ),
            );
        },
        [setCaptures],
    );

    const selections = useMemo<ScannerSelection[]>(
        () =>
            captures.flatMap((capture) =>
                capture.results.flatMap((result) => {
                    if (result.skipped === true || result.match === null || result.selectedOption === null) {
                        return [];
                    }

                    return [
                        {
                            ...result.selectedOption,
                            captureId: capture.id,
                            itemIndex: result.itemIndex,
                            name: result.match.name,
                            photoUrl: result.match.photoUrl,
                            quantity: result.quantity ?? 1,
                        },
                    ];
                }),
            ),
        [captures],
    );

    const reset = useCallback(() => {
        generation.current++;

        setCaptures((current) => {
            current.forEach((capture) => {
                if (capture.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(capture.previewUrl);
                }
            });

            return [];
        });
        setReviewing(false);
    }, [setCaptures]);

    return {
        captures,
        pendingCount: captures.filter(isPending).length + reserved,
        selections,
        reviewing,
        setReviewing,
        addBlobs,
        lookupBarcode,
        removeCapture,
        removeResult,
        retry,
        replaceBlob,
        selectProductCandidate,
        selectSaleOption,
        clearProductSelection,
        setResultSkipped,
        setResultQuantity,
        reset,
    };
}

class ScannerRequestError extends Error {
    public constructor(
        public readonly code: string | undefined,
        public readonly capacity = false,
        public readonly retryAfter?: number,
    ) {
        super(scannerFailure(code).error);
    }
}

function isPending(capture: ScannerCapture): boolean {
    return capture.blob !== null;
}

function scannerFailure(code: string | null | undefined): {
    error: string;
    errorCode: ScannerErrorCode;
    retryable: boolean;
} {
    switch (code) {
        case 'SCANNER_SETUP_PENDING':
            return {
                error: 'Scanner toko sedang disiapkan. Coba lagi sebentar.',
                errorCode: code,
                retryable: true,
            };
        case 'SCANNER_NOT_CONNECTED':
            return {
                error: 'Layanan scanner belum terhubung. Hubungi administrator.',
                errorCode: code,
                retryable: false,
            };
        case 'SCANNER_BUSY':
            return {
                error: 'Scanner sedang sibuk. Coba lagi sebentar.',
                errorCode: code,
                retryable: true,
            };
        case 'SCANNER_UNAVAILABLE':
            return {
                error: 'Pengenalan sedang terganggu. Coba lagi atau cari manual.',
                errorCode: code,
                retryable: true,
            };
        case 'SCANNER_RATE_LIMITED':
        case 'DISCOVERY_QUOTA_EXCEEDED':
        case 'DISCOVERY_SPEND_LIMIT_EXCEEDED':
            return { error: 'Batas layanan tercapai. Coba lagi nanti atau hubungi administrator.', errorCode: code, retryable: false };
        case 'SCAN_LIMIT_REACHED':
            return {
                error: 'Kuota foto AI bulan ini habis. Barcode tetap bisa digunakan.',
                errorCode: code,
                retryable: false,
            };
        default:
            return {
                error: 'Foto belum berhasil diproses. Coba lagi atau cari manual.',
                errorCode: 'SCANNER_REQUEST_FAILED',
                retryable: true,
            };
    }
}

function unknownResult(captureId: string): ScannerCatalogItem {
    return {
        captureId,
        imageIndex: 0,
        itemIndex: 0,
        status: 'unknown',
        match: null,
        selectedOption: null,
        candidates: [],
        skipped: false,
        quantity: 1,
    };
}
