import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { translate } from '@/lib/i18n';
import { discover as discoverCatalogItem } from '@/routes/scanner/catalog-items';

export type DiscoverySuggestion = {
    item_type: string;
    identity: {
        brand: string | null;
        product_name: string;
        model: string | null;
        variant: string | null;
        display_name: string;
        description: string | null;
    };
    classification: {
        department_code: string;
        category_suggestion: string | null;
    };
    quantity: {
        mode: string | null;
        sale_unit_code: string | null;
        net_content: {
            value: string;
            unit_code: string;
            display: string;
        } | null;
        larger_unit_code: string | null;
        conversion_factor: string | null;
    };
    pricing: {
        estimated_purchase_price: string | null;
        recommended_selling_price: string | null;
        currency: string;
        basis: string;
        confidence: number | null;
    };
    quality: {
        confidence: number | null;
        uncertain_fields: string[];
        issues: string[];
        warnings: string[];
        unit_issues?: Array<{
            code: 'unit_missing' | 'unit_unsupported' | 'net_content_incomplete' | 'conversion_ungrounded';
            field: string;
            observed_text: string | null;
        }>;
    };
};

export type ProductDraft = {
    id: string;
    requestId: string;
    file: File | null;
    previewUrl: string;
    barcode: string;
    status: 'waiting' | 'analyzing' | 'retry_wait' | 'ready' | 'failed';
    suggestion: DiscoverySuggestion | null;
    error: string | null;
    applied: boolean;
    attempts: number;
    retryAt: number;
    startedAt: number;
};

