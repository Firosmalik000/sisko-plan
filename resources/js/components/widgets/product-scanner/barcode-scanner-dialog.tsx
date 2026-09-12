import { AlertCircle, Camera, Check, ImageUp, LoaderCircle, RefreshCw, ScanBarcode, X, Zap, ZapOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { barcodeScannerFeedback } from '@/components/widgets/product-scanner/barcode-scanner-feedback';
import type { BarcodeScanStatus } from '@/components/widgets/product-scanner/barcode-scanner-feedback';
import { decodeBarcodeImage } from '@/components/widgets/product-scanner/decode-barcode-image';
import { playScannerSuccessTone, prepareScannerTone } from '@/components/widgets/product-scanner/scanner-feedback';
import { useCamera } from '@/components/widgets/product-scanner/use-camera';
import { translate } from '@/lib/i18n';

type BarcodeScannerDialogProps = {
    open: boolean;
    title: string;
    onOpenChange: (open: boolean) => void;
    onDetected: (value: string) => void | Promise<void>;
};

export default function BarcodeScannerDialog({ open, title, onOpenChange, onDetected }: BarcodeScannerDialogProps) {
    const handledRef = useRef(false);
    const activeRef = useRef(open);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [processingPhoto, setProcessingPhoto] = useState(false);
    const [scanError, setScanError] = useState('');
    const [barcodeStatus, setBarcodeStatus] = useState<BarcodeScanStatus>('scanning');
    const handleDetected = useCallback(
        (value: string) => {
            const normalized = value.trim();

            if (!normalized || handledRef.current || !activeRef.current) {
                return;
            }

            prepareScannerTone();
            handledRef.current = true;
            setBarcodeStatus('reading');
            void Promise.resolve()
                .then(() => onDetected(normalized))
                .then(() => {
                    if (activeRef.current) {
                        playScannerSuccessTone();
                        setBarcodeStatus('success');
                        navigator.vibrate?.(45);
                        window.setTimeout(() => {
                            if (activeRef.current) {
                                onOpenChange(false);
                            }
                        }, 450);
                    }
                })
                .catch((error: unknown) => {
                    setScanError(error instanceof Error ? error.message : 'Kode belum terbaca. Coba lagi.');
                    setBarcodeStatus('not_found');
                    handledRef.current = false;
                });
        },
        [onDetected, onOpenChange],
    );
    const { videoRef, error: cameraError, torchAvailable, torchOn, toggleTorch, retry } = useCamera(open, handleDetected);

    useEffect(() => {
        activeRef.current = open;

        if (open) {
            handledRef.current = false;
        }

        return () => {
            activeRef.current = false;
        };
    }, [open]);

    const changeOpen = (nextOpen: boolean) => {
        if (!nextOpen) {
            activeRef.current = false;
            setProcessingPhoto(false);
            setScanError('');
            setBarcodeStatus('scanning');
        }

        onOpenChange(nextOpen);
    };

    const readImage = async (image: Blob | null) => {
        if (!image || processingPhoto) {
            return;
        }

        setProcessingPhoto(true);
        setScanError('');
        setBarcodeStatus('reading');

        try {
            if (image.size > 20 * 1024 * 1024) {
                throw new Error('Foto tidak dapat diproses. Pilih JPG, PNG, atau WebP di bawah 20 MB.');
            }

            const barcode = await decodeBarcodeImage(image);

            if (!barcode) {
                throw new Error('Kode belum terbaca. Pastikan seluruh kode terlihat dan tidak buram.');
            }

            handleDetected(barcode);
        } catch (error) {
            setScanError(error instanceof Error ? error.message : 'Kode belum terbaca. Coba lagi.');
            setBarcodeStatus('not_found');
        } finally {
            setProcessingPhoto(false);
        }
    };

    const feedback = barcodeScannerFeedback(barcodeStatus);
    const frameTone =
        feedback.tone === 'success'
            ? 'border-[#8bd5a0] shadow-[0_0_0_1px_rgba(139,213,160,.35),0_24px_70px_-28px_rgba(0,0,0,.9)]'
            : feedback.tone === 'warning'
              ? 'border-[#f5bd67] shadow-[0_0_0_1px_rgba(245,189,103,.3),0_24px_70px_-28px_rgba(0,0,0,.9)]'
              : 'border-white/80 shadow-[0_24px_70px_-28px_rgba(0,0,0,.9)]';

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogContent className="!inset-0 !top-0 !left-0 z-[80] block h-[100dvh] w-screen !max-w-none !translate-x-0 !translate-y-0 overflow-hidden rounded-none border-0 bg-[#14201d] p-0 text-white shadow-none [&>button]:hidden">
                <DialogTitle className="sr-only">{translate(title)}</DialogTitle>
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="absolute inset-0 size-full object-cover"
                    aria-label={translate('Kamera pemindai barcode')}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,25,22,.86)_0%,rgba(5,25,22,.18)_32%,rgba(5,25,22,.18)_58%,rgba(5,25,22,.92)_100%)]" />

                <header className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top)+.75rem)] sm:px-6">
                    <button
                        type="button"
                        onClick={() => changeOpen(false)}
                        className="grid size-12 place-items-center rounded-full bg-[#14201d]/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                        aria-label={translate('Tutup scanner barcode')}
                    >
                        <X className="size-5" />
                    </button>
                    <div className="min-w-0 rounded-xl bg-[#14201d]/80 px-4 py-2 text-center backdrop-blur-sm">
                        <p className="truncate text-sm font-black">{translate(title)}</p>
                        <p className="text-[11px] text-[var(--app-soft-strong)]">{translate('Barcode atau QR akan terbaca otomatis')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void toggleTorch()}
                        disabled={!torchAvailable}
                        className="grid size-12 place-items-center rounded-full bg-[#14201d]/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-35"
                        aria-label={translate(torchOn ? 'Matikan lampu' : 'Nyalakan lampu')}
                    >
                        {torchOn ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
                    </button>
                </header>

                <div className="relative z-10 flex h-[calc(100svh-7rem)] items-center justify-center px-5 pb-24">
                    {cameraError ? (
                        <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center !text-[#14201d] shadow-[0_20px_60px_-24px_rgba(0,0,0,.8)]">
                            <Camera className="mx-auto size-8 text-[#c75d32]" />
                            <p className="mt-3 font-black">{translate('Scanner belum tersedia')}</p>
                            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{translate(cameraError)}</p>
                            <button
                                type="button"
                                onClick={() => {
                                    setBarcodeStatus('scanning');
                                    setScanError('');
                                    retry();
                                }}
                                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] font-bold"
                            >
                                <RefreshCw className="size-4" /> {translate('Coba lagi')}
                            </button>
                            {scanError && (
                                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                    {translate(scanError)}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-xl">
                            <div
                                className={`relative mx-auto aspect-[2.25/1] w-full overflow-hidden rounded-2xl border transition-colors ${frameTone}`}
                            >
                                {barcodeStatus === 'scanning' && (
                                    <span className="absolute top-1/2 right-5 left-5 h-px bg-[#f3a15e] shadow-[0_0_16px_2px_rgba(243,161,94,.7)] motion-safe:animate-pulse" />
                                )}
                                <div
                                    role="status"
                                    aria-live="polite"
                                    className={`absolute bottom-3 left-1/2 flex min-h-9 -translate-x-1/2 items-center gap-2 rounded-full px-3 text-xs font-black whitespace-nowrap shadow-[0_8px_24px_-12px_rgba(0,0,0,.8)] ${feedback.tone === 'success' ? 'bg-[#d6f4df] text-[#185b32]' : feedback.tone === 'warning' ? 'bg-[#fff0d9] text-[#87531a]' : 'bg-[#14201d]/85 text-white'}`}
                                >
                                    {barcodeStatus === 'success' ? (
                                        <Check className="size-4" />
                                    ) : barcodeStatus === 'not_found' ? (
                                        <AlertCircle className="size-4" />
                                    ) : barcodeStatus === 'reading' ? (
                                        <LoaderCircle className="size-4 animate-spin" />
                                    ) : (
                                        <ScanBarcode className="size-4 text-[#f3a15e]" />
                                    )}
                                    {translate(feedback.message)}
                                </div>
                            </div>
                            <p className="mt-5 text-center text-sm font-bold text-[var(--app-soft-strong)]">
                                {translate('Arahkan kode ke dalam bingkai')}
                            </p>
                            {scanError && (
                                <p
                                    role="alert"
                                    className="mx-auto mt-3 max-w-sm rounded-lg bg-red-950/70 px-3 py-2 text-center text-xs font-bold text-red-100"
                                >
                                    {translate(scanError)}
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
                    <div className="w-full max-w-sm">
                        <button
                            type="button"
                            onClick={() => {
                                prepareScannerTone();
                                fileInputRef.current?.click();
                            }}
                            disabled={processingPhoto}
                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-[var(--app-primary)]/90 px-3 text-sm font-black text-[var(--app-primary-foreground)] focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-70"
                        >
                            {processingPhoto ? <LoaderCircle className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
                            {translate(processingPhoto ? 'Membaca foto…' : 'Pilih foto barcode')}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
