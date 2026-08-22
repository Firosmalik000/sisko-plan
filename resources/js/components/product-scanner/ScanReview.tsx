import {
    AlertCircle,
    Check,
    ChevronLeft,
    LoaderCircle,
    PackageSearch,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
    ScannerCandidate,
    ScannerCapture,
    ScannerPurpose,
    ScannerSelection,
} from './types';

const actionLabels: Record<ScannerPurpose, string> = {
    sale: 'Tambahkan ke keranjang',
    purchase: 'Tambahkan ke pembelian',
    stock_count: 'Gunakan untuk opname',
    product: 'Periksa produk',
};

export function ScanReview({
    captures,
    selections,
    purpose,
    onBack,
    onRemove,
    onRetry,
    onSelectCandidate,
    onConfirm,
    onManualSearch,
}: {
    captures: ScannerCapture[];
    selections: ScannerSelection[];
    purpose: ScannerPurpose;
    onBack: () => void;
    onRemove: (id: string) => void;
    onRetry: (id: string) => void;
    onSelectCandidate: (
        captureId: string,
        itemIndex: number,
        candidate: ScannerCandidate,
    ) => void;
    onConfirm: (selections: ScannerSelection[]) => void;
    onManualSearch?: () => void;
}) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const confirmed = useMemo(
        () =>
            selections.map((selection) => ({
                ...selection,
                quantity:
                    quantities[
                        `${selection.captureId}:${selection.itemIndex}`
                    ] ?? selection.quantity,
            })),
        [quantities, selections],
    );
    const pending = captures.some(
        (capture) =>
            capture.status === 'queued' || capture.status === 'recognizing',
    );

    return (
        <div className="flex h-svh flex-col bg-[#f5f7f2] text-[#173c35]">
            <header className="flex items-center gap-3 border-b border-[#173c35]/10 bg-[#fbfcf8] px-4 pt-[calc(env(safe-area-inset-top)+.75rem)] pb-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="grid size-11 place-items-center rounded-xl bg-[#e8efeb] focus-visible:ring-2 focus-visible:ring-[#34765f] focus-visible:outline-none"
                    aria-label="Kembali ke kamera"
                >
                    <ChevronLeft className="size-5" />
                </button>
                <div>
                    <h2 className="text-xl font-black tracking-[-0.03em]">
                        Periksa hasil
                    </h2>
                    <p className="text-xs font-semibold text-[#687d76]">
                        Konfirmasi produk dan jumlah sebelum digunakan
                    </p>
                </div>
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
                                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#e6ece8]">
                                    {capture.previewUrl && (
                                        <img
                                            src={capture.previewUrl}
                                            alt=""
                                            className="size-full object-cover opacity-70"
                                        />
                                    )}
                                    <span className="absolute inset-0 grid place-items-center bg-[#173c35]/20">
                                        <LoaderCircle className="size-6 animate-spin text-white" />
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-black">
                                        Mencari produk…
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-[#687d76]">
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
                                <div className="mt-3 flex gap-2">
                                    {capture.retryable && (
                                        <button
                                            type="button"
                                            onClick={() => onRetry(capture.id)}
                                            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#173c35] px-3 text-sm font-black text-white"
                                        >
                                            <RefreshCw className="size-4" />
                                            Coba lagi
                                        </button>
                                    )}
                                    {onManualSearch && (
                                        <button
                                            type="button"
                                            onClick={onManualSearch}
                                            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#173c35]/15 px-3 text-sm font-black text-[#286450]"
                                        >
                                            <PackageSearch className="size-4" />
                                            {purpose === 'product'
                                                ? 'Isi tanpa foto'
                                                : 'Cari manual'}
                                        </button>
                                    )}
                                    <RemoveButton
                                        onClick={() => onRemove(capture.id)}
                                    />
                                </div>
                            </div>
                        );
                    }

                    return capture.results.map((result) => {
                        const selected = selections.find(
                            (selection) =>
                                selection.captureId === capture.id &&
                                selection.itemIndex === result.itemIndex &&
                                selection.productId === result.productId,
                        );

                        return (
                            <div
                                key={`${capture.id}-${result.itemIndex}`}
                                className="rounded-2xl bg-white p-3 shadow-[0_8px_24px_-18px_rgba(23,60,53,.55)]"
                            >
                                <div className="flex gap-3">
                                    <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-[#e8efeb]">
                                        {capture.previewUrl && (
                                            <img
                                                src={capture.previewUrl}
                                                alt=""
                                                className="size-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {result.status === 'found' &&
                                        selected ? (
                                            <>
                                                <div className="flex items-start gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate font-black">
                                                            {selected.name}
                                                        </p>
                                                        <p className="text-xs font-semibold text-[#687d76]">
                                                            {[
                                                                selected.variantName,
                                                                selected.unitSymbol,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </p>
                                                    </div>
                                                    <Check className="size-5 text-[#28735b]" />
                                                </div>
                                                <label className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-[#58736a]">
                                                    Jumlah
                                                    <input
                                                        type="number"
                                                        min="0.000001"
                                                        step="any"
                                                        value={
                                                            quantities[
                                                                `${capture.id}:${result.itemIndex}`
                                                            ] ?? 1
                                                        }
                                                        onChange={(event) =>
                                                            setQuantities(
                                                                (current) => ({
                                                                    ...current,
                                                                    [`${capture.id}:${result.itemIndex}`]:
                                                                        Math.max(
                                                                            0.000001,
                                                                            Number(
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            ) ||
                                                                                1,
                                                                        ),
                                                                }),
                                                            )
                                                        }
                                                        className="h-10 w-24 rounded-xl border border-[#173c35]/15 px-3 text-right text-sm font-black outline-none focus:border-[#34765f]"
                                                    />
                                                </label>
                                            </>
                                        ) : result.status === 'uncertain' ? (
                                            <>
                                                <p className="font-black">
                                                    Pilih hasil yang paling
                                                    cocok
                                                </p>
                                                <div className="mt-2 space-y-2">
                                                    {result.candidates.map(
                                                        (candidate) => (
                                                            <button
                                                                type="button"
                                                                key={`${candidate.productId}-${candidate.unitId}`}
                                                                onClick={() =>
                                                                    onSelectCandidate(
                                                                        capture.id,
                                                                        result.itemIndex,
                                                                        candidate,
                                                                    )
                                                                }
                                                                className="min-h-11 w-full rounded-xl bg-[#edf3ef] px-3 text-left text-sm font-bold hover:bg-[#e3ece7] focus-visible:ring-2 focus-visible:ring-[#34765f] focus-visible:outline-none"
                                                            >
                                                                {candidate.name}
                                                                {candidate.variantName
                                                                    ? ` · ${candidate.variantName}`
                                                                    : ''}
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-black">
                                                    Tidak ditemukan di katalog
                                                </p>
                                                <p className="mt-1 text-xs leading-5 text-[#687d76]">
                                                    Cari berdasarkan nama atau
                                                    barcode, atau foto ulang
                                                    dari sisi depan.
                                                </p>
                                                {onManualSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={onManualSearch}
                                                        className="mt-2 flex min-h-10 items-center gap-2 text-sm font-black text-[#286450]"
                                                    >
                                                        <PackageSearch className="size-4" />
                                                        {purpose === 'product'
                                                            ? 'Isi tanpa foto'
                                                            : 'Cari manual'}
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <RemoveButton
                                        onClick={() => onRemove(capture.id)}
                                    />
                                </div>
                            </div>
                        );
                    });
                })}
            </div>

            <footer className="border-t border-[#173c35]/10 bg-[#fbfcf8] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+.75rem)]">
                <button
                    type="button"
                    disabled={confirmed.length === 0 || pending}
                    onClick={() => onConfirm(confirmed)}
                    className="min-h-12 w-full rounded-2xl bg-[#173c35] px-4 text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(23,60,53,.8)] disabled:opacity-40"
                >
                    {pending ? 'Menunggu hasil…' : actionLabels[purpose]}
                    {confirmed.length > 0 ? ` · ${confirmed.length}` : ''}
                </button>
            </footer>
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
