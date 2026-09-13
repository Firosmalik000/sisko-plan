import { Link, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Barcode,
    Boxes,
    Camera,
    ChevronRight,
    LoaderCircle,
    PackagePlus,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Settings2,
    Trash2,
} from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import AlertError from '@/components/alert-error';
import { FormBarcodeInput, FormCurrencyInput, FormField, FormInput, FormSelect, FormTextarea } from '@/components/forms';
import InputError from '@/components/input-error';
import { MasterDataMenu } from '@/components/navigation/master-data-menu';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { DataToolbar } from '@/components/page/data-toolbar';
import { EmptyState } from '@/components/page/empty-state';
import { RecordList, RecordListHeader } from '@/components/page/record-list';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { SubscriptionLimitContactDialog } from '@/components/subscription-limit-contact-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BarcodeScannerDialog from '@/components/widgets/product-scanner/barcode-scanner-dialog';
import { prepareScannerTone } from '@/components/widgets/product-scanner/scanner-feedback';
import type { ScannerConfig } from '@/components/widgets/product-scanner/types';
import { useConfirmation } from '@/hooks/use-confirmation';
import { useProductDrafts } from '@/hooks/use-product-drafts';
import type { DiscoverySuggestion, ProductDraft } from '@/hooks/use-product-drafts';
import { apiClient } from '@/lib/api-client';
import { translate } from '@/lib/i18n';
import { resolveCategory, resolveUnit } from '@/lib/unit-references';
import { cn } from '@/lib/utils';
import { index as categoriesIndex } from '@/routes/master-data/categories';
import {
    deactivate as deactivateProductRoute,
    destroy as destroyProduct,
    index as productsIndex,
    store as storeProduct,
    update as updateProduct,
} from '@/routes/master-data/products';
import { index as unitsIndex } from '@/routes/master-data/units';
import { lookup as lookupCatalogItem } from '@/routes/scanner/catalog-items';
import {
    createBlankProductForm,
    createBlankVariant,
    formatProductDecimal,
    generateInternalBarcode,
    generateProductSku,
    mapProductToForm,
} from './product-model';
import type { Product, ProductForm, ProductOption, ProductVariant, SubscriptionState, UnitOption, VariantMode } from './product-model';
import { ProductPhoto, ProductRow } from './product-presentation';

type ScannerFlow = 'create' | 'form-photo' | 'variant-photo';
type BarcodeTarget = { kind: 'product'; label: string } | { kind: 'variant'; index: number; label: string };

const ProductScanner = lazy(() => import('@/components/widgets/product-scanner/product-scanner'));
function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <Label className="mb-2 block text-sm font-semibold text-foreground">{translate(label)}</Label>
            {children}
            <InputError message={error} className="mt-1.5" />
        </div>
    );
}

function SkuField({
    id,
    name,
    value,
    productName,
    error,
    onChange,
}: {
    id: string;
    name: string;
    value: string;
    productName: string;
    error?: string;
    onChange: (value: string) => void;
}) {
    return (
        <FormField id={id} label={translate('SKU')} error={error}>
            <div className="flex h-11 min-w-0 overflow-hidden rounded-xl border border-input bg-background transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-2 has-[input[aria-invalid=true]]:ring-destructive/20">
                <Input
                    id={id}
                    name={name}
                    value={value}
                    placeholder={translate('Example: COFFEE-250')}
                    onChange={(event) => onChange(event.target.value)}
                    aria-invalid={Boolean(error)}
                    className="h-full rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                <Button
                    type="button"
                    variant="ghost"
                    disabled={!productName.trim()}
                    onClick={() => onChange(generateProductSku(productName))}
                    aria-label={translate('Create SKU otomatis')}
                    title={translate('Create SKU otomatis')}
                    className="h-full shrink-0 rounded-none border-l px-3"
                >
                    <RefreshCw className="size-4" />
                    <span>{translate('Generate')}</span>
                </Button>
            </div>
        </FormField>
    );
}

