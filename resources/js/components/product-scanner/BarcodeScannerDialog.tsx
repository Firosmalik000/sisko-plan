import {
    Camera,
    ImageUp,
    LoaderCircle,
    RefreshCw,
    ScanBarcode,
    X,
    Zap,
    ZapOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { decodeBarcodeImage } from './decode-barcode-image';
import { useCamera } from './use-camera';

type BarcodeScannerDialogProps = {
    open: boolean;
    title: string;
    onOpenChange: (open: boolean) => void;
    onDetected: (value: string) => void;
};

export default function BarcodeScannerDialog({
    open,
    title,
    onOpenChange,
    onDetected,
}: BarcodeScannerDialogProps) {
    const handledRef = useRef(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [processingPhoto, setProcessingPhoto] = useState(false);
    const [scanError, setScanError] = useState('');
    const handleDetected = useCallback(
        (value: string) => {
            const normalized = value.trim();

            if (!normalized || handledRef.current) {
                return;
            }

            handledRef.current = true;
            navigator.vibrate?.(45);
            onDetected(normalized);
            onOpenChange(false);
        },
        [onDetected, onOpenChange],
    );
    const {
        videoRef,
        ready,
        error: cameraError,
        capture,
        torchAvailable,
        torchOn,
        toggleTorch,
        retry,
    } = useCamera(open, handleDetected);
    const detectorAvailable =
        typeof window !== 'undefined' && Boolean(window.BarcodeDetector);

    useEffect(() => {
        if (open) {
            handledRef.current = false;
        }
    }, [open]);

    const changeOpen = (nextOpen: boolean) => {
        if (!nextOpen) {
            setProcessingPhoto(false);
            setScanError('');
        }

        onOpenChange(nextOpen);
    };

    const readImage = async (image: Blob | null) => {
        if (!image || processingPhoto) {
            return;
        }

        setProcessingPhoto(true);
        setScanError('');

        try {
            const barcode = await decodeBarcodeImage(image);

            if (!barcode) {
                throw new Error(
                    'Kode belum terbaca. Pastikan seluruh kode terlihat dan tidak buram.',
                );
            }

            handleDetected(barcode);
        } catch (error) {
            setScanError(
                error instanceof Error
                    ? error.message
                    : 'Kode belum terbaca. Coba lagi.',
            );
        } finally {
            setProcessingPhoto(false);
        }
    };

    const readFromCamera = async () => {
        await readImage(await capture());
    };

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent className="inset-0 top-0 left-0 z-[80] block h-svh w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-[var(--app-ink)] p-0 text-white shadow-none [&>button]:hidden">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="absolute inset-0 size-full object-cover"
                    aria-label="Kamera pemindai barcode"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,25,22,.86)_0%,rgba(5,25,22,.18)_32%,rgba(5,25,22,.18)_58%,rgba(5,25,22,.92)_100%)]" />

                <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+.75rem)] sm:px-6">
                    <button
                        type="button"
                        onClick={() => changeOpen(false)}
                        className="grid size-11 place-items-center rounded-full bg-[var(--app-ink)]/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                        aria-label="Tutup scanner barcode"
                    >
                        <X className="size-5" />
                    </button>
                    <div className="min-w-0 rounded-xl bg-[var(--app-ink)]/80 px-4 py-2 text-center backdrop-blur-sm">
                        <p className="truncate text-sm font-black">{title}</p>
                        <p className="text-[11px] text-[var(--app-soft-strong)]">
                            Barcode atau QR akan terbaca otomatis
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void toggleTorch()}
                        disabled={!torchAvailable}
                        className="grid size-11 place-items-center rounded-full bg-[var(--app-ink)]/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-35"
                        aria-label={
                            torchOn ? 'Matikan lampu' : 'Nyalakan lampu'
                        }
                    >
                        {torchOn ? (
                            <Zap className="size-5" />
                        ) : (
                            <ZapOff className="size-5" />
                        )}
                    </button>
                </header>

                <div className="relative z-10 flex h-[calc(100svh-7rem)] items-center justify-center px-5 pb-24">
                    {cameraError ? (
                        <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center text-[var(--app-ink)] shadow-[0_20px_60px_-24px_rgba(0,0,0,.8)]">
                            <Camera className="mx-auto size-8 text-[#c75d32]" />
                            <p className="mt-3 font-black">
                                Scanner belum tersedia
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                                {cameraError}
                            </p>
                            <button
                                type="button"
                                onClick={retry}
                                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] font-bold"
                            >
                                <RefreshCw className="size-4" /> Coba lagi
                            </button>
                            {scanError && (
                                <p
                                    role="alert"
                                    className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                                >
                                    {scanError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-xl">
                            <div className="relative mx-auto aspect-[2.25/1] w-full overflow-hidden rounded-2xl border border-white/80 shadow-[0_24px_70px_-28px_rgba(0,0,0,.9)]">
                                <span className="absolute top-1/2 right-5 left-5 h-px bg-[#f3a15e] shadow-[0_0_16px_2px_rgba(243,161,94,.7)] motion-safe:animate-pulse" />
                            </div>
                            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-[var(--app-soft-strong)]">
                                <ScanBarcode className="size-5 text-[#f3a15e]" />
                                {detectorAvailable
                                    ? 'Arahkan kode ke dalam bingkai'
                                    : 'Arahkan kode, lalu baca dari foto'}
                            </div>
                            {scanError && (
                                <p
                                    role="alert"
                                    className="mx-auto mt-3 max-w-sm rounded-lg bg-red-950/70 px-3 py-2 text-center text-xs font-bold text-red-100"
                                >
                                    {scanError}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="absolute right-0 bottom-0 left-0 z-20 flex justify-center px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                            void readImage(event.target.files?.[0] ?? null);
                            event.target.value = '';
                        }}
                    />
                    <div className="grid w-full max-w-sm grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={processingPhoto}
                            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/40 bg-[var(--app-primary)]/90 px-3 text-sm font-black text-[var(--app-primary-foreground)] disabled:opacity-45"
                        >
                            <ImageUp className="size-4" />
                            Pilih foto
                        </button>
                        <button
                            type="button"
                            onClick={() => void readFromCamera()}
                            disabled={!ready || processingPhoto}
                            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-black text-[var(--app-ink)] shadow-[0_16px_40px_-18px_rgba(0,0,0,.8)] disabled:opacity-45"
                        >
                            {processingPhoto ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                                <Camera className="size-4" />
                            )}
                            {processingPhoto ? 'Membaca kode...' : 'Ambil foto'}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
