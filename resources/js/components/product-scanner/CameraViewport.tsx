import {
    Camera,
    Images,
    Pause,
    Play,
    Sparkles,
    ScanLine,
    SwitchCamera,
    X,
    Zap,
    ZapOff,
} from 'lucide-react';
import type { ChangeEvent, RefObject } from 'react';
import { CaptureTray } from './CaptureTray';
import type { ScannerCapture } from './types';

export function CameraViewport({
    videoRef,
    captures,
    ready,
    error,
    autoPaused,
    torchAvailable,
    torchOn,
    onClose,
    onCapture,
    onGallery,
    onRemove,
    onFinish,
    onToggleAuto,
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
    videoRef: RefObject<HTMLVideoElement | null>;
    captures: ScannerCapture[];
    ready: boolean;
    error: string | null;
    autoPaused: boolean;
    torchAvailable: boolean;
    torchOn: boolean;
    onClose: () => void;
    onCapture: () => void;
    onGallery: (event: ChangeEvent<HTMLInputElement>) => void;
    onRemove: (id: string) => void;
    onFinish: () => void;
    onToggleAuto: () => void;
    onToggleTorch: () => void;
    onRetry: () => void;
    onManualSearch?: () => void;
    manualActionLabel?: string;
    scanMode: 'photo' | 'barcode';
    barcodeError: string;
    barcodeStatus: 'idle' | 'reading' | 'success' | 'not_found';
    photoStatus: 'idle' | 'reading' | 'success' | 'not_found' | 'failed';
    photoError: string;
    onToggleScanMode: () => void;
}) {
    const photoProcessing = photoStatus === 'reading';

    return (
        <div className="relative flex h-svh w-full flex-col overflow-hidden bg-[#102a25] text-white">
            <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 size-full object-cover"
                aria-label="Pratinjau kamera"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,28,24,.7)_0%,transparent_25%,transparent_62%,rgba(8,28,24,.9)_100%)]" />

            <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+.75rem)]">
                <button
                    type="button"
                    onClick={onClose}
                    className="grid size-11 place-items-center rounded-full bg-[#102a25]/75 text-white backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    aria-label="Tutup kamera"
                >
                    <X className="size-5" />
                </button>
                <div className="rounded-xl bg-[#102a25]/75 px-3 py-2 text-center backdrop-blur-sm">
                    <p className="text-sm font-black">
                        {scanMode === 'photo'
                            ? 'Arahkan, tahan stabil'
                            : 'Arahkan ke barcode'}
                    </p>
                    <p className="text-[11px] text-[#d5e4df]">
                        {scanMode === 'photo'
                            ? 'Foto otomatis setelah stabil 1,5 detik'
                            : 'Hasil terbaca langsung diperiksa'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onToggleTorch}
                    disabled={!torchAvailable}
                    className="grid size-11 place-items-center rounded-full bg-[#102a25]/75 text-white backdrop-blur-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-35"
                    aria-label={torchOn ? 'Matikan lampu' : 'Nyalakan lampu'}
                >
                    {torchOn ? (
                        <Zap className="size-5" />
                    ) : (
                        <ZapOff className="size-5" />
                    )}
                </button>
            </header>

            <div className="relative z-10 flex flex-1 items-center justify-center px-7 py-4">
                {error ? (
                    <div
                        className="max-w-sm rounded-2xl bg-white p-5 text-center text-[#173c35] shadow-xl"
                        role="status"
                        aria-live="polite"
                    >
                        <Camera className="mx-auto size-8 text-[#d66a35]" />
                        <p className="mt-3 text-base font-black">
                            Kamera belum tersedia
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#58736a]">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={onRetry}
                            className="mt-4 min-h-11 w-full rounded-xl border border-[#bfd1cb] bg-white px-4 text-sm font-black text-[#173c35] focus-visible:ring-2 focus-visible:ring-[#e2793c] focus-visible:outline-none"
                        >
                            Coba lagi
                        </button>
                        {onManualSearch && (
                            <button
                                type="button"
                                onClick={onManualSearch}
                                className="mt-2 min-h-11 w-full rounded-xl bg-[#173c35] px-4 text-sm font-black text-white focus-visible:ring-2 focus-visible:ring-[#e2793c] focus-visible:outline-none"
                            >
                                {manualActionLabel ?? 'Cari manual'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div
                        className="relative aspect-[4/3] w-full max-w-xl rounded-[1.75rem] border border-white/70 shadow-[0_16px_50px_-22px_rgba(0,0,0,.8)]"
                        aria-hidden="true"
                    >
                        <span className="absolute -top-px -left-px size-14 rounded-tl-[1.75rem] border-t-4 border-l-4 border-[#f0a35d]" />
                        <span className="absolute -right-px -bottom-px size-14 rounded-br-[1.75rem] border-r-4 border-b-4 border-[#f0a35d]" />
                        {!ready && (
                            <div className="grid size-full place-items-center">
                                <SwitchCamera className="size-7 animate-pulse" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <CaptureTray captures={captures} onRemove={onRemove} />
                {captures.length > 0 && (
                    <p className="mb-2 text-center text-xs font-black text-[#d5e4df]">
                        {captures.length} hasil tersimpan di sesi ini
                    </p>
                )}
                <div className="mx-auto mb-3 flex w-fit rounded-full bg-[#102a25]/80 p-1 backdrop-blur-sm">
                    <button
                        type="button"
                        onClick={() => {
                            if (scanMode !== 'photo') {
                                onToggleScanMode();
                            }
                        }}
                        className={`min-h-9 rounded-full px-4 text-xs font-black transition ${scanMode === 'photo' ? 'bg-white text-[#173c35]' : 'text-white/70'}`}
                        aria-pressed={scanMode === 'photo'}
                    >
                        Scan Foto
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (scanMode !== 'barcode') {
                                onToggleScanMode();
                            }
                        }}
                        className={`min-h-9 rounded-full px-4 text-xs font-black transition ${scanMode === 'barcode' ? 'bg-white text-[#173c35]' : 'text-white/70'}`}
                        aria-pressed={scanMode === 'barcode'}
                    >
                        Barcode
                    </button>
                </div>
                {barcodeError && (
                    <p
                        role="alert"
                        className="mx-5 mb-3 rounded-xl bg-red-950/75 px-3 py-2 text-center text-xs font-bold text-red-100"
                    >
                        {barcodeError}
                    </p>
                )}
                {scanMode === 'photo' && photoStatus !== 'idle' && (
                    <p
                        role={photoStatus === 'failed' ? 'alert' : 'status'}
                        aria-live="polite"
                        className={`mx-5 mb-3 rounded-xl px-3 py-2 text-center text-xs font-black ${photoStatus === 'success' ? 'bg-[#d6f4df] text-[#17633d]' : photoStatus === 'not_found' ? 'bg-[#fff0d9] text-[#87531a]' : photoStatus === 'failed' ? 'bg-red-950/75 text-red-100' : 'bg-white/15 text-[#e5f1ed]'}`}
                    >
                        {photoStatus === 'reading'
                            ? 'Foto diambil. Sedang mengenali produk…'
                            : photoStatus === 'success'
                              ? 'Produk dikenali. Membuka hasil…'
                              : photoStatus === 'not_found'
                                ? 'Produk belum dikenali. Ubah posisi, lalu tahan stabil.'
                                : photoError ||
                                  'Foto gagal diproses. Ubah posisi, lalu coba lagi.'}
                    </p>
                )}
                {scanMode === 'barcode' && (
                    <p
                        role="status"
                        aria-live="polite"
                        className={`mx-5 mb-3 rounded-xl px-3 py-2 text-center text-xs font-black ${barcodeStatus === 'success' ? 'bg-[#d6f4df] text-[#17633d]' : barcodeStatus === 'not_found' ? 'bg-[#fff0d9] text-[#87531a]' : 'bg-white/15 text-[#e5f1ed]'}`}
                    >
                        {barcodeStatus === 'idle'
                            ? 'Mode barcode aktif. Arahkan kode ke kamera.'
                            : barcodeStatus === 'reading'
                              ? 'Barcode terbaca, mencari produk…'
                              : barcodeStatus === 'success'
                                ? 'Berhasil. Produk masuk ke hasil scan.'
                                : 'Kode terbaca, tetapi produk belum ada di katalog.'}
                    </p>
                )}
                <div className="flex items-center justify-between gap-4 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                    <label className="grid size-12 cursor-pointer place-items-center rounded-2xl bg-white/12 text-white focus-within:ring-2 focus-within:ring-white">
                        <Images className="size-5" />
                        <span className="sr-only">Pilih dari galeri</span>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={onGallery}
                            className="sr-only"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={onCapture}
                        disabled={!ready || photoProcessing}
                        className="grid size-[4.5rem] place-items-center rounded-full border-[5px] border-white bg-[#e2793c] shadow-[0_12px_30px_-12px_rgba(226,121,60,.8)] transition active:scale-95 disabled:opacity-40 motion-reduce:transition-none"
                        aria-label="Ambil foto"
                    >
                        <span className="size-10 rounded-full border-2 border-white/80" />
                    </button>
                    <button
                        type="button"
                        onClick={onFinish}
                        disabled={captures.length === 0 || photoProcessing}
                        className="min-h-12 min-w-24 rounded-2xl bg-white px-3 text-sm font-black text-[#173c35] disabled:opacity-40"
                    >
                        Tinjau hasil · {captures.length}
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onToggleAuto}
                    disabled={scanMode === 'barcode'}
                    className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] left-1/2 flex min-h-9 -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#102a25]/75 px-3 text-[11px] font-bold text-[#e2eee9] backdrop-blur-sm"
                >
                    {scanMode === 'barcode' ? (
                        <>
                            <ScanLine className="size-3.5 text-[#82d4a7]" />
                            Barcode otomatis
                        </>
                    ) : (
                        <>
                            {autoPaused ? (
                                <Play className="size-3.5" />
                            ) : (
                                <Pause className="size-3.5" />
                            )}
                            <Sparkles className="size-3.5 text-[#f0a35d]" />
                            Auto foto {autoPaused ? 'dijeda' : 'aktif'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