function ProductPhotoInput({
    photo,
    photoUrl,
    variantName,
    onCamera,
    onRemove,
}: {
    photo: File | null;
    photoUrl?: string | null;
    variantName: string;
    onCamera: () => void;
    onRemove: () => void;
}) {
    const attachPhoto = useCallback(
        (node: HTMLImageElement | null) => {
            if (!node || !photo) {
                return;
            }

            const url = URL.createObjectURL(photo);
            node.src = url;

            return () => URL.revokeObjectURL(url);
        },
        [photo],
    );
    const hasPhoto = Boolean(photo || photoUrl);

    return (
        <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-border bg-card p-2">
            {photo ? (
                <img
                    ref={attachPhoto}
                    src={photoUrl ?? undefined}
                    alt={translate(':name photo', { name: variantName || translate('variant') })}
                    className="size-12 rounded-lg object-cover"
                />
            ) : (
                <ProductPhoto
                    src={photoUrl}
                    alt={translate(':name photo', { name: variantName || translate('variant') })}
                    className="size-12 rounded-lg object-cover"
                    fallbackClassName="grid size-12 place-items-center rounded-lg bg-secondary text-primary"
                />
            )}
            <div className="flex min-w-0 items-center gap-1">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCamera}
                    className="min-h-11 min-w-0 flex-1 gap-1 px-2 text-xs text-primary"
                >
                    <Camera className="size-4" />
                    {translate('Take photo')}
                </Button>
                {hasPhoto && (
                    <button
                        type="button"
                        onClick={onRemove}

                        aria-label={translate('Delete photo')}
                        title={translate('Delete photo')}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:outline-none"
                    >
                        <Trash2 className="size-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="min-w-0 border-b border-border bg-card px-4 py-5 last:border-b-0 sm:rounded-xl sm:border sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-foreground sm:text-lg">{translate(title)}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

export default function ProductsIndex({
    products,
    categories,
    units,
    search: initialSearch,
    status: initialStatus,
    category: initialCategory,
    canManage,
}: {
    products: { data: Product[]; links: PaginationLink[]; total: number };
    categories: ProductOption[];
    units: UnitOption[];
    search: string;
    status: string;
    category: string;
    canManage: boolean;
}) {
    const { subscriptionState, scanner: scannerConfig } = usePage<{
        subscriptionState: SubscriptionState | null;
        scanner: ScannerConfig;
    }>().props;
    const aiDiscoveryAvailable = scannerConfig.visual_recognition_enabled && scannerConfig.ai_scan_available;
    const productLimitReached = Boolean(
        subscriptionState?.can_write &&
        subscriptionState.max_products > 0 &&
        subscriptionState.products_used >= subscriptionState.max_products,
    );
    const [editing, setEditing] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState<Product | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [productLimitOpen, setProductLimitOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [search, setSearch] = useState(initialSearch);
    const [status, setStatus] = useState(initialStatus);
    const [category, setCategory] = useState(initialCategory);
    const [scannerOpen, setScannerOpen] = useState(
        () =>
            canManage &&
            !productLimitReached &&
            typeof window !== 'undefined' &&
            new URL(window.location.href).searchParams.get('scan') === '1',
    );
    const [scannerFlow, setScannerFlow] = useState<ScannerFlow>('create');
    const [variantPhotoIndex, setVariantPhotoIndex] = useState<number | null>(null);
    const [existingBarcodeProduct, setExistingBarcodeProduct] = useState<{ name: string; barcode: string } | null>(null);
    const [barcodeTarget, setBarcodeTarget] = useState<BarcodeTarget | null>(null);
    const [discoveryPrefill, setDiscoveryPrefill] = useState(false);
    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
    const [mobileFormHeight, setMobileFormHeight] = useState<number | undefined>();
    useEffect(() => {
        const viewport = window.visualViewport;
        const resize = () => setMobileFormHeight(window.innerWidth < 640 ? viewport?.height : undefined);
        resize();
        viewport?.addEventListener('resize', resize);
        window.addEventListener('resize', resize);

        return () => {
            viewport?.removeEventListener('resize', resize);
            window.removeEventListener('resize', resize);
        };
    }, []);
    const cameraFormScroll = useRef(0);
    const formBodyRef = useRef<HTMLDivElement>(null);
    const allowNavigationRef = useRef(false);
    const pendingVariantIdRef = useRef<string | null>(null);
    const draftForms = useRef(new Map<string, ProductForm>());
    const draftDirty = useRef(new Map<string, Set<keyof ProductForm>>());
    const previousDraftForm = useRef<ProductForm | null>(null);
    const productDrafts = useProductDrafts();
    const confirm = useConfirmation();
    const form = useForm<ProductForm>(createBlankProductForm());
    const errorFor = (key: string) => (form.errors as Record<string, string | undefined>)[key];
    const retailUnits = units.filter((unit) => unit.unit_type === 'retail');
    const largeUnits = units.filter((unit) => unit.unit_type === 'large');
    const activeDraft = productDrafts.drafts.find((draft) => draft.id === activeDraftId);
    const activeDraftIndex = productDrafts.drafts.findIndex((draft) => draft.id === activeDraftId);
    useEffect(() => {
        const hasDraft = productDrafts.drafts.length > 0 || form.isDirty;

        if (!hasDraft) {
            return;
        }

        const unsubscribe = router.on('before', (event) => {
            if (allowNavigationRef.current) {
                allowNavigationRef.current = false;

                return;
            }

            if (event.detail.visit.method === 'get' && event.detail.visit.url.pathname !== window.location.pathname) {
                event.preventDefault();
                const url = event.detail.visit.url;

                void confirm({
                    title: 'Leave this page?',
                    description: 'Unsaved product changes will be lost.',
                    confirmLabel: 'Leave',
                    variant: 'destructive',
                }).then((confirmed) => {
                    if (confirmed) {
                        allowNavigationRef.current = true;
                        router.visit(url);
                    }
                });
            }
        });

        return unsubscribe;
    }, [confirm, form.isDirty, productDrafts.drafts.length]);

    const requestDelete = async (product: Product) => {
        const confirmed = await confirm({
            title: `${translate('Delete product')} ${product.name}?`,
            description: 'Products used in transactions or inventory cannot be deleted.',
            confirmLabel: 'Delete product',
            variant: 'destructive',
        });

        if (!confirmed) {
            return;
        }

        router.delete(destroyProduct.url(product.public_id), {
            preserveScroll: true,
            onError: (errors) => {
                setDeleting(product);
                setDeleteError(errors.product ?? translate('The product could not be deleted. Try again.'));
            },
        });
    };
    const deactivateProduct = () => {
        if (!deleting || deleteProcessing) {
            return;
        }

        setDeleteProcessing(true);
        setDeleteError('');
        router.patch(
            deactivateProductRoute.url(deleting.public_id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => setDeleting(null),
                onError: (errors) => {
                    setDeleteError(errors.product ?? translate('The product could not be deactivated. Try again.'));
                },
                onFinish: () => setDeleteProcessing(false),
            },
        );
    };
    const analyzingDrafts = productDrafts.drafts.filter((draft) => ['waiting', 'analyzing', 'retry_wait'].includes(draft.status)).length;

    useEffect(() => {
        const url = new URL(window.location.href);

        if (!scannerOpen || url.searchParams.get('scan') !== '1') {
            return;
        }

        url.searchParams.delete('scan');
        window.history.replaceState({}, '', url);
    }, [scannerOpen]);

    useEffect(() => {
        const variantId = pendingVariantIdRef.current;

        if (!variantId) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            const body = formBodyRef.current;
            const input = document.getElementById(`variant-name-${variantId}`);
            const card = input?.closest<HTMLElement>('[data-variant-card]');

            if (!body || !input || !card) {
                return;
            }

            const bodyRect = body.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            body.scrollTo({
                top: body.scrollTop + cardRect.top - bodyRect.top - 12,
                behavior: 'smooth',
            });
            input.focus({ preventScroll: true });
            pendingVariantIdRef.current = null;
        });

        return () => window.cancelAnimationFrame(frame);
    }, [form.data.variants.length]);

    const closeForm = () => {
        if (activeDraftId) {
            draftForms.current.set(activeDraftId, form.data);
        }

        setFormOpen(false);
        form.clearErrors();
    };
    const openManualCreate = (barcode = '') => {
        if (activeDraftId) {
            draftForms.current.set(activeDraftId, form.data);
        }

        if (!barcode && productDrafts.drafts.length) {
            openDraft(productDrafts.drafts.find((draft) => draft.id === activeDraftId) ?? productDrafts.drafts[0]);

            return;
        }

        setActiveDraftId(null);
        setDiscoveryPrefill(false);
        setEditing(null);
        form.setData({ ...createBlankProductForm(), barcode });
        form.clearErrors();
        setFormOpen(true);
    };
    const openCreate = () => {
        prepareScannerTone();
        setScannerFlow('create');
        setScannerOpen(true);
    };
    const openFormPhotoScanner = () => {
        prepareScannerTone();
        cameraFormScroll.current = formBodyRef.current?.scrollTop ?? 0;
        setScannerFlow('form-photo');
        setScannerOpen(true);
    };
    const openEdit = (product: Product) => {
        setActiveDraftId(null);
        setDiscoveryPrefill(false);
        setEditing(product);
        form.setData(mapProductToForm(product));
        form.clearErrors();
        setFormOpen(true);
    };
    const setMode = (mode: VariantMode) => {
        const firstVariant = createBlankVariant();
        firstVariant.barcode = form.data.barcode;
        firstVariant.name = activeDraft?.suggestion?.identity.variant?.trim() ?? '';
        firstVariant.photo = form.data.photo;
        firstVariant.sku = form.data.sku;
        firstVariant.purchase_price = form.data.purchase_price;
        firstVariant.selling_price = form.data.selling_price;
        firstVariant.current_stock = form.data.current_stock;
        firstVariant.minimum_stock = form.data.minimum_stock;
        form.setData({
            ...form.data,
            variant_mode: mode,
            variants: form.data.variants.length ? form.data.variants : [firstVariant],
        });
    };
    const updateVariantFields = (index: number, changes: Partial<ProductVariant>) =>
        form.setData(
            'variants',
            form.data.variants.map((variant, current) => (current === index ? { ...variant, ...changes } : variant)),
        );
    const updateVariant = (index: number, key: keyof ProductVariant, value: ProductVariant[keyof ProductVariant]) =>
        updateVariantFields(index, { [key]: value });
    const suggestionValues = useCallback(
        (suggestion: DiscoverySuggestion) => {
            const category = resolveCategory(categories, suggestion.classification.department_code);
            const retailUnit = resolveUnit(units, suggestion.quantity.sale_unit_code, 'retail');
            const largeUnit = resolveUnit(units, suggestion.quantity.larger_unit_code, 'large');

            return {
                name: suggestion.identity.display_name,
                description: suggestion.identity.description ?? '',
                category_public_id: category?.public_id ?? '',
                retail_unit_public_id: retailUnit?.public_id ?? '',
                quantity_mode: suggestion.quantity.mode === 'fixed' ? ('fixed' as const) : ('variable' as const),
                large_unit_public_id: largeUnit?.public_id ?? '',
                purchase_price: String(suggestion.pricing.estimated_purchase_price ?? ''),
                selling_price: String(suggestion.pricing.recommended_selling_price ?? ''),
            };
        },
        [categories, units],
    );
    useEffect(() => {
        if (!activeDraftId) {
            return;
        }

        const previous = previousDraftForm.current;
        const dirty = draftDirty.current.get(activeDraftId) ?? new Set<keyof ProductForm>();

        if (previous) {
            (Object.keys(form.data) as Array<keyof ProductForm>).forEach((key) => {
                if (previous[key] !== form.data[key]) {
                    dirty.add(key);
                }
            });
        }

        draftDirty.current.set(activeDraftId, dirty);
        draftForms.current.set(activeDraftId, form.data);
        previousDraftForm.current = form.data;
    }, [activeDraftId, form.data]);
    const openDraft = (draft: ProductDraft) => {
        if (activeDraftId) {
            draftForms.current.set(activeDraftId, form.data);
        }

        const cached = draftForms.current.get(draft.id);
        const suggestion = draft.suggestion ? suggestionValues(draft.suggestion) : null;
        const next = cached ?? {
            ...createBlankProductForm(),
            ...suggestion,
            current_stock: '0',
            minimum_stock: '0',
            barcode: draft.barcode,
            photo: draft.file,
        };
        previousDraftForm.current = next;
        form.setData(next);

        if (!cached && suggestion) {
            productDrafts.markApplied(draft.id);
        }

        setEditing(null);
        setActiveDraftId(draft.id);
        setDiscoveryPrefill(draft.status === 'ready');
        form.clearErrors();
        setFormOpen(true);
    };
    const handleProductCapture = (photo: File) => {
        if (scannerFlow === 'create') {
            if (!aiDiscoveryAvailable) {
                setActiveDraftId(null);
                setDiscoveryPrefill(false);
                setEditing(null);
                form.setData({ ...createBlankProductForm(), photo });
                form.clearErrors();
                setScannerOpen(false);
                setFormOpen(true);

                return;
            }

            productDrafts.addPhoto(photo);

            return;
        }

        if (scannerFlow === 'variant-photo' && variantPhotoIndex !== null) {
            updateVariantFields(variantPhotoIndex, { photo, remove_photo: false });

            return;
        }

        form.setData({ ...form.data, photo, remove_photo: false });
        setFormOpen(true);
    };
    const relatedDraft = activeDraft?.suggestion
        ? productDrafts.drafts.find((draft) => {
              if (draft.id === activeDraft.id || !draft.suggestion) {
                  return false;
              }

              const identity = activeDraft.suggestion!.identity;
              const other = draft.suggestion.identity;
              const normalize = (value: string | null) => (value ?? '').trim().toLocaleLowerCase();

              return (
                  !!normalize(identity.product_name) &&
                  normalize(identity.product_name) === normalize(other.product_name) &&
                  normalize(identity.brand) === normalize(other.brand) &&
                  normalize(identity.model) === normalize(other.model)
              );
          })
        : undefined;
    const combineDraft = (target: ProductDraft, asVariant: boolean) => {
        if (!activeDraft || target.id === activeDraft.id) {
            return;
        }

        const sourceId = activeDraft.id;
        const targetForm = draftForms.current.get(target.id) ?? {
            ...createBlankProductForm(),
            ...(target.suggestion ? suggestionValues(target.suggestion) : {}),
            photo: target.file,
            barcode: target.barcode,
        };

        if (asVariant) {
            const first = {
                ...createBlankVariant(),
                name: target.suggestion?.identity.variant || targetForm.name,
                sku: targetForm.sku,
                barcode: targetForm.barcode,
                purchase_price: targetForm.purchase_price,
                selling_price: targetForm.selling_price,
                current_stock: targetForm.current_stock,
                minimum_stock: targetForm.minimum_stock,
                photo: targetForm.photo,
            };
            const incoming = {
                ...createBlankVariant(),
                name: activeDraft.suggestion?.identity.variant || form.data.name,
                sku: form.data.sku,
                barcode: form.data.barcode,
                purchase_price: form.data.purchase_price,
                selling_price: form.data.selling_price,
                current_stock: form.data.current_stock,
                minimum_stock: form.data.minimum_stock,
                photo: form.data.photo,
            };
            draftForms.current.set(target.id, {
                ...targetForm,
                variant_mode: targetForm.variant_mode === 'none' ? 'separate' : targetForm.variant_mode,
                variants: [...(targetForm.variants.length ? targetForm.variants : [first]), incoming],
            });
        }

        openDraft(target);
        productDrafts.remove(sourceId);
        draftForms.current.delete(sourceId);
        draftDirty.current.delete(sourceId);
    };
    const reviewDrafts = (id?: string) => {
        const drafts = productDrafts.drafts;
        setScannerOpen(false);
        const draft = drafts.find((item) => item.id === (id ?? activeDraftId)) ?? drafts[0];

        if (draft) {
            openDraft(draft);
        }
    };
    const handleScannerOpenChange = (open: boolean) => {
        setScannerOpen(open);

        if (!open && scannerFlow !== 'create') {
            setFormOpen(true);
            requestAnimationFrame(() => {
                if (formBodyRef.current) {
                    formBodyRef.current.scrollTop = cameraFormScroll.current;
                }
            });
        }
    };

    useEffect(() => {
        const active = productDrafts.drafts.find((draft) => draft.id === activeDraftId);

        if (!active || active.status !== 'ready' || active.applied || !active.suggestion) {
            return;
        }

        const discoverySuggestion = active.suggestion;
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) {
                return;
            }

            const suggestion = suggestionValues(discoverySuggestion);
            const dirty = draftDirty.current.get(active.id) ?? new Set<keyof ProductForm>();
            let next = { ...form.data };
            (Object.keys(suggestion) as Array<keyof typeof suggestion>).forEach((key) => {
                if (!dirty.has(key)) {
                    next = { ...next, [key]: suggestion[key] };
                }
            });
            previousDraftForm.current = next;
            form.setData(next);
            setDiscoveryPrefill(true);
            productDrafts.markApplied(active.id);
        });

        return () => {
            cancelled = true;
        };
    }, [activeDraftId, form, productDrafts, suggestionValues]);
    const removeDraft = (draftId: string) => {
        const remaining = productDrafts.drafts.filter((draft) => draft.id !== draftId);
        const wasActive = draftId === activeDraftId;
        productDrafts.remove(draftId);
        draftForms.current.delete(draftId);
        draftDirty.current.delete(draftId);

        if (!wasActive) {
            return;
        }

        if (scannerOpen) {
            setActiveDraftId(null);
            setFormOpen(false);

            return;
        }

        if (remaining[0]) {
            openDraft(remaining[0]);
        } else {
            closeForm();
            prepareScannerTone();
            setScannerFlow('create');
            setScannerOpen(true);
        }
    };
    const removeVariant = (index: number) =>
        form.setData(
            'variants',
            form.data.variants.filter((_, current) => current !== index),
        );
    const addVariant = () => {
        const variant = createBlankVariant();
        pendingVariantIdRef.current = variant.client_id ?? null;
        form.setData('variants', [...form.data.variants, variant]);
    };
    const lookupExistingBarcode = async (value: string) => {
        const duplicateVariant = form.data.variants.some(
            (variant, index) =>
                variant.barcode.trim() === value.trim() && (barcodeTarget?.kind !== 'variant' || barcodeTarget.index !== index),
        );

        if (form.data.variant_mode !== 'none' && duplicateVariant) {
            throw new Error(translate('This code is used more than once on the same product.'));
        }

        const response = await apiClient.post<{
            data?: Array<{ status: string; match: { name: string; productPublicId: string } | null }>;
            message?: string;
        }>(lookupCatalogItem.url(), {
            purpose: 'product',
            type: 'barcode',
            identifier: value,
            capture_id: crypto.randomUUID(),
        });

        if (!response.ok) {
            throw new Error(response.body.message || translate('The barcode could not be checked. Try again.'));
        }

        const match = response.body.data?.find((item) => item.status === 'found')?.match;

        if (match && match.productPublicId !== editing?.public_id) {
            setExistingBarcodeProduct({ name: match.name, barcode: value });
            setScannerOpen(false);
            setBarcodeTarget(null);

            return true;
        }

        return false;
    };
    const applyScannedBarcode = async (value: string) => {
        if (await lookupExistingBarcode(value)) {
            return;
        }

        if (barcodeTarget?.kind === 'variant') {
            updateVariant(barcodeTarget.index, 'barcode', value);

            return;
        }

        form.setData('barcode', value);
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            sku: data.variant_mode === 'none' ? data.sku : '',
            barcode: data.variant_mode === 'none' ? data.barcode : '',
            variants: (data.variant_mode === 'none' ? [] : data.variants).map((variant) => {
                const submittedVariant = { ...variant };
                delete submittedVariant.client_id;

                return submittedVariant;
            }),
        }));
        form.post(editing ? updateProduct.url(editing.public_id) : storeProduct.url(), {
            forceFormData: true,
            preserveScroll: true,
            onError: () => {
                requestAnimationFrame(() => {
                    const body = formBodyRef.current;

                    if (!body) {
                        return;
                    }

                    body.scrollTop = 0;
                });
            },
            onSuccess: () => {
                if (!activeDraftId) {
                    closeForm();

                    return;
                }

                const remaining = productDrafts.drafts.filter((draft) => draft.id !== activeDraftId);
                productDrafts.remove(activeDraftId);
                draftForms.current.delete(activeDraftId);
                draftDirty.current.delete(activeDraftId);

                if (remaining[0]) {
                    openDraft(remaining[0]);
                } else {
                    closeForm();
                    setActiveDraftId(null);
                }
            },
        });
    };
    const applyFilters = () => router.get(productsIndex.url(), { search, status, category }, { preserveState: true, replace: true });
    const resetFilters = () => {
        setSearch('');
        setStatus('');
        setCategory('');
        router.get(productsIndex.url(), {}, { preserveState: true, replace: true });
    };
    const hasFilters = search !== '' || status !== '' || category !== '';

    return (
        <>
            <AppPage
                title={translate('Product')}
                icon={Barcode}
                headerSurface
                description={
                    <>
                        <strong>{products.total}</strong> {translate('products')}
                    </>
                }
                actions={
                    canManage && !productLimitReached ? (
                        <>
                            <Button onClick={() => openManualCreate()} variant="outline" className="min-h-11 font-semibold">
                                <Plus className="size-4" aria-hidden="true" /> {translate('Manual entry')}
                            </Button>
                            <Button onClick={openCreate} className="min-h-11 font-semibold">
                                <Camera className="size-4" aria-hidden="true" /> {translate('Scan product')}
                            </Button>
                        </>
                    ) : canManage && productLimitReached ? (
                        <Button type="button" variant="outline" className="min-h-11" onClick={() => setProductLimitOpen(true)}>
                            <PackagePlus className="size-4" aria-hidden="true" /> {translate('Increase product capacity')}
                        </Button>
                    ) : undefined
                }
            >
                <RecordList className="-mx-3 rounded-none border-y border-border min-[375px]:-mx-4 sm:mx-0 sm:rounded-xl sm:border-0">
                    <DataToolbar
                        onSubmit={(event) => {
                            event.preventDefault();
                            applyFilters();
                        }}
                        search={
                            <div className="relative">
                                <Search
                                    className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={translate('Search product')}
                                    aria-label={translate('Search product')}
                                    className="h-11 bg-background pl-9"
                                />
                            </div>
                        }
                        filters={
                            <>
                                <select
                                    value={category}
                                    onChange={(event) => setCategory(event.target.value)}
                                    className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-40 sm:flex-none"
                                    aria-label={translate('Filter category')}
                                >
                                    <option value="">{translate('All category')}</option>
                                    {categories.map((item) => (
                                        <option key={item.public_id} value={item.public_id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={status}
                                    onChange={(event) => setStatus(event.target.value)}
                                    className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-36 sm:flex-none"
                                    aria-label={translate('Status filters')}
                                >
                                    <option value="">{translate('All status')}</option>
                                    <option value="active">{translate('Active')}</option>
                                    <option value="inactive">{translate('Inactive')}</option>
                                </select>
                            </>
                        }
                        actions={
                            <>
                                <MasterDataMenu />
                                {hasFilters && (
                                    <Button type="button" variant="ghost" onClick={resetFilters} className="h-11">
                                        <RotateCcw className="size-4" aria-hidden="true" /> {translate('Reset')}
                                    </Button>
                                )}
                                <Button type="submit" variant="outline" className="h-11">
                                    {translate('Apply')}
                                </Button>
                            </>
                        }
                    />

                    {products.data.length > 0 && (
                        <RecordListHeader className="grid-cols-[minmax(15rem,1fr)_9rem_7rem_9rem_5rem] gap-4">
                            <span>{translate('Product')}</span>
                            <span className="text-right">{translate('Selling price')}</span>
                            <span className="text-right">{translate('Stock')}</span>
                            <span>{translate('Category')}</span>
                            <span className="sr-only">{translate('Actions')}</span>
                        </RecordListHeader>
                    )}

                    {products.data.length === 0 ? (
                        <EmptyState
                            icon={hasFilters ? Search : Boxes}
                            title={hasFilters ? translate('Product not found') : translate('No products yet')}
                            description={
                                hasFilters
                                    ? translate('Try change term keywords or filter that used.')
                                    : translate('Add your first product to start selling at checkout.')
                            }
                            action={
                                hasFilters ? (
                                    <Button type="button" variant="outline" onClick={resetFilters}>
                                        {translate('Reset filters')}
                                    </Button>
                                ) : canManage && !productLimitReached ? (
                                    <div className="flex flex-wrap justify-center gap-2">
                                        <Button type="button" onClick={() => openManualCreate()} variant="outline">
                                            {translate('Manual entry')}
                                        </Button>
                                        <Button type="button" onClick={openCreate}>
                                            <Camera className="size-4" aria-hidden="true" /> {translate('Scan product')}
                                        </Button>
                                    </div>
                                ) : canManage && productLimitReached ? (
                                    <Button type="button" onClick={() => setProductLimitOpen(true)}>
                                        {translate('Increase product capacity')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div>
                            {products.data.map((product) => (
                                <ProductRow
                                    key={product.public_id}
                                    product={product}
                                    canManage={canManage}
                                    onEdit={openEdit}
                                    onDelete={requestDelete}
                                />
                            ))}
                        </div>
                    )}
                    <div className="border-t border-border px-3 py-2 empty:hidden sm:px-4">
                        <Pagination links={products.links} />
                    </div>
                </RecordList>
            </AppPage>

            <ResponsiveDialog
                open={formOpen && !barcodeTarget && !scannerOpen}
                onOpenChange={(open) => {
                    if (scannerOpen) {
                        return;
                    }

                    if (open) {
                        setFormOpen(true);

                        return;
                    }

                    closeForm();
                }}
                title={editing ? editing.name : translate('Add product')}
                mobile="fullscreen"
                size="xl"
                contentStyle={{ height: mobileFormHeight }}
                contentClassName="h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:!max-w-6xl"
                bodyRef={formBodyRef}
                bodyClassName="min-w-0 overflow-x-hidden overscroll-contain bg-background p-0 pb-5 sm:p-5 lg:p-6"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeForm}
                            className="h-auto min-h-11 px-5 font-semibold sm:min-w-28"
                        >
                            {translate('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            form="product-form"
                            disabled={form.processing}
                            className="h-auto min-h-11 px-6 font-semibold whitespace-normal sm:min-w-44"
                        >
                            {translate(
                                form.processing
                                    ? 'Saving...'
                                    : editing
                                      ? 'Save changes'
                                      : productDrafts.drafts.length > 1 && activeDraftIndex >= 0
                                        ? 'Save & continue'
                                        : 'Add product',
                            )}
                            {!form.processing && <ChevronRight className="size-4" />}
                        </Button>
                    </>
                }
            >
                <form id="product-form" noValidate onSubmit={submit} className="min-w-0 space-y-0 sm:space-y-4">
                    {productDrafts.drafts.length > 0 && !editing && (
                        <div className="border-b border-border bg-card p-4 sm:rounded-xl sm:border">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-foreground">
                                        {productDrafts.drafts.length} {translate('product in the queue')}
                                    </p>
                                    {analyzingDrafts > 0 && (
                                        <p className="mt-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                                            {translate('Analyze')} {analyzingDrafts} {translate('of')} {productDrafts.drafts.length}{' '}
                                            {translate('photo')}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        prepareScannerTone();
                                        setScannerFlow('create');
                                        setFormOpen(false);
                                        setScannerOpen(true);
                                    }}
                                    className="border-input text-primary"
                                >
                                    <Camera className="size-4" /> {translate('Add another product')}
                                </Button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {productDrafts.drafts.map((draft, index) => (
                                    <div
                                        key={draft.id}
                                        className={cn(
                                            'relative flex min-w-52 items-center rounded-xl border text-left transition',
                                            draft.id === activeDraftId
                                                ? 'border-primary bg-secondary ring-2 ring-ring/10'
                                                : 'border-border bg-card hover:border-primary',
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => openDraft(draft)}
                                            className="flex min-w-0 flex-1 items-center gap-2 rounded-l-xl p-2 focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                                        >
                                            <ProductPhoto
                                                src={draft.previewUrl}
                                                alt=""
                                                className="size-12 rounded-lg object-cover"
                                                fallbackClassName="grid size-12 place-items-center rounded-lg bg-muted"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-xs font-bold text-foreground">
                                                    {draft.suggestion && draft.suggestion.identity.display_name
                                                        ? draft.suggestion.identity.display_name
                                                        : `Product${index + 1}`}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'mt-1 flex items-center gap-1 text-[11px] font-bold',
                                                        draft.status === 'failed'
                                                            ? 'text-destructive'
                                                            : draft.status === 'ready'
                                                              ? 'text-primary'
                                                              : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {(draft.status === 'analyzing' ||
                                                        draft.status === 'waiting' ||
                                                        draft.status === 'retry_wait') && <LoaderCircle className="size-3 animate-spin" />}
                                                    {translate(
                                                        draft.status === 'analyzing'
                                                            ? 'Searching data…'
                                                            : draft.status === 'ready'
                                                              ? 'Data found'
                                                              : draft.status === 'failed'
                                                                ? 'Need filled in manual'
                                                                : 'Waiting turn',
                                                    )}
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removeDraft(draft.id)}
                                            aria-label={`Delete product${index + 1}from queue`}
                                            className="grid size-11 shrink-0 place-items-center rounded-lg text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:outline-none"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeDraft && ['waiting', 'analyzing', 'retry_wait'].includes(activeDraft.status) && (
                        <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground sm:rounded-xl sm:border">
                            <LoaderCircle className="size-4 shrink-0 animate-spin" />
                            {translate('Reading photo product…')}
                        </div>
                    )}
                    {activeDraft?.status === 'failed' && (
                        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <p className="flex-1">{translate(activeDraft.error || 'The photo could not be read.')}</p>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => productDrafts.retry(activeDraft.id)}
                                className="border-destructive/30 bg-card text-destructive"
                            >
                                <RefreshCw className="size-4" /> {translate('Try again')}
                            </Button>
                        </div>
                    )}
                    {Object.keys(form.errors).length > 0 && <AlertError errors={Object.values(form.errors)} />}
                    {relatedDraft && form.data.variant_mode === 'none' && (
                        <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                            <p className="font-semibold">
                                Possibly the same product or a variant of {relatedDraft.suggestion?.identity.display_name}.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" onClick={() => combineDraft(relatedDraft, false)}>
                                    {translate('Same product, remove duplicate')}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => combineDraft(relatedDraft, true)}>
                                    {translate('Merge as a variant')}
                                </Button>
                            </div>
                        </div>
                    )}
                    <Section title="Product information">
                        <div className="grid gap-5">
                            <div className="min-w-0 space-y-4">
                                <FormInput
                                    id="product-name"
                                    name="name"
                                    label={translate('Product name')}
                                    error={form.errors.name}
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    placeholder={translate('Example: Arabica Coffee 250 g')}
                                    className="h-11 bg-card"
                                    required
                                />
                                <Field label="Product photo" error={form.errors.photo}>
                                    <ProductPhotoInput
                                        photo={form.data.photo}
                                        photoUrl={form.data.remove_photo ? null : editing?.photo_url}
                                        variantName={form.data.name}
                                        onCamera={openFormPhotoScanner}
                                        onRemove={() => form.setData({ ...form.data, photo: null, remove_photo: true })}
                                    />
                                </Field>
                                <FormTextarea
                                    id="product-description"
                                    name="description"
                                    label={translate('Description')}
                                    error={form.errors.description}
                                    value={form.data.description}
                                    onChange={(event) => form.setData('description', event.target.value)}
                                    placeholder={translate('Add the brand, size, or product notes')}
                                    rows={3}
                                    className="resize-y bg-card text-base sm:text-sm"
                                />
                                {form.data.variant_mode === 'none' && (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <SkuField
                                            id="product-sku"
                                            name="sku"
                                            error={form.errors.sku}
                                            value={form.data.sku}
                                            productName={form.data.name}
                                            onChange={(value) => form.setData('sku', value)}
                                        />
                                        <FormBarcodeInput
                                            id="product-barcode"
                                            name="barcode"
                                            label={translate('Barcodes / QR')}
                                            value={form.data.barcode}
                                            error={form.errors.barcode}
                                            onScan={() => {
                                                cameraFormScroll.current = formBodyRef.current?.scrollTop ?? 0;
                                                setBarcodeTarget({
                                                    kind: 'product',
                                                    label: form.data.name || translate('product'),
                                                });
                                            }}
                                            onChange={(value) => form.setData('barcode', value)}
                                            onGenerate={() => form.setData('barcode', generateInternalBarcode())}
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-2">
                                    <FormSelect
                                        id="product-category"
                                        name="category_public_id"
                                        label={translate('Category')}
                                        error={form.errors.category_public_id}
                                        value={form.data.category_public_id}
                                        onChange={(event) => form.setData('category_public_id', event.target.value)}
                                        className="h-11 bg-card text-base sm:text-sm"
                                        required
                                    >
                                        <option value="">{translate('Select category')}</option>
                                        {categories.map((category) => (
                                            <option key={category.public_id} value={category.public_id} disabled={!category.is_active}>
                                                {translate(category.name)}
                                            </option>
                                        ))}
                                    </FormSelect>
                                    <Button asChild variant="outline" className="size-11 shrink-0 border-input text-primary">
                                        <Link href={categoriesIndex.url()} aria-label={translate('Manage categories')}>
                                            <Settings2 className="size-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Section>

                    <Section
                        title="Sales units"
                        action={
                            <Button asChild size="sm" variant="ghost" className="text-primary">
                                <Link href={unitsIndex.url()}>
                                    <Settings2 className="size-4" />
                                    <span className="hidden sm:inline">{translate('Manage units')}</span>
                                </Link>
                            </Button>
                        }
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormSelect
                                id="product-large-unit"
                                name="large_unit_public_id"
                                label={translate('Bulk unit')}
                                error={form.errors.large_unit_public_id}
                                value={form.data.large_unit_public_id}
                                onChange={(event) => form.setData('large_unit_public_id', event.target.value)}
                                className="h-11 bg-card text-base sm:text-sm"
                            >
                                <option value="">
                                    {translate(form.data.variant_mode === 'shared' ? 'Select bulk unit' : 'No bulk unit')}
                                </option>
                                {largeUnits.map((unit) => (
                                    <option key={unit.public_id} value={unit.public_id} disabled={!unit.is_active}>
                                        {translate(unit.name)} ({unit.symbol})
                                    </option>
                                ))}
                            </FormSelect>
                            <FormSelect
                                id="product-retail-unit"
                                name="retail_unit_public_id"
                                label={translate('Retail unit')}
                                error={form.errors.retail_unit_public_id}
                                value={form.data.retail_unit_public_id}
                                onChange={(event) => form.setData('retail_unit_public_id', event.target.value)}
                                className="h-11 bg-card text-base sm:text-sm"
                                required
                            >
                                <option value="">{translate('Select retail unit')}</option>
                                {retailUnits.map((unit) => (
                                    <option key={unit.public_id} value={unit.public_id} disabled={!unit.is_active}>
                                        {translate(unit.name)} ({unit.symbol})
                                    </option>
                                ))}
                            </FormSelect>
                        </div>
                        <div className="mt-3">
                            <FormSelect
                                id="product-quantity-mode"
                                name="quantity_mode"
                                label={translate('Fractional sales')}
                                error={form.errors.quantity_mode}
                                value={form.data.quantity_mode}
                                onChange={(event) => form.setData('quantity_mode', event.target.value as 'fixed' | 'variable')}
                                className="h-11 bg-card text-base sm:text-sm"
                            >
                                <option value="fixed">{translate('Whole quantities')}</option>
                                <option value="variable">{translate('Can be fractional')}</option>
                            </FormSelect>
                        </div>
                        {activeDraft?.suggestion && !form.data.retail_unit_public_id && (
                            <div role="status" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-primary">
                                <span>
                                    {activeDraft.suggestion.quantity.sale_unit_code
                                        ? translate('Unit recognized, select unit store.')
                                        : translate('Unit not recognized')}
                                </span>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={unitsIndex.url()}>
                                        <Plus className="size-4" /> {translate('Add unit')}
                                    </Link>
                                </Button>
                            </div>
                        )}
                        {activeDraft?.suggestion?.quantity.larger_unit_code && !form.data.large_unit_public_id && (
                            <div role="status" className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span>{translate('Bulk unit')}</span>:{' '}
                                {translate(`units.${activeDraft.suggestion.quantity.larger_unit_code}`)}
                                <Button asChild variant="outline" size="sm">
                                    <Link href={unitsIndex.url()}>
                                        <Plus className="size-4" /> {translate('Add unit')}
                                    </Link>
                                </Button>
                            </div>
                        )}
                        {activeDraft?.suggestion?.quantity.net_content && (
                            <p className="mt-3 text-sm text-muted-foreground">
                                <span>{translate('Net content')}</span>: {activeDraft.suggestion.quantity.net_content.value}{' '}
                                {translate(`units.${activeDraft.suggestion.quantity.net_content.unit_code}`)}
                            </p>
                        )}
                    </Section>

                    <Section title="Price and stock">
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.data.variant_mode !== 'none'}
                            onClick={() => setMode(form.data.variant_mode === 'none' ? 'separate' : 'none')}
                            className="flex min-h-14 w-full items-center justify-between gap-4 rounded-xl border border-border bg-muted/50 p-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <span>
                                <span className="block text-sm font-bold text-foreground">{translate('Size / type variants')}</span>
                                <span className="text-xs text-muted-foreground">
                                    {translate(form.data.variant_mode === 'none' ? 'Inactive' : 'Active')}
                                </span>
                            </span>
                            <span
                                className={cn(
                                    'relative h-7 w-12 rounded-full transition',
                                    form.data.variant_mode === 'none' ? 'bg-muted-foreground/35' : 'bg-primary',
                                )}
                            >
                                <span
                                    className={cn(
                                        'absolute top-1 size-5 rounded-full bg-card shadow transition',
                                        form.data.variant_mode === 'none' ? 'left-1' : 'left-6',
                                    )}
                                />
                            </span>
                        </button>

                        {form.data.variant_mode === 'none' ? (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <FormCurrencyInput
                                    id="purchase_price"
                                    name="purchase_price"
                                    label={translate(discoveryPrefill ? 'Estimated cost price' : 'Cost price')}
                                    value={form.data.purchase_price}
                                    onValueChange={(value) => {
                                        setDiscoveryPrefill(false);
                                        form.setData('purchase_price', value);
                                    }}
                                    error={form.errors.purchase_price}
                                    min="0"
                                    className="h-11"
                                />
                                <FormCurrencyInput
                                    id="selling_price"
                                    name="selling_price"
                                    label={translate(discoveryPrefill ? 'Rekomendasi price sell' : 'Selling price')}
                                    value={form.data.selling_price}
                                    onValueChange={(value) => {
                                        setDiscoveryPrefill(false);
                                        form.setData('selling_price', value);
                                    }}
                                    error={form.errors.selling_price}
                                    min="0"
                                    className="h-11"
                                />
                                <Field label="Initial stock" error={form.errors.current_stock}>
                                    <Input
                                        inputMode="decimal"
                                        step="0.01"
                                        min="0"
                                        value={form.data.current_stock}
                                        placeholder="0"
                                        onChange={(event) => form.setData('current_stock', event.target.value)}
                                        onBlur={() => form.setData('current_stock', formatProductDecimal(form.data.current_stock))}
                                        className="h-11 border-input bg-card"
                                    />
                                </Field>
                                <Field label="Minimum stock level" error={form.errors.minimum_stock}>
                                    <Input
                                        inputMode="decimal"
                                        step="0.01"
                                        min="0"
                                        value={form.data.minimum_stock}
                                        placeholder="0"
                                        onChange={(event) => form.setData('minimum_stock', event.target.value)}
                                        onBlur={() => form.setData('minimum_stock', formatProductDecimal(form.data.minimum_stock))}
                                        className="h-11 border-input bg-card"
                                    />
                                </Field>
                            </div>
                        ) : (
                            <div className="mt-4 space-y-4">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {(['separate', 'shared'] as const).map((mode) => (
                                        <button
                                            type="button"
                                            key={mode}
                                            onClick={() => setMode(mode)}
                                            className={cn(
                                                'flex items-center gap-3 rounded-2xl border p-3 text-left',
                                                form.data.variant_mode === mode
                                                    ? 'border-primary bg-secondary text-primary'
                                                    : 'border-input bg-card text-foreground',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'size-4 rounded-full border-4',
                                                    form.data.variant_mode === mode ? 'border-primary bg-card' : 'border-input',
                                                )}
                                            />
                                            <span>
                                                <span className="block text-sm font-bold">
                                                    {translate(
                                                        mode === 'separate' ? 'Different flavor / type' : 'Different unit / wholesale',
                                                    )}
                                                </span>
                                                <span className="text-xs opacity-70">
                                                    {translate(mode === 'separate' ? 'Separate stock' : 'Shared stock')}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    {form.data.variants.map((variant, index) => (
                                        <div
                                            key={variant.public_id ?? variant.client_id ?? index}
                                            data-variant-card
                                            className="rounded-xl border border-border bg-card p-3 sm:p-4"
                                        >
                                            <div className="mb-3 flex items-center justify-between">
                                                <p className="font-bold text-foreground">Variant {index + 1}</p>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => removeVariant(index)}
                                                    className="size-9 text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <Field
                                                    label="Variant name"
                                                    error={errorFor(`variants.${index}.name`)}
                                                    className="sm:col-span-2"
                                                >
                                                    <Input
                                                        id={`variant-name-${variant.public_id ?? variant.client_id ?? index}`}
                                                        value={variant.name}
                                                        placeholder={translate('Example: 250 g')}
                                                        onChange={(event) => updateVariant(index, 'name', event.target.value)}
                                                        className="h-11 rounded-xl border-input bg-card"
                                                    />
                                                </Field>
                                                <SkuField
                                                    id={`variant-${index}-sku`}
                                                    name={`variants.${index}.sku`}
                                                    value={variant.sku}
                                                    productName={`${form.data.name}-${variant.name}`}
                                                    error={errorFor(`variants.${index}.sku`)}
                                                    onChange={(value) => updateVariant(index, 'sku', value)}
                                                />
                                                <FormBarcodeInput
                                                    id={`variant-${index}-barcode`}
                                                    name={`variants.${index}.barcode`}
                                                    label={translate('Barcodes / QR')}
                                                    value={variant.barcode}
                                                    error={errorFor(`variants.${index}.barcode`)}
                                                    onScan={() => {
                                                        cameraFormScroll.current = formBodyRef.current?.scrollTop ?? 0;
                                                        setBarcodeTarget({
                                                            kind: 'variant',
                                                            index,
                                                            label: variant.name || `varian ${index + 1}`,
                                                        });
                                                    }}
                                                    onChange={(value) => updateVariant(index, 'barcode', value)}
                                                    onGenerate={() => updateVariant(index, 'barcode', generateInternalBarcode())}
                                                />
                                                <Field
                                                    label="Photo: varian"
                                                    error={errorFor(`variants.${index}.photo`)}
                                                    className="sm:col-span-2"
                                                >
                                                    <ProductPhotoInput
                                                        photo={variant.photo}
                                                        photoUrl={variant.remove_photo ? null : variant.photo_url}
                                                        variantName={variant.name}
                                                        onCamera={() => {
                                                            prepareScannerTone();
                                                            cameraFormScroll.current = formBodyRef.current?.scrollTop ?? 0;
                                                            setVariantPhotoIndex(index);
                                                            setScannerFlow('variant-photo');
                                                            setScannerOpen(true);
                                                        }}
                                                        onRemove={() =>
                                                            updateVariantFields(index, {
                                                                photo: null,
                                                                remove_photo: Boolean(variant.photo_url),
                                                            })
                                                        }
                                                    />
                                                </Field>
                                                <FormCurrencyInput
                                                    id={`variant-${index}-purchase-price`}
                                                    name={`variants.${index}.purchase_price`}
                                                    label={translate('Cost price')}
                                                    value={variant.purchase_price}
                                                    onValueChange={(value) => updateVariant(index, 'purchase_price', value)}
                                                    error={errorFor(`variants.${index}.purchase_price`)}
                                                    min="0"
                                                />
                                                <FormCurrencyInput
                                                    id={`variant-${index}-selling-price`}
                                                    name={`variants.${index}.selling_price`}
                                                    label={translate('Selling price')}
                                                    value={variant.selling_price}
                                                    onValueChange={(value) => updateVariant(index, 'selling_price', value)}
                                                    error={errorFor(`variants.${index}.selling_price`)}
                                                    min="0"
                                                />
                                                {form.data.variant_mode === 'separate' ? (
                                                    <>
                                                        <Field label="Initial stock" error={errorFor(`variants.${index}.current_stock`)}>
                                                            <Input
                                                                inputMode="decimal"
                                                                step="0.01"
                                                                min="0"
                                                                value={variant.current_stock}
                                                                placeholder="0"
                                                                onChange={(event) =>
                                                                    updateVariant(index, 'current_stock', event.target.value)
                                                                }
                                                                onBlur={() =>
                                                                    updateVariant(
                                                                        index,
                                                                        'current_stock',
                                                                        formatProductDecimal(variant.current_stock),
                                                                    )
                                                                }
                                                                className="h-11 rounded-xl border-input bg-card"
                                                            />
                                                        </Field>
                                                        <Field
                                                            label="Minimum stock level"
                                                            error={errorFor(`variants.${index}.minimum_stock`)}
                                                        >
                                                            <Input
                                                                inputMode="decimal"
                                                                step="0.01"
                                                                min="0"
                                                                value={variant.minimum_stock}
                                                                placeholder="0"
                                                                onChange={(event) =>
                                                                    updateVariant(index, 'minimum_stock', event.target.value)
                                                                }
                                                                onBlur={() =>
                                                                    updateVariant(
                                                                        index,
                                                                        'minimum_stock',
                                                                        formatProductDecimal(variant.minimum_stock),
                                                                    )
                                                                }
                                                                className="h-11 rounded-xl border-input bg-card"
                                                            />
                                                        </Field>
                                                    </>
                                                ) : (
                                                    <>
                                                        {activeDraft?.suggestion?.quantity.conversion_factor &&
                                                            !activeDraft.suggestion.quality.unit_issues?.some(
                                                                (issue) => issue.code === 'conversion_ungrounded',
                                                            ) &&
                                                            form.data.variant_mode === 'shared' &&
                                                            units.find((unit) => unit.public_id === form.data.large_unit_public_id)
                                                                ?.reference_code === activeDraft.suggestion.quantity.larger_unit_code &&
                                                            units.find((unit) => unit.public_id === form.data.retail_unit_public_id)
                                                                ?.reference_code === activeDraft.suggestion.quantity.sale_unit_code &&
                                                            (form.data.variants.length === 1 ||
                                                                variant.name === activeDraft.suggestion.identity.variant) && (
                                                                <div className="text-sm text-muted-foreground">
                                                                    <span>{translate('Conversion suggestions')}</span>:{' '}
                                                                    {activeDraft.suggestion.quantity.conversion_factor}
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="ml-2"
                                                                        onClick={() =>
                                                                            updateVariant(
                                                                                index,
                                                                                'conversion_factor',
                                                                                activeDraft.suggestion!.quantity.conversion_factor!,
                                                                            )
                                                                        }
                                                                    >
                                                                        {translate('Use conversion')}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        <Field
                                                            label="Units per package"
                                                            error={errorFor(`variants.${index}.conversion_factor`)}
                                                        >
                                                            <Input
                                                                inputMode="decimal"
                                                                value={variant.conversion_factor}
                                                                placeholder={translate('Example: 12')}
                                                                onChange={(event) =>
                                                                    updateVariant(index, 'conversion_factor', event.target.value)
                                                                }
                                                                onBlur={() =>
                                                                    updateVariant(
                                                                        index,
                                                                        'conversion_factor',
                                                                        formatProductDecimal(variant.conversion_factor),
                                                                    )
                                                                }
                                                                className="h-11 rounded-xl border-input bg-card"
                                                            />
                                                        </Field>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addVariant}
                                    className="w-full border-dashed border-primary text-primary"
                                >
                                    <Plus className="size-4" /> Add variant
                                </Button>
                                <InputError message={form.errors.variants} />

                                {form.data.variant_mode === 'shared' && (
                                    <div className="grid gap-4 rounded-xl border border-border bg-secondary p-4 sm:grid-cols-2">
                                        <Field label="Initial shared stock" error={form.errors.current_stock}>
                                            <Input
                                                inputMode="decimal"
                                                value={form.data.current_stock}
                                                placeholder="0"
                                                onChange={(event) => form.setData('current_stock', event.target.value)}
                                                className="h-11 rounded-xl border-input bg-card"
                                            />
                                        </Field>
                                        <Field label="Minimum stock level" error={form.errors.minimum_stock}>
                                            <Input
                                                inputMode="decimal"
                                                value={form.data.minimum_stock}
                                                placeholder="0"
                                                onChange={(event) => form.setData('minimum_stock', event.target.value)}
                                                className="h-11 rounded-xl border-input bg-card"
                                            />
                                        </Field>
                                    </div>
                                )}
                            </div>
                        )}
                    </Section>

                    {editing && (
                        <label className="flex min-h-12 cursor-pointer items-center justify-between border-b border-border bg-card px-4 text-sm font-semibold text-foreground sm:rounded-xl sm:border">
                            {translate('Active product')}
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(event) => form.setData('is_active', event.target.checked)}
                                className="size-5 accent-[var(--app-primary)]"
                            />
                        </label>
                    )}
                </form>
            </ResponsiveDialog>

            <ResponsiveDialog
                open={deleting !== null}
                onOpenChange={(open) => {
                    if (!open && !deleteProcessing) {
                        setDeleting(null);
                        setDeleteError('');
                    }
                }}
                title={translate('Product cannot deleted')}
                description={deleteError}
                size="sm"
                footer={
                    <>
                        <Button type="button" variant="outline" disabled={deleteProcessing} onClick={() => setDeleting(null)}>
                            {translate('Close')}
                        </Button>
                        <Button type="button" variant="destructive" disabled={deleteProcessing} onClick={deactivateProduct}>
                            {translate(deleteProcessing ? 'Deactivating...' : 'Deactivate product')}
                        </Button>
                    </>
                }
            >
                <p className="text-sm leading-6 text-muted-foreground">
                    {translate('The product remains in your history but will not appear in new transactions.')}
                </p>
            </ResponsiveDialog>

            <ResponsiveDialog
                open={existingBarcodeProduct !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setExistingBarcodeProduct(null);
                    }
                }}
                title={translate('Barcode already registered')}
                size="sm"
                footer={
                    <Button asChild>
                        <Link href={productsIndex.url({ query: { search: existingBarcodeProduct?.barcode ?? '' } })}>
                            {translate('Open product')}
                        </Link>
                    </Button>
                }
            >
                <p className="text-sm leading-6 text-muted-foreground">
                    <strong className="text-foreground">{existingBarcodeProduct?.name}</strong> {translate('already uses this barcode.')}
                </p>
            </ResponsiveDialog>
            <SubscriptionLimitContactDialog kind="product" open={productLimitOpen} onOpenChange={setProductLimitOpen} />
            {barcodeTarget && (
                <BarcodeScannerDialog
                    open
                    title={`${translate('Scan barcodes')} ${translate(barcodeTarget.label)}`}
                    onOpenChange={(open) => {
                        if (!open) {
                            setBarcodeTarget(null);
                            requestAnimationFrame(() => {
                                if (formBodyRef.current) {
                                    formBodyRef.current.scrollTop = cameraFormScroll.current;
                                }
                            });
                        }
                    }}
                    onDetected={applyScannedBarcode}
                />
            )}
            <Suspense
                fallback={
                    <div role="status" className="fixed inset-0 z-[90] grid place-items-center bg-black/80 text-white">
                        {translate('Opening camera…')}
                    </div>
                }
            >
                <ProductScanner
                    purpose="product"
                    title={
                        scannerFlow === 'form-photo'
                            ? `${translate('Photo')} ${form.data.name || translate('products')}`
                            : translate('New product photo')
                    }
                    open={scannerOpen}
                    onOpenChange={handleScannerOpenChange}
                    onConfirm={() => ({ applied: [], failures: [] })}
                    onProductCapture={handleProductCapture}
                    onReviewProducts={reviewDrafts}
                    productPhotos={
                        scannerFlow !== 'create'
                            ? []
                            : productDrafts.drafts.map((draft) => ({
                                  id: draft.id,
                                  previewUrl: draft.previewUrl,
                                  status: draft.status,
                              }))
                    }
                    productPendingPhotos={scannerFlow === 'create' ? productDrafts.pendingPhotos : 0}
                    productDraftCount={scannerFlow === 'create' ? productDrafts.drafts.length : 0}
                    productCanCapture={scannerFlow !== 'create' || productDrafts.pendingPhotos < 10}
                    onRemoveProductPhoto={removeDraft}
                    singleCapture={scannerFlow !== 'create' || !aiDiscoveryAvailable}
                    manualActionLabel={scannerFlow !== 'create' ? translate('Continue without replacing the photo') : undefined}
                    onManualSearch={() => {
                        setScannerOpen(false);

                        if (scannerFlow !== 'create') {
                            handleScannerOpenChange(false);

                            return;
                        }

                        openManualCreate();
                    }}
                />
            </Suspense>
        </>
    );
}
