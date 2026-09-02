import { useCallback, useEffect, useRef, useState } from 'react';

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
    };
};

export type ProductDraft = {
    id: string;
    file: File;
    previewUrl: string;
    status: 'waiting' | 'analyzing' | 'ready' | 'failed';
    suggestion: DiscoverySuggestion | null;
    error: string | null;
    applied: boolean;
};

const csrfToken = () => {
    const value = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
        ?.split('=')
        .slice(1)
        .join('=');

    return value ? decodeURIComponent(value) : '';
};

export function useProductDrafts() {
    const [drafts, setDrafts] = useState<ProductDraft[]>([]);
    const draftsRef = useRef<ProductDraft[]>([]);
    const controllers = useRef(new Map<string, AbortController>());

    useEffect(() => {
        draftsRef.current = drafts;
    }, [drafts]);

    useEffect(
        () => () => {
            controllers.current.forEach((controller) => controller.abort());
            draftsRef.current.forEach((draft) =>
                URL.revokeObjectURL(draft.previewUrl),
            );
        },
        [],
    );

    const analyze = useCallback(async (draft: ProductDraft) => {
        const controller = new AbortController();
        controllers.current.set(draft.id, controller);
        setDrafts((current) =>
            current.map((item) =>
                item.id === draft.id
                    ? { ...item, status: 'analyzing', error: null }
                    : item,
            ),
        );

        const form = new FormData();
        form.append('purpose', 'product');
        form.append('market', 'ID');
        form.append('images[]', draft.file, draft.file.name);

        try {
            const response = await fetch('/scanner/catalog-item-discoveries', {
                method: 'POST',
                body: form,
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const payload = (await response.json()) as {
                data?: DiscoverySuggestion;
                message?: string;
            };

            if (!response.ok || !payload.data) {
                throw new Error(payload.message || 'Discovery gagal.');
            }

            setDrafts((current) =>
                current.map((item) =>
                    item.id === draft.id
                        ? {
                              ...item,
                              status: 'ready',
                              suggestion: payload.data ?? null,
                              error: null,
                          }
                        : item,
                ),
            );
        } catch (error) {
            if (!controller.signal.aborted) {
                setDrafts((current) =>
                    current.map((item) =>
                        item.id === draft.id
                            ? {
                                  ...item,
                                  status: 'failed',
                                  error:
                                      error instanceof Error
                                          ? error.message
                                          : 'Discovery gagal. Isi manual atau coba lagi.',
                              }
                            : item,
                    ),
                );
            }
        } finally {
            controllers.current.delete(draft.id);
        }
    }, []);

    useEffect(() => {
        const available = Math.max(0, 2 - controllers.current.size);
        drafts
            .filter((draft) => draft.status === 'waiting')
            .slice(0, available)
            .forEach((draft) => void analyze(draft));
    }, [analyze, drafts]);

    const start = useCallback((files: File[], append = false) => {
        const next = files.map((file): ProductDraft => ({
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            status: 'waiting',
            suggestion: null,
            error: null,
            applied: false,
        }));
        setDrafts((current) => (append ? [...current, ...next] : next));

        return next;
    }, []);

    const remove = useCallback((id: string) => {
        controllers.current.get(id)?.abort();
        controllers.current.delete(id);
        setDrafts((current) => {
            const draft = current.find((item) => item.id === id);

            if (draft) {
                URL.revokeObjectURL(draft.previewUrl);
            }

            return current.filter((item) => item.id !== id);
        });
    }, []);

    const retry = useCallback((id: string) => {
        setDrafts((current) =>
            current.map((draft) =>
                draft.id === id
                    ? {
                          ...draft,
                          status: 'waiting',
                          suggestion: null,
                          error: null,
                          applied: false,
                      }
                    : draft,
            ),
        );
    }, []);

    const markApplied = useCallback((id: string) => {
        setDrafts((current) =>
            current.map((draft) =>
                draft.id === id ? { ...draft, applied: true } : draft,
            ),
        );
    }, []);

    const clear = useCallback(() => {
        controllers.current.forEach((controller) => controller.abort());
        controllers.current.clear();
        setDrafts((current) => {
            current.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));

            return [];
        });
    }, []);

    return { drafts, start, remove, retry, markApplied, clear };
}
