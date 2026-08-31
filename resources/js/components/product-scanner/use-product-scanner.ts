import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { decodeBarcodeImage } from './decode-barcode-image';
import type {
    ScannerCapture,
    ScannerCatalogItem,
    ScannerConfig,
    ScannerErrorCode,
    ScannerProductCandidate,
    ScannerPurpose,
    ScannerSaleOption,
    ScannerSelection,
} from './types';
import { normalizeImage } from './use-camera';

const csrfToken = () => {
    const value = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')
        .slice(1)
        .join('=');

    return value ? decodeURIComponent(value) : '';
};

export function useProductScanner(
    open: boolean,
    purpose: ScannerPurpose,
    config: ScannerConfig,
) {
    const [captures, setCaptures] = useState<ScannerCapture[]>([]);
    const [reviewing, setReviewing] = useState(false);
    const controllersRef = useRef(new Map<string, AbortController>());
    const capturesRef = useRef<ScannerCapture[]>([]);
    const barcodeMatchedRef = useRef(new Set<string>());
    const lookupBarcodeRef = useRef<
        (identifier: string, captureId?: string) => Promise<boolean>
    >(async () => false);

    useEffect(() => {
        capturesRef.current = captures;
    }, [captures]);

    useEffect(
        () => () => {
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
            const normalized: Blob[] = [];

            for (const blob of blobs) {
                normalized.push(normalize ? await normalizeImage(blob) : blob);
            }

            setCaptures((current) => [
                ...current,
                ...normalized.map((blob) => ({
                    id: crypto.randomUUID(),
                    blob,
                    previewUrl: URL.createObjectURL(blob),
                    status: config.visual_recognition_enabled
                        ? ('queued' as const)
                        : ('failed' as const),
                    error: config.visual_recognition_enabled
                        ? null
                        : 'Layanan scanner belum terhubung. Hubungi administrator.',
                    errorCode: config.visual_recognition_enabled
                        ? null
                        : ('SCANNER_DISABLED' as const),
                    retryable: config.visual_recognition_enabled,
                    results: [],
                })),
            ]);
        },
        [config.visual_recognition_enabled],
    );

    const recognizeCapture = useCallback(
        async (capture: ScannerCapture) => {
            const controller = new AbortController();
            controllersRef.current.set(capture.id, controller);
            const barcodePromise =
                purpose === 'product'
                    ? Promise.resolve('')
                    : decodeBarcodeImage(capture.blob).catch(() => '');

            const barcode = await barcodePromise;

            if (barcode && !controller.signal.aborted) {
                const found = await lookupBarcodeRef.current(
                    barcode,
                    capture.id,
                );

                if (found) {
                    barcodeMatchedRef.current.add(capture.id);
                }
            }

            if (controller.signal.aborted) {
                return;
            }

            setCaptures((current) =>
                current.map((item) =>
                    item.id === capture.id
                        ? {
                              ...item,
                              status: 'recognizing',
                              error: null,
                              errorCode: null,
                          }
                        : item,
                ),
            );

            const form = new FormData();
            form.append('purpose', purpose);
            form.append('images[]', capture.blob, `${capture.id}.jpg`);
            form.append('capture_ids[]', capture.id);

            try {
                const response = await fetch(
                    '/scanner/catalog-item-recognitions',
                    {
                        method: 'POST',
                        body: form,
                        signal: controller.signal,
                        headers: {
                            Accept: 'application/json',
                            'X-XSRF-TOKEN': csrfToken(),
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    },
                );
                const payload = (await response.json()) as {
                    data?: ScannerCatalogItem[];
                    code?: string;
                };

                if (!response.ok) {
                    throw new ScannerRequestError(payload.code);
                }

                const results = (payload.data ?? [])
                    .filter((result) => result.captureId === capture.id)
                    .map((result) => ({
                        ...result,
                        skipped: false,
                        quantity: 1,
                    }));

                if (!barcodeMatchedRef.current.has(capture.id)) {
                    setCaptures((current) => {
                        const nextResults =
                            results.length > 0
                                ? results
                                : [unknownResult(capture.id)];
                        const currentCapture = current.find(
                            (item) => item.id === capture.id,
                        );
                        const identity = resultIdentity(nextResults[0]);
                        const duplicate = identity
                            ? current.find(
                                  (item) =>
                                      item.id !== capture.id &&
                                      item.results.some(
                                          (entry) =>
                                              entry.status === 'found' &&
                                              resultIdentity(entry) ===
                                                  identity,
                                      ),
                              )
                            : undefined;

                        if (duplicate && currentCapture) {
                            const quantity =
                                (duplicate.results[0]?.quantity ?? 0) +
                                (currentCapture.results[0]?.quantity ?? 1);

                            if (currentCapture.previewUrl.startsWith('blob:')) {
                                URL.revokeObjectURL(currentCapture.previewUrl);
                            }

                            return current
                                .filter((item) => item.id !== capture.id)
                                .map((item) =>
                                    item.id === duplicate.id
                                        ? {
                                              ...item,
                                              results: item.results.map(
                                                  (entry, index) =>
                                                      index === 0
                                                          ? {
                                                                ...entry,
                                                                quantity,
                                                            }
                                                          : entry,
                                              ),
                                          }
                                        : item,
                                );
                        }

                        return current.map((item) =>
                            item.id === capture.id
                                ? {
                                      ...item,
                                      status: 'recognized',
                                      errorCode: null,
                                      retryable: true,
                                      results: nextResults,
                                  }
                                : item,
                        );
                    });
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    const failure = scannerFailure(
                        error instanceof ScannerRequestError
                            ? error.code
                            : null,
                    );
                    setCaptures((current) =>
                        current.map((item) =>
                            item.id === capture.id
                                ? { ...item, status: 'failed', ...failure }
                                : item,
                        ),
                    );
                }
            } finally {
                controllersRef.current.delete(capture.id);
                setCaptures((current) => [...current]);
            }
        },
        [purpose],
    );

    useEffect(() => {
        if (
            !open ||
            purpose === 'product' ||
            !config.visual_recognition_enabled
        ) {
            return;
        }

        const available = Math.max(0, 2 - controllersRef.current.size);
        captures
            .filter((capture) => capture.status === 'queued')
            .slice(0, available)
            .forEach((capture) => void recognizeCapture(capture));
    }, [
        captures,
        config.visual_recognition_enabled,
        open,
        purpose,
        recognizeCapture,
    ]);

    const lookupBarcode = useCallback(
        async (identifier: string, captureId?: string): Promise<boolean> => {
            const response = await fetch('/scanner/catalog-item-lookups', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    purpose,
                    type: 'barcode',
                    identifier,
                    capture_id: `barcode-${identifier}`,
                }),
            });

            if (!response.ok) {
                return false;
            }

            const payload = (await response.json()) as {
                data: ScannerCatalogItem[];
            };
            const result = payload.data[0];

            if (!result || result.status !== 'found') {
                return false;
            }

            setCaptures((current) => {
                const targetId = captureId ?? result.captureId;
                const nextResult = { ...result, skipped: false, quantity: 1 };
                const currentCapture = current.find(
                    (captureItem) => captureItem.id === targetId,
                );
                const identity = resultIdentity(nextResult);
                const duplicate = identity
                    ? current.find(
                          (captureItem) =>
                              captureItem.id !== targetId &&
                              captureItem.results.some(
                                  (item) =>
                                      item.status === 'found' &&
                                      resultIdentity(item) === identity,
                              ),
                      )
                    : undefined;

                if (duplicate) {
                    const quantity =
                        (duplicate.results[0]?.quantity ?? 0) +
                        (currentCapture?.results[0]?.quantity ?? 1);

                    if (currentCapture?.previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(currentCapture.previewUrl);
                    }

                    return current
                        .filter((item) => item.id !== targetId)
                        .map((item) =>
                            item.id === duplicate.id
                                ? {
                                      ...item,
                                      results: item.results.map(
                                          (entry, index) =>
                                              index === 0
                                                  ? { ...entry, quantity }
                                                  : entry,
                                      ),
                                  }
                                : item,
                        );
                }

                if (currentCapture) {
                    return current.map((item) =>
                        item.id === targetId
                            ? {
                                  ...item,
                                  status: 'recognized' as const,
                                  error: null,
                                  errorCode: null,
                                  retryable: true,
                                  results: [nextResult],
                              }
                            : item,
                    );
                }

                return [
                    ...current,
                    {
                        id: targetId,
                        blob: new Blob(),
                        previewUrl: result.match?.photoUrl ?? '',
                        status: 'recognized' as const,
                        error: null,
                        errorCode: null,
                        retryable: true,
                        results: [nextResult],
                    },
                ];
            });
            navigator.vibrate?.(45);

            return true;
        },
        [purpose],
    );

    useEffect(() => {
        lookupBarcodeRef.current = lookupBarcode;
    }, [lookupBarcode]);

    const removeCapture = useCallback((id: string) => {
        controllersRef.current.get(id)?.abort();
        controllersRef.current.delete(id);
        barcodeMatchedRef.current.delete(id);
        setCaptures((current) => {
            const capture = current.find((item) => item.id === id);

            if (capture?.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(capture.previewUrl);
            }

            return current.filter((item) => item.id !== id);
        });
    }, []);

    const retry = useCallback(
        (id: string) => {
            if (!config.visual_recognition_enabled) {
                return;
            }

            barcodeMatchedRef.current.delete(id);
            setCaptures((current) =>
                current.map((capture) =>
                    capture.id === id
                        ? {
                              ...capture,
                              status: 'queued',
                              error: null,
                              errorCode: null,
                          }
                        : capture,
                ),
            );
        },
        [config.visual_recognition_enabled],
    );

    const replaceBlob = useCallback(
        async (id: string, blob: Blob, normalize = true) => {
            const normalized = normalize ? await normalizeImage(blob) : blob;
            const previewUrl = URL.createObjectURL(normalized);

            controllersRef.current.get(id)?.abort();
            controllersRef.current.delete(id);
            barcodeMatchedRef.current.delete(id);
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
                        blob: normalized,
                        previewUrl,
                        status: config.visual_recognition_enabled
                            ? 'queued'
                            : 'failed',
                        error: config.visual_recognition_enabled
                            ? null
                            : 'Layanan scanner belum terhubung. Hubungi administrator.',
                        errorCode: config.visual_recognition_enabled
                            ? null
                            : 'SCANNER_DISABLED',
                        retryable: config.visual_recognition_enabled,
                        results: [],
                    };
                }),
            );
        },
        [config.visual_recognition_enabled],
    );

    const selectProductCandidate = useCallback(
        (
            captureId: string,
            itemIndex: number,
            candidate: ScannerProductCandidate,
        ) => {
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
                                            selectedOption:
                                                candidate.options.length === 1
                                                    ? candidate.options[0]
                                                    : null,
                                        },
                              ),
                          },
                ),
            );
        },
        [],
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
        [],
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
        [],
    );

    const setResultSkipped = useCallback(
        (captureId: string, itemIndex: number, skipped: boolean) => {
            setCaptures((current) =>
                current.map((capture) =>
                    capture.id !== captureId
                        ? capture
                        : {
                              ...capture,
                              results: capture.results.map((result) =>
                                  result.itemIndex !== itemIndex
                                      ? result
                                      : { ...result, skipped },
                              ),
                          },
                ),
            );
        },
        [],
    );

    const setResultQuantity = useCallback(
        (captureId: string, itemIndex: number, quantity: number) => {
            setCaptures((current) =>
                current.map((capture) =>
                    capture.id !== captureId
                        ? capture
                        : {
                              ...capture,
                              results: capture.results.map((result) =>
                                  result.itemIndex !== itemIndex
                                      ? result
                                      : { ...result, quantity },
                              ),
                          },
                ),
            );
        },
        [],
    );

    const selections = useMemo<ScannerSelection[]>(
        () =>
            captures.flatMap((capture) =>
                capture.results.flatMap((result) => {
                    if (
                        result.skipped === true ||
                        result.match === null ||
                        result.selectedOption === null
                    ) {
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
        controllersRef.current.forEach((controller) => controller.abort());
        controllersRef.current.clear();
        barcodeMatchedRef.current.clear();
        setCaptures((current) => {
            current.forEach((capture) => {
                if (capture.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(capture.previewUrl);
                }
            });

            return [];
        });
        setReviewing(false);
    }, []);

    return {
        captures,
        selections,
        reviewing,
        setReviewing,
        addBlobs,
        lookupBarcode,
        removeCapture,
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
    public constructor(public readonly code: string | undefined) {
        super('Scanner request failed.');
    }
}

function resultIdentity(result: ScannerCatalogItem | undefined): string {
    if (!result?.match) {
        return '';
    }

    const option = result.selectedOption ?? result.match.options[0];

    if (!option) {
        return result.match.productPublicId;
    }

    return [
        result.match.productPublicId,
        option.variantPublicId ?? 'base',
        option.unitId,
    ].join(':');
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
