import { Link } from '@inertiajs/react';
import { AlertCircle, Camera, Check, Images, LoaderCircle, Pause, Play, ScanBarcode, SwitchCamera, X, Zap, ZapOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { translate } from '@/lib/i18n';
import { autoCaptureFeedback, barcodeScannerFeedback } from './barcode-scanner-feedback';
import type { AutoCaptureStatus, BarcodeScanStatus } from './barcode-scanner-feedback';
import { CaptureTray } from './CaptureTray';
import type { ScannerCapture } from './types';

export function CameraViewport({
    barcodeEnabled,
    aiPhotoAvailable,
    aiQuotaExhausted,
    manualPhotoFallback,
    autoActive,
    autoCaptureStatus,
    autoCaptureProgress,
    onToggleAuto,
    onReviewPhoto,
    canCapture,
    pendingCount,
    productPhotos,
    productDraftCount,
    onRemoveProductPhoto,
    videoRef,
    captures,
    ready,
    error,
    torchAvailable,
    torchOn,
    onClose,
    onCapture,
    onGallery,
    onRemove,
    onFinish,
    onToggleTorch,
    onRetry,
    onManualSearch,
    manualActionLabel,
    scanMode,
    barcodeError,
    barcodeStatus,
    photoStatus,
    photoError,
    onToggleScanMode,
}: {
    barcodeEnabled: boolean;
    aiPhotoAvailable: boolean;
    aiQuotaExhausted: boolean;
    manualPhotoFallback: boolean;
    autoActive: boolean;
    autoCaptureStatus: AutoCaptureStatus;
    autoCaptureProgress: number;
    onToggleAuto: () => void;
    onReviewPhoto: (id: string) => void;
    canCapture: boolean;
    pendingCount: number;
    productPhotos: Array<{ id: string; previewUrl: string; status?: string }>;
    productDraftCount: number;
    onRemoveProductPhoto?: (id: string) => void;
    videoRef: RefObject<HTMLVideoElement | null>;
    captures: ScannerCapture[];
    ready: boolean;
    error: string | null;
    torchAvailable: boolean;
    torchOn: boolean;
    onClose: () => void;
    onCapture: () => void;
    onGallery: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemove: (id: string) => void;
    onFinish: () => void;
    onToggleTorch: () => void;
    onRetry: () => void;
    onManualSearch?: () => void;
    manualActionLabel?: string;
    scanMode: 'photo' | 'barcode';
    barcodeError: string;
    barcodeStatus: BarcodeScanStatus;
    photoStatus: 'idle' | 'reading' | 'success' | 'not_found' | 'failed';
    photoError: string;
    onToggleScanMode: () => void;
}) {
    const tray = useRef<HTMLDivElement>(null);
    const barcodeFeedback = barcodeScannerFeedback(barcodeStatus);
    const autoFeedback = autoCaptureFeedback(autoCaptureStatus);
    const barcodeFrameTone =
        barcodeFeedback.tone === 'success'
            ? 'border-[#8bd5a0]'
            : barcodeFeedback.tone === 'warning'
              ? 'border-[#f5bd67]'
              : barcodeFeedback.tone === 'progress'
                ? 'border-[#f0a35d]'
                : 'border-white/70';
    useEffect(() => {
        if (tray.current) {
            tray.current.scrollLeft = tray.current.scrollWidth;
        }
    }, [productPhotos.length]);

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#14201d] text-white">
            <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 size-full object-cover"
                aria-label={translate('Pratinjau kamera')}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,28,24,.7)_0%,transparent_25%,transparent_62%,rgba(8,28,24,.9)_100%)]" />

            <header className="relative z-10 grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-start gap-2 px-[max(1rem,env(safe-area-inset-left))] pt-[calc(env(safe-area-inset-top)+.75rem)] sm:gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="grid size-12 place-items-center rounded-full bg-[#14201d]/75 text-white backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    aria-label={translate('Tutup kamera')}
                >
                    <X className="size-5" />
                </button>
                <div className="min-w-0 rounded-xl bg-[#14201d]/75 px-2 py-2 text-center backdrop-blur-sm sm:px-3">
                    <p className="text-sm font-black">
                        {translate(scanMode === 'photo' ? 'Arahkan ke satu barang' : 'Arahkan ke barcode')}
                    </p>
                    <p className="text-[11px] text-[var(--app-soft-strong)]">
                        {translate(
                            scanMode === 'photo'
                                ? autoActive
                                    ? 'Foto otomatis setelah kamera stabil'
                                    : 'Tekan tombol untuk mengambil foto'
                                : 'Barcode terbaca otomatis tanpa menekan tombol',
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onToggleTorch}
                    disabled={!torchAvailable}
                    className="grid size-12 place-items-center rounded-full bg-[#14201d]/75 text-white backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-35"
                    aria-label={translate(torchOn ? 'Matikan lampu' : 'Nyalakan lampu')}
                >
                    {torchOn ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
                </button>
            </header>

            <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-4 py-3 sm:px-7 sm:py-4">
                {error ? (
                    <div
                        className="max-w-sm rounded-2xl bg-white p-5 text-center text-[#14201d] shadow-xl"
                        role="status"
                        aria-live="polite"
                    >
                        <Camera className="mx-auto size-8 text-[#d66a35]" />
                        <p className="mt-3 text-base font-black">{translate('Kamera belum tersedia')}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{translate(error)}</p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-4 min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-black text-[#14201d] focus-visible:ring-2 focus-visible:ring-[#e2793c] focus-visible:outline-none"
                        >
                            {translate('Coba lagi')}
                        </button>
                        {onManualSearch && (
                            <button
                                type="button"
                                onClick={onManualSearch}
                                className="mt-2 min-h-11 w-full rounded-xl bg-[var(--app-primary)] px-4 text-sm font-black text-[var(--app-primary-foreground)] focus-visible:ring-2 focus-visible:ring-[#e2793c] focus-visible:outline-none"
                            >
                                {translate(manualActionLabel ?? 'Cari manual')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        className={`relative max-h-full max-w-xl rounded-[1.75rem] border shadow-[0_16px_50px_-22px_rgba(0,0,0,.8)] transition-colors ${scanMode === 'barcode' ? `aspect-[2.25/1] w-full ${barcodeFrameTone}` : `aspect-[4/3] w-[min(100%,61svh)] ${autoCaptureStatus === 'captured' ? 'border-[#8bd5a0]' : autoActive ? 'border-[#f0a35d]' : 'border-white/70'}`}`}
                    >
                        <span
                            aria-hidden="true"
                            className="absolute -top-px -left-px size-14 rounded-tl-[1.75rem] border-t-4 border-l-4 border-[#f0a35d]"
                        />
                        <span
                            aria-hidden="true"
                            className="absolute -right-px -bottom-px size-14 rounded-br-[1.75rem] border-r-4 border-b-4 border-[#f0a35d]"
                        />
                        {!ready && (
                            <div className="grid size-full place-items-center">
                                <SwitchCamera className="size-7 animate-pulse" />
                            </div>
                        )}
                        {ready && scanMode === 'photo' && (autoActive || autoCaptureStatus === 'captured') && (
                            <>
                                <svg aria-hidden="true" className="pointer-events-none absolute inset-0 size-full overflow-visible">
                                    <rect
                                        x="2"
                                        y="2"
                                        width="calc(100% - 4px)"
                                        height="calc(100% - 4px)"
                                        rx="28"
                                        pathLength="100"
                                        fill="none"
                                        stroke={autoCaptureStatus === 'captured' ? '#8bd5a0' : '#ffd0a7'}
                                        strokeWidth="5"
                                        strokeLinecap="round"
                                        strokeDasharray={`${autoCaptureProgress} 100`}
                                        className="transition-[stroke-dasharray,stroke] duration-300 motion-reduce:transition-none"
                                    />
                                </svg>
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className={`absolute bottom-3 left-1/2 flex min-h-9 -translate-x-1/2 items-center gap-2 rounded-full px-3 text-xs font-black whitespace-nowrap shadow-[0_8px_24px_-12px_rgba(0,0,0,.8)] ${autoFeedback.tone === 'success' ? 'bg-[#d6f4df] text-[#185b32]' : 'bg-[#14201d]/85 text-white'}`}
                                >
                                    {autoCaptureStatus === 'captured' ? (
                                        <Check className="size-4" />
                                    ) : autoCaptureStatus === 'processing' ? (
                                        <LoaderCircle className="size-4 animate-spin" />
                                    ) : (
                                        <Camera className="size-4 text-[#f0a35d]" />
                                    )}
                                    {translate(autoFeedback.message)}
                                </div>
                            </>
                        )}
                        {ready && scanMode === 'barcode' && (
                            <>
                                {barcodeStatus === 'scanning' && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-1/2 right-5 left-5 h-px bg-[#f0a35d] shadow-[0_0_16px_2px_rgba(240,163,93,.65)] motion-safe:animate-pulse"
                                    />
                                )}
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className={`absolute bottom-3 left-1/2 flex min-h-9 -translate-x-1/2 items-center gap-2 rounded-full px-3 text-xs font-black whitespace-nowrap shadow-[0_8px_24px_-12px_rgba(0,0,0,.8)] ${barcodeFeedback.tone === 'success' ? 'bg-[#d6f4df] text-[#185b32]' : barcodeFeedback.tone === 'warning' ? 'bg-[#fff0d9] text-[#87531a]' : 'bg-[#14201d]/85 text-white'}`}
                                >
                                    {barcodeStatus === 'success' ? (
                                        <Check className="size-4" />
                                    ) : barcodeStatus === 'not_found' ? (
                                        <AlertCircle className="size-4" />
                                    ) : barcodeStatus === 'reading' ? (
                                        <LoaderCircle className="size-4 animate-spin" />
                                    ) : (
                                        <ScanBarcode className="size-4 text-[#f0a35d]" />
                                    )}
                                    {translate(
                                        barcodeStatus === 'success'
                                            ? 'Berhasil. Produk masuk ke hasil scan.'
                                            : barcodeStatus === 'not_found'
                                              ? 'Produk belum terdaftar'
                                              : barcodeFeedback.message,
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="relative z-10 shrink-0 bg-gradient-to-t from-black/65 to-transparent pt-3">
                <CaptureTray captures={captures} onRemove={onRemove} />
                {productPhotos.length > 0 && (
                    <div
                        ref={tray}
                        className="mx-auto flex max-w-lg [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-2 [&::-webkit-scrollbar]:hidden"
                    >
                        {productPhotos.map((photo) => (
                            <div key={photo.id} className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => onReviewPhoto(photo.id)}
                                    className="size-full"
                                    aria-label={translate('Lihat hasil')}
                                >
                                    {photo.previewUrl ? (
                                        <img src={photo.previewUrl} alt={translate('Foto produk')} className="size-full object-cover" />
                                    ) : (
                                        <Camera className="m-auto size-6" />
                                    )}
                                    <span className="absolute bottom-0 left-0 rounded bg-black/80 px-1 text-xs text-white">
                                        {photo.status === 'ready' ? (
                                            <Check className="size-4 text-green-300" />
                                        ) : photo.status === 'failed' ? (
                                            <AlertCircle className="size-4 text-orange-300" />
                                        ) : (
                                            <LoaderCircle className="size-4 animate-spin" />
                                        )}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onRemoveProductPhoto?.(photo.id)}
                                    aria-label={translate('Hapus foto produk')}
                                    className="absolute top-0 right-0 grid size-8 place-items-center rounded-full bg-black/70 text-white"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {pendingCount >= 10 && (
                    <p role="status" className="mb-2 text-center text-xs text-white">
                        {translate('Antrean penuh. Periksa hasil atau tunggu foto selesai.')}
                    </p>
                )}
                <div className="mx-auto mb-3 flex w-full max-w-sm items-center gap-2 px-4">
                    {barcodeEnabled && (
                        <div className="flex min-w-0 flex-1 rounded-full bg-[#14201d]/80 p-1 backdrop-blur-sm">
                            <button
                                type="button"
                                disabled={!aiPhotoAvailable}
                                onClick={() => {
                                    if (scanMode !== 'photo') {
                                        onToggleScanMode();
                                    }
                                }}
                                className={`min-h-12 min-w-0 flex-1 rounded-full px-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${scanMode === 'photo' ? 'bg-white !text-[#14201d]' : 'text-white/70'}`}
                                aria-pressed={scanMode === 'photo'}
                            >
                                {translate('Foto barang')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (scanMode !== 'barcode') {
                                        onToggleScanMode();
                                    }
                                }}
                                className={`min-h-12 min-w-0 flex-1 rounded-full px-2 text-xs font-black transition ${scanMode === 'barcode' ? 'bg-white !text-[#14201d]' : 'text-white/70'}`}
                                aria-pressed={scanMode === 'barcode'}
                            >
                                {translate('Barcode')}
                            </button>
                        </div>
                    )}
                    {scanMode === 'photo' && (
                        <button
                            type="button"
                            onClick={onToggleAuto}
                            disabled={!canCapture}
                            className="flex min-h-12 items-center gap-2 rounded-full bg-black/50 px-3 text-xs font-bold text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-50"
                        >
                            {autoActive ? <Pause className="size-4" /> : <Play className="size-4" />}
                            {translate(autoActive && canCapture ? 'Auto aktif' : 'Auto jeda')}
                        </button>
                    )}
                </div>
                {!aiPhotoAvailable && (
                    <div role="status" className="mx-5 mb-3 rounded-xl bg-[#fff0d9] px-3 py-2 text-center text-xs font-bold text-[#694016]">
                        <p>
                            {translate(
                                manualPhotoFallback
                                    ? aiQuotaExhausted
                                        ? 'Kuota foto AI habis. Foto ini tetap bisa dipakai untuk isi produk manual.'
                                        : 'Foto AI sedang tidak tersedia. Foto ini tetap bisa dipakai untuk isi produk manual.'
                                    : aiQuotaExhausted
                                      ? 'Kuota foto AI bulan ini habis. Barcode tetap bisa digunakan.'
                                      : 'Foto AI sedang tidak tersedia. Barcode tetap bisa digunakan.',
                            )}
                        </p>
                        {!manualPhotoFallback && aiQuotaExhausted && (
                            <>
                                <p className="mt-1 font-medium">{translate('Tambah kuota AI untuk mengenali produk dari foto.')}</p>
                                <Link
                                    href="/pricing?category=scan_capacity#category-scan_capacity"
                                    className="mt-2 inline-flex min-h-10 items-center justify-center rounded-lg bg-[#14201d] px-4 font-black text-white"
                                >
                                    {translate('Tambah kuota scan AI')}
                                </Link>
                            </>
                        )}
                    </div>
                )}
                {barcodeError && (
                    <div role="alert" className="mx-5 mb-3 rounded-xl bg-red-950/75 px-3 py-2 text-center text-xs font-bold text-red-100">
                        <p>{translate(barcodeError)}</p>
                    </div>
                )}
                {scanMode === 'photo' && photoStatus === 'failed' && (
                    <p role="alert" className="mx-5 mb-3 rounded-xl bg-red-950/90 px-3 py-2 text-center text-xs font-bold text-white">
                        {translate(photoError || 'Foto gagal diproses. Coba lagi.')}
                    </p>
                )}
                {scanMode === 'barcode' && barcodeStatus === 'not_found' && onManualSearch && !barcodeError && (
                    <div className="mx-5 mb-3 text-center">
                        <button
                            type="button"
                            onClick={onManualSearch}
                            className="min-h-11 rounded-xl bg-white px-4 text-sm font-black text-[#14201d] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                        >
                            {translate(manualActionLabel ?? 'Cari manual')}
                        </button>
                    </div>
                )}
                <div className="flex w-full items-center justify-between gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:gap-4 sm:px-5">
                    <label className="grid size-12 cursor-pointer place-items-center rounded-2xl bg-white/12 text-white focus-within:ring-2 focus-within:ring-white">
                        <Images className="size-5" />
                        <span className="sr-only">{translate('Pilih dari galeri')}</span>
                        <input type="file" accept="image/*" multiple onChange={onGallery} className="sr-only" />
                    </label>
                    {scanMode === 'photo' && (
                        <button
                            type="button"
                            onClick={onCapture}
                            disabled={!ready || !canCapture}
                            className="grid size-[4.5rem] place-items-center rounded-full border-[5px] border-white bg-[#e2793c] shadow-[0_12px_30px_-12px_rgba(226,121,60,.8)] transition focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none active:scale-95 disabled:opacity-70 motion-reduce:transition-none"
                            aria-label={translate('Ambil foto')}
                        >
                            <span className="size-10 rounded-full border-2 border-white/80" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onFinish}
                        disabled={captures.length === 0 && productPhotos.length === 0 && productDraftCount === 0}
                        className="min-h-12 min-w-20 rounded-2xl bg-white px-3 text-sm font-black !text-[#14201d] disabled:opacity-70 sm:min-w-24"
                    >
                        {translate('Hasil')} ({captures.length || productDraftCount || productPhotos.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
