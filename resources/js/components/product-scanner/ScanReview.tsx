import {
    AlertCircle,
    Check,
    ChevronLeft,
    LoaderCircle,
    PackageSearch,
    RefreshCw,
    RotateCcw,
    Camera,
    Search,
    SkipForward,
    Trash2,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatMoney, localeTag } from '@/lib/currency';
import type {
    ScannerCapture,
    ScannerProductCandidate,
    ScannerPurpose,
    ScannerSaleOption,
    ScannerSelection,
} from './types';

const actionLabels: Record<ScannerPurpose, string> = {
    sale: 'Tambahkan ke keranjang',
    purchase: 'Tambahkan ke pembelian',
    stock_count: 'Gunakan untuk opname',
    product: 'Periksa produk',
};

const money = { format: formatMoney };

export function ScanReview({
    captures,
    selections,
    purpose,
    onBack,
    onScanAgain,
    onRemove,
    onRemoveResult,
    onRetry,
    onRetake,
    onSelectProduct,
    onSelectOption,
    onClearProduct,
    onSetSkipped,
    onQuantityChange,
    onConfirm,
    manualProducts = [],
}: {
    captures: ScannerCapture[];
    selections: ScannerSelection[];
    purpose: ScannerPurpose;
    onBack: () => void;
    onScanAgain: () => void;
    onRemove: (id: string) => void;
    onRemoveResult: (captureId: string, itemIndex: number) => void;
    onRetry: (id: string) => void;
    onRetake: (id: string) => void;
    onSelectProduct: (
        captureId: string,
        itemIndex: number,
        candidate: ScannerProductCandidate,
    ) => void;
    onSelectOption: (
        captureId: string,
        itemIndex: number,
        option: ScannerSaleOption,
    ) => void;
    onClearProduct: (captureId: string, itemIndex: number) => void;
    onSetSkipped: (
        captureId: string,
        itemIndex: number,
        skipped: boolean,
    ) => void;
    onQuantityChange: (
        captureId: string,
        itemIndex: number,
        quantity: number,
    ) => void;
    onConfirm: (selections: ScannerSelection[]) => void;
    manualProducts?: ScannerProductCandidate[];
}) {
    const [manualTarget, setManualTarget] = useState<{
        captureId: string;
        itemIndex: number;
    } | null>(null);
    const [manualQuery, setManualQuery] = useState('');
    const confirmed = selections;
    const pending = captures.some(
        (capture) =>
            capture.status === 'queued' || capture.status === 'recognizing',
    );
    const unresolved = captures.reduce((total, capture) => {
        if (capture.status === 'failed') {
            return total + 1;
        }

        return (
            total +
            capture.results.filter(
                (result) =>
                    result.skipped !== true && result.selectedOption === null,
            ).length
        );
    }, 0);
    const skipped = captures.reduce(
        (total, capture) =>
            total +
            capture.results.filter((result) => result.skipped === true).length,
        0,
    );
    const canConfirm =
        captures.length > 0 &&
        !pending &&
        unresolved === 0 &&
        confirmed.length + skipped > 0;
    const estimatedTotal = confirmed.reduce((total, item) => {
        const unitPrice =
            purpose === 'purchase' ? item.purchasePrice : item.sellingPrice;

        return total + Number(unitPrice) * item.quantity;
    }, 0);
    const manualResults = useMemo(() => {
        const query = manualQuery.trim().toLocaleLowerCase(localeTag());

        if (!query) {
            return manualProducts;
        }

        return manualProducts.filter(
            (product) =>
                product.name.toLocaleLowerCase(localeTag()).includes(query) ||
                product.options.some((option) =>
                    [
                        option.variantName,
                        option.unitName,
                        option.unitSymbol,
                    ].some((value) =>
                        value?.toLocaleLowerCase(localeTag()).includes(query),
                    ),
                ),
        );
    }, [manualProducts, manualQuery]);

    const openManualSearch = (captureId: string, itemIndex: number) => {
        setManualQuery('');
        setManualTarget({ captureId, itemIndex });
    };

    return (
        <div className="relative flex h-svh flex-col bg-[#fff3ef] text-[var(--app-ink)]">
            <header className="flex items-center gap-3 border-b border-[var(--app-ink)]/10 bg-[#fffdfc] px-4 pt-[calc(env(safe-area-inset-top)+.75rem)] pb-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="grid size-11 place-items-center rounded-xl bg-[var(--app-soft)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                    aria-label="Kembali ke kamera"
                >
                    <ChevronLeft className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black tracking-[-0.03em]">
                        Periksa hasil
                    </h2>
                    <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                        {confirmed.length} siap
                        {unresolved > 0 ? ` · ${unresolved} perlu dipilih` : ''}
                        {skipped > 0 ? ` · ${skipped} dilewati` : ''}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onScanAgain}
                    className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--app-primary)] px-3 text-xs font-black text-[var(--app-primary-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                    <Camera className="size-4" />
                    Scan lagi
                </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-5">
                {captures.map((capture, captureIndex) => {
                    if (
                        capture.status === 'queued' ||
                        capture.status === 'recognizing'
                    ) {
                        return (
                            <div
                                key={capture.id}
                                className="flex min-h-24 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                            >
                                <CaptureImage
                                    previewUrl={capture.previewUrl}
                                    loading
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="font-black">
                                        Mencari produk…
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                                        Foto {captureIndex + 1} sedang
                                        dicocokkan dengan katalog.
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    if (capture.status === 'failed') {
                        return (
                            <div
                                key={capture.id}
                                className="rounded-2xl bg-[#fff7f2] p-4 shadow-sm"
                            >
                                <div className="flex gap-3">
                                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-[#bd572f]" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black">
                                            Foto belum berhasil diproses
                                        </p>
                                        <p className="mt-1 text-sm text-[#795f55]">
                                            {capture.error}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {capture.retryable && (
                                        <button
                                            type="button"
                                            onClick={() => onRetry(capture.id)}
                                            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--app-primary)] px-3 text-sm font-black text-[var(--app-primary-foreground)]"
                                        >
                                            <RefreshCw className="size-4" />
                                            Coba lagi
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onRetake(capture.id)}
                                        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--app-ink)]/15 px-3 text-sm font-black text-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                                    >
                                        <RotateCcw className="size-4" />
                                        Foto ulang
                                    </button>
                                    <RemoveButton
                                        onClick={() => onRemove(capture.id)}
                                    />
                                </div>
                            </div>
                        );
                    }

                    return capture.results.map((result) => (
                        <div
                            key={`${capture.id}-${result.itemIndex}`}
                            className="rounded-2xl bg-white p-3 shadow-[0_8px_24px_-18px_var(--app-shadow)]"
                        >
                            <div className="flex items-start gap-3">
                                <CaptureImage previewUrl={capture.previewUrl} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black">
                                        {result.skipped
                                            ? result.match?.name ||
                                              'Produk dilewati'
                                            : result.match?.name ||
                                              (result.status === 'uncertain'
                                                  ? 'Pilih produk'
                                                  : 'Tidak ditemukan di katalog')}
                                    </p>
                                    <ResultStatus
                                        skipped={result.skipped === true}
                                        ready={result.selectedOption !== null}
                                    />
                                </div>
                                <RemoveButton
                                    onClick={() =>
                                        capture.results.length > 1
                                            ? onRemoveResult(
                                                  capture.id,
                                                  result.itemIndex,
                                              )
                                            : onRemove(capture.id)
                                    }
                                />
                            </div>

                            {result.skipped ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onSetSkipped(
                                            capture.id,
                                            result.itemIndex,
                                            false,
                                        )
                                    }
                                    className="mt-2 min-h-11 text-sm font-black text-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                                >
                                    Batalkan lewati
                                </button>
                            ) : (
                                <div className="mt-3 border-t border-[var(--app-ink)]/10 pt-3">
                                    {result.match ? (
                                        <MatchedProduct
                                            captureId={capture.id}
                                            itemIndex={result.itemIndex}
                                            product={result.match}
                                            selectedOption={
                                                result.selectedOption
                                            }
                                            quantity={result.quantity ?? 1}
                                            canChangeProduct={
                                                result.status === 'uncertain'
                                            }
                                            purpose={purpose}
                                            onSelectOption={onSelectOption}
                                            onClearProduct={onClearProduct}
                                            onSkip={() =>
                                                onSetSkipped(
                                                    capture.id,
                                                    result.itemIndex,
                                                    true,
                                                )
                                            }
                                            onQuantityChange={(quantity) =>
                                                onQuantityChange(
                                                    capture.id,
                                                    result.itemIndex,
                                                    quantity,
                                                )
                                            }
                                        />
                                    ) : result.status === 'uncertain' ? (
                                        <UncertainProduct
                                            captureId={capture.id}
                                            itemIndex={result.itemIndex}
                                            candidates={result.candidates}
                                            canSearchManual={
                                                manualProducts.length > 0
                                            }
                                            onSelectProduct={onSelectProduct}
                                            onManualSearch={() =>
                                                openManualSearch(
                                                    capture.id,
                                                    result.itemIndex,
                                                )
                                            }
                                            onRetake={() =>
                                                onRetake(capture.id)
                                            }
                                            onSkip={() =>
                                                onSetSkipped(
                                                    capture.id,
                                                    result.itemIndex,
                                                    true,
                                                )
                                            }
                                        />
                                    ) : (
                                        <UnknownProduct
                                            canSearchManual={
                                                manualProducts.length > 0
                                            }
                                            onManualSearch={() =>
                                                openManualSearch(
                                                    capture.id,
                                                    result.itemIndex,
                                                )
                                            }
                                            onRetake={() =>
                                                onRetake(capture.id)
                                            }
                                            onSkip={() =>
                                                onSetSkipped(
                                                    capture.id,
                                                    result.itemIndex,
                                                    true,
                                                )
                                            }
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ));
                })}
            </div>

            <footer className="border-t border-[var(--app-ink)]/10 bg-[#fffdfc] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+.75rem)]">
                {purpose === 'purchase' && confirmed.length > 0 && (
                    <div className="mb-3 flex items-center justify-between rounded-xl bg-[var(--app-soft)] px-3 py-2.5">
                        <span className="text-xs font-bold text-[var(--muted-foreground)]">
                            Estimasi total beli
                        </span>
                        <strong className="text-base font-black text-[var(--app-ink)]">
                            {money.format(estimatedTotal)}
                        </strong>
                    </div>
                )}
                <button
                    type="button"
                    disabled={!canConfirm}
                    onClick={() => onConfirm(confirmed)}
                    className="min-h-12 w-full rounded-2xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] shadow-[0_10px_24px_-14px_var(--app-shadow)] disabled:opacity-40"
                >
                    {pending
                        ? 'Menunggu hasil…'
                        : unresolved > 0
                          ? `${unresolved} produk perlu dipilih`
                          : confirmed.length === 0
                            ? 'Selesai'
                            : actionLabels[purpose]}
                    {canConfirm && confirmed.length > 0
                        ? ` · ${confirmed.length}`
                        : ''}
                </button>
            </footer>

            {manualTarget && (
                <ManualProductPicker
                    products={manualResults}
                    query={manualQuery}
                    onQueryChange={setManualQuery}
                    onClose={() => setManualTarget(null)}
                    onSelect={(product) => {
                        onSelectProduct(
                            manualTarget.captureId,
                            manualTarget.itemIndex,
                            product,
                        );
                        setManualTarget(null);
                    }}
                />
            )}
        </div>
    );
}

function MatchedProduct({
    captureId,
    itemIndex,
    product,
    selectedOption,
    quantity,
    canChangeProduct,
    purpose,
    onSelectOption,
    onClearProduct,
    onSkip,
    onQuantityChange,
}: {
    captureId: string;
    itemIndex: number;
    product: ScannerProductCandidate;
    selectedOption: ScannerSaleOption | null;
    quantity: number;
    canChangeProduct: boolean;
    purpose: ScannerPurpose;
    onSelectOption: (
        captureId: string,
        itemIndex: number,
        option: ScannerSaleOption,
    ) => void;
    onClearProduct: (captureId: string, itemIndex: number) => void;
    onSkip: () => void;
    onQuantityChange: (quantity: number) => void;
}) {
    const [editingOptions, setEditingOptions] = useState(
        selectedOption === null,
    );
    const unitPrice = selectedOption
        ? Number(
              purpose === 'purchase'
                  ? selectedOption.purchasePrice
                  : selectedOption.sellingPrice,
          )
        : 0;
    const subtotal = unitPrice * quantity;

    return (
        <>
            {selectedOption && !editingOptions && (
                <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-bold text-[var(--muted-foreground)]">
                        {optionName(selectedOption)}
                    </p>
                    <span className="shrink-0 text-sm font-black text-[var(--app-ink)]">
                        {money.format(unitPrice)} / unit
                    </span>
                </div>
            )}

            {product.options.length > 1 &&
                (selectedOption === null || editingOptions) && (
                    <fieldset className="mt-3">
                        <legend className="text-xs font-black text-[var(--muted-foreground)]">
                            Pilih ukuran/satuan
                        </legend>
                        <div className="mt-2 space-y-2">
                            {product.options.map((option) => {
                                const checked =
                                    selectedOption?.id === option.id;

                                return (
                                    <label
                                        key={option.id}
                                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--app-primary)] ${
                                            checked
                                                ? 'border-[var(--app-primary)] bg-[var(--app-soft)]'
                                                : 'border-[var(--app-ink)]/12 bg-[#fffaf7]'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`sale-option-${captureId}-${itemIndex}`}
                                            checked={checked}
                                            onChange={() => {
                                                onSelectOption(
                                                    captureId,
                                                    itemIndex,
                                                    option,
                                                );
                                                setEditingOptions(false);
                                            }}
                                            className="size-4 accent-[var(--app-primary)]"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-black">
                                                {optionName(option)}
                                            </span>
                                            {purpose === 'sale' && (
                                                <span className="block text-xs text-[var(--muted-foreground)]">
                                                    Stok{' '}
                                                    {Number(
                                                        option.stockQuantity,
                                                    ).toLocaleString(
                                                        localeTag(),
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                        <span className="shrink-0 text-sm font-black">
                                            {money.format(
                                                Number(
                                                    purpose === 'purchase'
                                                        ? option.purchasePrice
                                                        : option.sellingPrice,
                                                ),
                                            )}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                )}

            {selectedOption &&
                product.options.length > 1 &&
                !editingOptions && (
                    <button
                        type="button"
                        onClick={() => setEditingOptions(true)}
                        className="mt-2 min-h-10 text-sm font-black text-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                    >
                        Ubah ukuran/satuan
                    </button>
                )}

            {selectedOption && (
                <div className="mt-3 space-y-2">
                    <label className="flex items-center justify-between gap-3 text-xs font-bold text-[var(--muted-foreground)]">
                        Jumlah
                        <input
                            type="number"
                            min="0.000001"
                            step="any"
                            value={quantity}
                            onChange={(event) =>
                                onQuantityChange(
                                    Math.max(
                                        0.000001,
                                        Number(event.target.value) || 1,
                                    ),
                                )
                            }
                            className="h-10 w-24 rounded-xl border border-[var(--app-ink)]/15 px-3 text-right text-sm font-black outline-none focus:border-[var(--app-primary)]"
                        />
                    </label>
                    <div className="flex items-center justify-between rounded-xl bg-[#fffaf7] px-3 py-2 text-xs">
                        <span className="font-bold text-[var(--muted-foreground)]">
                            {purpose === 'purchase'
                                ? 'Subtotal beli'
                                : 'Subtotal'}
                        </span>
                        <strong className="text-sm font-black text-[var(--app-ink)]">
                            {money.format(subtotal)}
                        </strong>
                    </div>
                </div>
            )}

            {canChangeProduct && (
                <button
                    type="button"
                    onClick={() => onClearProduct(captureId, itemIndex)}
                    className="mt-2 min-h-10 text-sm font-black text-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                >
                    Ganti produk
                </button>
            )}

            {selectedOption === null && (
                <button
                    type="button"
                    onClick={onSkip}
                    className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 text-sm font-black text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                >
                    <SkipForward className="size-4" />
                    Lewati produk ini
                </button>
            )}
        </>
    );
}

function UncertainProduct({
    captureId,
    itemIndex,
    candidates,
    canSearchManual,
    onSelectProduct,
    onManualSearch,
    onRetake,
    onSkip,
}: {
    captureId: string;
    itemIndex: number;
    candidates: ScannerProductCandidate[];
    canSearchManual: boolean;
    onSelectProduct: (
        captureId: string,
        itemIndex: number,
        candidate: ScannerProductCandidate,
    ) => void;
    onManualSearch: () => void;
    onRetake: () => void;
    onSkip: () => void;
}) {
    return (
        <>
            <p className="font-black">Produk mana yang difoto?</p>
            <div className="mt-2 space-y-2">
                {candidates.map((candidate, index) => (
                    <button
                        type="button"
                        key={candidate.productPublicId}
                        onClick={() =>
                            onSelectProduct(captureId, itemIndex, candidate)
                        }
                        className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--app-soft)] px-3 py-2 text-left hover:bg-[var(--app-soft-strong)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                    >
                        {candidate.photoUrl && (
                            <img
                                src={candidate.photoUrl}
                                alt=""
                                className="size-9 shrink-0 rounded-lg object-cover"
                            />
                        )}
                        <span className="min-w-0 flex-1">
                            {index === 0 && (
                                <span className="block text-[11px] font-bold text-[var(--muted-foreground)]">
                                    Paling cocok
                                </span>
                            )}
                            <span className="block truncate text-sm font-black">
                                {candidate.name}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
            <RecoveryActions
                canSearchManual={canSearchManual}
                onManualSearch={onManualSearch}
                onRetake={onRetake}
                onSkip={onSkip}
            />
        </>
    );
}

function UnknownProduct({
    canSearchManual,
    onManualSearch,
    onRetake,
    onSkip,
}: {
    canSearchManual: boolean;
    onManualSearch: () => void;
    onRetake: () => void;
    onSkip: () => void;
}) {
    return (
        <>
            <p className="font-black">Tidak ditemukan di katalog</p>
            <RecoveryActions
                canSearchManual={canSearchManual}
                onManualSearch={onManualSearch}
                onRetake={onRetake}
                onSkip={onSkip}
            />
        </>
    );
}

function RecoveryActions({
    canSearchManual,
    onManualSearch,
    onRetake,
    onSkip,
}: {
    canSearchManual: boolean;
    onManualSearch: () => void;
    onRetake: () => void;
    onSkip: () => void;
}) {
    return (
        <div className="mt-3 flex flex-wrap gap-2">
            {canSearchManual && <ManualButton onClick={onManualSearch} />}
            <button
                type="button"
                onClick={onRetake}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--app-ink)]/15 px-3 text-sm font-black text-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
            >
                <RotateCcw className="size-4" />
                Foto ulang
            </button>
            <button
                type="button"
                onClick={onSkip}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-[var(--muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
            >
                <SkipForward className="size-4" />
                Lewati produk ini
            </button>
        </div>
    );
}

function ManualButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--app-ink)]/15 px-3 text-sm font-black text-[var(--app-primary)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
        >
            <PackageSearch className="size-4" />
            Cari manual
        </button>
    );
}

function ResultStatus({
    skipped,
    ready,
}: {
    skipped: boolean;
    ready: boolean;
}) {
    if (skipped) {
        return (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--muted-foreground)]">
                <SkipForward className="size-3.5" />
                Dilewati
            </span>
        );
    }

    if (ready) {
        return (
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[var(--app-primary)]">
                <Check className="size-3.5" />
                Siap
            </span>
        );
    }

    return (
        <span className="mt-1 inline-flex text-xs font-bold text-[#a55a38]">
            Perlu dipilih
        </span>
    );
}

function ManualProductPicker({
    products,
    query,
    onQueryChange,
    onClose,
    onSelect,
}: {
    products: ScannerProductCandidate[];
    query: string;
    onQueryChange: (query: string) => void;
    onClose: () => void;
    onSelect: (product: ScannerProductCandidate) => void;
}) {
    return (
        <section className="absolute inset-0 z-20 flex flex-col bg-[#fff3ef]">
            <header className="flex items-center gap-3 border-b border-[var(--app-ink)]/10 bg-[#fffdfc] px-4 pt-[calc(env(safe-area-inset-top)+.75rem)] pb-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--app-soft)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                    aria-label="Kembali ke hasil scan"
                >
                    <ChevronLeft className="size-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black tracking-[-0.03em]">
                        Cari produk
                    </h2>
                    <p className="text-xs font-semibold text-[var(--muted-foreground)]">
                        Pilih untuk foto ini
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="grid size-11 shrink-0 place-items-center rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                    aria-label="Tutup pencarian"
                >
                    <X className="size-5" />
                </button>
            </header>

            <div className="border-b border-[var(--app-ink)]/10 bg-[#fffdfc] p-3 sm:p-4">
                <label className="relative block">
                    <span className="sr-only">Cari nama produk</span>
                    <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(event) => onQueryChange(event.target.value)}
                        placeholder="Cari nama produk atau varian"
                        className="h-12 w-full rounded-xl border border-[var(--app-ink)]/15 bg-white pr-3 pl-11 text-base outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary)]/15"
                    />
                </label>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
                {products.slice(0, 50).map((product) => (
                    <button
                        type="button"
                        key={product.productPublicId}
                        onClick={() => onSelect(product)}
                        className="flex min-h-16 w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-[0_8px_24px_-18px_var(--app-shadow)] focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                    >
                        <CaptureImage previewUrl={product.photoUrl ?? ''} />
                        <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-black">
                                {product.name}
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-[var(--muted-foreground)]">
                                {product.options.length > 1
                                    ? `${product.options.length} pilihan`
                                    : optionName(product.options[0])}
                            </span>
                        </span>
                    </button>
                ))}

                {products.length === 0 && (
                    <div className="grid min-h-40 place-items-center px-6 text-center">
                        <div>
                            <PackageSearch className="mx-auto size-7 text-[var(--muted-foreground)]" />
                            <p className="mt-2 text-sm font-black">
                                Produk tidak ditemukan
                            </p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                                Coba kata pencarian lain.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

function CaptureImage({
    previewUrl,
    loading = false,
}: {
    previewUrl: string;
    loading?: boolean;
}) {
    return (
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[var(--app-soft)]">
            {previewUrl && (
                <img
                    src={previewUrl}
                    alt=""
                    className={`size-full object-cover ${loading ? 'opacity-70' : ''}`}
                />
            )}
            {loading && (
                <span className="absolute inset-0 grid place-items-center bg-[var(--app-primary)]/20">
                    <LoaderCircle className="size-6 animate-spin text-white" />
                </span>
            )}
        </div>
    );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-[#9a4d38] hover:bg-[#fff1eb] focus-visible:ring-2 focus-visible:ring-[#b85b3b] focus-visible:outline-none"
            aria-label="Hapus hasil"
        >
            <Trash2 className="size-4" />
        </button>
    );
}

function optionName(option: ScannerSaleOption): string {
    if (option.variantName) {
        return `${option.variantName} · ${option.unitName} (${option.unitSymbol})`;
    }

    return `${option.unitName} (${option.unitSymbol})`;
}