export function useProductDrafts() {
    const [drafts, setDrafts] = useState<ProductDraft[]>([]);
    const draftsRef = useRef<ProductDraft[]>([]);
    const controllerRef = useRef<AbortController | null>(null);
    const mounted = useRef(true);
    const update = useCallback((change: (current: ProductDraft[]) => ProductDraft[]) => {
        draftsRef.current = change(draftsRef.current);

        if (mounted.current) {
            setDrafts(draftsRef.current);
        }
    }, []);

    useEffect(() => {
        mounted.current = true;

        return () => {
            mounted.current = false;
            controllerRef.current?.abort();
            draftsRef.current.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
        };
    }, []);

    useEffect(() => {
        const dispatch = async () => {
            if (controllerRef.current || document.hidden || !navigator.onLine) {
                return;
            }

            const draft = draftsRef.current.find(
                (item) => item.status === 'waiting' || (item.status === 'retry_wait' && item.retryAt <= Date.now()),
            );

            if (!draft) {
                return;
            }

            const controller = new AbortController();

            controllerRef.current = controller;
            const timeout = window.setTimeout(() => controller.abort(), 45000);
            const startedAt = draft.startedAt || Date.now();
            const attempts = draft.attempts + 1;
            update((current) =>
                current.map((item) => (item.id === draft.id ? { ...item, status: 'analyzing', startedAt, attempts, error: null } : item)),
            );
            const form = new FormData();
            form.append('purpose', 'product');
            form.append('scan_request_id', draft.requestId);

            if (draft.file) {
                form.append('images[]', draft.file, draft.file.name);
            }

            try {
                const response = await apiClient.post<{
                    data?: DiscoverySuggestion;
                    message?: string;
                    code?: string;
                    retryable?: boolean;
                    retry_after_ms?: number;
                }>(discoverCatalogItem.url(), form, { signal: controller.signal });
                const payload = response.body;

                if (!response.ok || !payload.data) {
                    const delay = Math.min(
                        10000,
                        Math.max(
                            0,
                            payload.retry_after_ms ??
                                (Number(response.headers.get('Retry-After')) * 1000 ||
                                    Math.min(2000, 1000 * 2 ** (attempts - 1)) + Math.random() * 500),
                        ),
                    );

                    if (
                        [429, 503].includes(response.status) &&
                        payload.retryable &&
                        attempts < 3 &&
                        Date.now() + delay - startedAt < 30000
                    ) {
                        update((current) =>
                            current.map((item) =>
                                item.id === draft.id ? { ...item, status: 'retry_wait', retryAt: Date.now() + delay } : item,
                            ),
                        );

                        return;
                    }

                    throw new Error(payload.message || translate('Analysis failed. Enter the product manually or try again.'));
                }

                const recognized =
                    (payload.data.quality.confidence ?? 0) > 0 &&
                    !!payload.data.identity.product_name.trim() &&
                    payload.data.identity.product_name.trim().toLowerCase() !== 'tidak tersedia';
                update((current) =>
                    current.map((item) =>
                        item.id === draft.id
                            ? {
                                  ...item,
                                  status: recognized ? 'ready' : 'failed',
                                  suggestion: recognized ? payload.data! : null,
                                  error: recognized ? null : translate('Product not recognized. Take another photo or enter it manually.'),
                              }
                            : item,
                    ),
                );
            } catch (error) {
                if (mounted.current) {
                    update((current) =>
                        current.map((item) =>
                            item.id === draft.id
                                ? {
                                      ...item,
                                      status: 'failed',
                                      error: error instanceof Error ? error.message : translate('Analysis failed.'),
                                  }
                                : item,
                        ),
                    );
                }
            } finally {
                window.clearTimeout(timeout);
                controllerRef.current = null;
            }
        };
        void dispatch();
        const timer = window.setInterval(() => void dispatch(), 250);

        return () => window.clearInterval(timer);
    }, [update]);

    const addPhoto = useCallback(
        (file: File) => {
            const current = draftsRef.current;
            const pending = current
                .filter((draft) => ['waiting', 'analyzing', 'retry_wait'].includes(draft.status))
                .reduce((sum, draft) => sum + (draft.file ? 1 : 0), 0);

            if (pending >= 10) {
                return false;
            }

            update((items) => [
                ...items,
                {
                    id: crypto.randomUUID(),
                    requestId: crypto.randomUUID(),
                    file,
                    previewUrl: URL.createObjectURL(file),
                    barcode: '',
                    status: 'waiting',
                    suggestion: null,
                    error: null,
                    applied: false,
                    attempts: 0,
                    retryAt: 0,
                    startedAt: 0,
                },
            ]);

            return true;
        },
        [update],
    );
    const remove = useCallback(
        (id: string) => {
            update((current) => {
                const removed = current.find((draft) => draft.id === id);

                if (removed) {
                    URL.revokeObjectURL(removed.previewUrl);
                }

                return current.filter((draft) => draft.id !== id);
            });
        },
        [update],
    );
    const retry = useCallback(
        (id: string) => {
            update((current) => {
                const pending = current
                    .filter((draft) => ['waiting', 'analyzing', 'retry_wait'].includes(draft.status))
                    .reduce((sum, draft) => sum + (draft.file ? 1 : 0), 0);

                return current.map((draft) => {
                    if (draft.id !== id || draft.status !== 'failed') {
                        return draft;
                    }

                    if (pending + (draft.file ? 1 : 0) > 10) {
                        return { ...draft, error: 'Antrean penuh. Tunggu pemrosesan sebelum mencoba lagi.' };
                    }

                    return { ...draft, status: 'waiting', attempts: 0, startedAt: 0, error: null };
                });
            });
        },
        [update],
    );
    const markApplied = useCallback(
        (id: string) => update((current) => current.map((draft) => (draft.id === id ? { ...draft, applied: true } : draft))),
        [update],
    );
    const pendingPhotos = drafts
        .filter((draft) => ['waiting', 'analyzing', 'retry_wait'].includes(draft.status))
        .reduce((sum, draft) => sum + (draft.file ? 1 : 0), 0);

    return { drafts, pendingPhotos, addPhoto, remove, retry, markApplied };
}
