import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { translate } from '@/lib/i18n';
import { CameraViewport } from './CameraViewport';
import { decodeBarcodeImage } from './decode-barcode-image';
import { playScannerSuccessTone } from './scanner-feedback';
import { ScanReview } from './ScanReview';
import type { ScannerApplyResult, ScannerConfig, ScannerProductCandidate, ScannerPurpose, ScannerSelection } from './types';
import { normalizeImage, useCamera } from './use-camera';
import { useProductScanner } from './use-product-scanner';

type ProductScannerProps = {
    purpose: ScannerPurpose;
    title: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm?: (selections: ScannerSelection[]) => ScannerApplyResult;
    onSessionChange?: (summary: { count: number; pending: number }) => void;
    initialView?: 'camera' | 'review';
    resetKey?: number;
    onManualSearch?: () => void;
    manualProducts?: ScannerProductCandidate[];
    onProductCapture?: (photo: File) => void | Promise<void>;
    onReviewProducts?: (id?: string) => void;
    productPhotos?: Array<{ id: string; previewUrl: string; status?: string }>;
    productPendingPhotos?: number;
    productDraftCount?: number;
    productCanCapture?: boolean;
    onRemoveProductPhoto?: (id: string) => void;
    manualActionLabel?: string;
    singleCapture?: boolean;
};

type ScanMode = 'photo' | 'barcode';

export default function ProductScanner({
    purpose,
    title,
    open,
    onOpenChange,
    onConfirm,
    onSessionChange,
    initialView = 'camera',
    resetKey = 0,
    onManualSearch,
    manualProducts = [],
    onProductCapture,
    onReviewProducts,
    productPhotos = [],
    productPendingPhotos = 0,
    productDraftCount = 0,
    productCanCapture = true,
    onRemoveProductPhoto,
    manualActionLabel,
    singleCapture = false,
}: ProductScannerProps) {
    const { scanner: config } = usePage<{ scanner: ScannerConfig }>().props;
    const scanner = useProductScanner(purpose, config);
    const [applyErrors, setApplyErrors] = useState<ScannerApplyResult['failures']>([]);
    const applyingRef = useRef(false);
    const [barcodeTarget, setBarcodeTarget] = useState<{ captureId: string; itemIndex: number } | null>(null);
    const wasOpen = useRef(false);
    const previousReset = useRef(resetKey);
    const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
    const [savingPhoto, setSavingPhoto] = useState(false);
    const attachPhotoPreview = useCallback(
        (node: HTMLImageElement | null) => {
            if (!node || !pendingPhoto) {
                return;
            }

            const url = URL.createObjectURL(pendingPhoto);
            node.src = url;

            return () => URL.revokeObjectURL(url);
        },
        [pendingPhoto],
    );

    if (!open && pendingPhoto) {
        setPendingPhoto(null);
    }

    useEffect(() => {
        if (open && !wasOpen.current) {
            scanner.setReviewing(initialView === 'review');
        }

        wasOpen.current = open;
    }, [open, initialView, scanner]);
    useEffect(() => {
        if (previousReset.current !== resetKey) {
            scanner.reset();
            setApplyErrors([]);
            previousReset.current = resetKey;
        }
    }, [resetKey, scanner]);
    useEffect(() => {
        onSessionChange?.({ count: scanner.captures.length, pending: scanner.pendingCount });
    }, [onSessionChange, scanner.captures.length, scanner.pendingCount]);
    useEffect(() => {
        if (!scanner.captures.length) {
            return;
        }

        const warn = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);

        return () => window.removeEventListener('beforeunload', warn);
    }, [scanner.captures.length]);
    const lookupBarcode = scanner.lookupBarcode;
    const [autoActive, setAutoActive] = useState(false);
    const [retakeCaptureId, setRetakeCaptureId] = useState<string | null>(null);

    const [scanMode, setScanMode] = useState<ScanMode>('photo');
    const [barcodeError, setBarcodeError] = useState('');
    const [barcodeLimitReached, setBarcodeLimitReached] = useState(false);
    const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'reading' | 'success' | 'not_found'>('idle');
    const barcodeBusyRef = useRef(false);
    const captureBusyRef = useRef(false);
    const handleBarcode = useCallback(
        (value: string) => {
            if (barcodeBusyRef.current) {
                return false;
            }

            barcodeBusyRef.current = true;
            setBarcodeError('');
            setBarcodeLimitReached(false);
            setBarcodeStatus('reading');

            void lookupBarcode(value, barcodeTarget?.captureId, barcodeTarget?.itemIndex)
                .then((found) => {
                    setBarcodeStatus(found ? 'success' : 'not_found');

                    if (typeof found === 'object' && onConfirm && !barcodeTarget && (purpose === 'sale' || purpose === 'purchase')) {
                        const outcome = onConfirm([found]);
                        outcome.applied.forEach((item) => scanner.removeResult(item.captureId, item.itemIndex));

                        if (outcome.failures.length) {
                            setApplyErrors(outcome.failures);
                            setBarcodeError(outcome.failures[0].message);
                        }
                    }

                    if (found) {
                        playScannerSuccessTone();

                        if (barcodeTarget) {
                            setBarcodeTarget(null);
                            scanner.setReviewing(true);
                        }
                    }
                })
                .catch((error: unknown) => {
                    setBarcodeStatus('not_found');
                    setBarcodeLimitReached(scannerErrorCode(error) === 'SCAN_LIMIT_REACHED');
                    setBarcodeError(error instanceof Error ? error.message : 'Pencarian barcode gagal. Coba lagi.');
                })
                .finally(() => {
                    window.setTimeout(() => {
                        barcodeBusyRef.current = false;
                    }, 1200);
                });

            return true;
        },
        [barcodeTarget, lookupBarcode, scanner, onConfirm, purpose],
    );
    const camera = useCamera(open && !scanner.reviewing && !pendingPhoto, handleBarcode, scanMode === 'barcode');

    const takePhoto = useCallback(async () => {
        if (
            captureBusyRef.current ||
            (scanMode === 'photo' && !retakeCaptureId && (purpose === 'product' ? !productCanCapture : scanner.pendingCount >= 10))
        ) {
            return;
        }

        captureBusyRef.current = true;

        try {
            const blob = await camera.capture(
                scanMode === 'barcode' || purpose === 'product' ? 1280 : 768,
                scanMode === 'barcode' || purpose === 'product' ? 0.82 : 0.66,
            );

            if (!blob) {
                return;
            }

            navigator.vibrate?.(30);

            if (scanMode === 'barcode') {
                setBarcodeError('');
                setBarcodeStatus('reading');
                const barcode = await decodeBarcodeImage(blob);

                if (!barcode) {
                    setBarcodeStatus('not_found');
                    setBarcodeError('Barcode belum terbaca. Dekatkan dan ratakan kode.');

                    return;
                }

                handleBarcode(barcode);

                return;
            }

            if (purpose === 'product' && onProductCapture) {
                const photo = new File([blob], 'produk.jpg', { type: 'image/jpeg' });

                if (singleCapture) {
                    setPendingPhoto(photo);
                } else {
                    await onProductCapture(photo);
                }

                return;
            }

            if (retakeCaptureId) {
                await scanner.replaceBlob(retakeCaptureId, blob, false);
                setRetakeCaptureId(null);
                scanner.setReviewing(true);

                return;
            }

            const existingCapture = singleCapture ? scanner.captures[0] : null;

            if (existingCapture) {
                await scanner.replaceBlob(existingCapture.id, blob, false);
            } else {
                await scanner.addBlobs([blob], false);
            }
        } catch (error) {
            setBarcodeError(error instanceof Error ? error.message : 'Foto gagal disiapkan. Coba lagi.');
        } finally {
            captureBusyRef.current = false;
        }
    }, [camera, handleBarcode, onProductCapture, productCanCapture, purpose, retakeCaptureId, scanMode, scanner, singleCapture]);

    const takePhotoRef = useRef(takePhoto);
    useEffect(() => {
        takePhotoRef.current = takePhoto;
    }, [takePhoto]);
    useEffect(() => {
        if (!open || !autoActive || scanner.reviewing || !camera.ready || scanMode !== 'photo') {
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 24;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let previous: Uint8ClampedArray | null = null;
        let captured: Uint8ClampedArray | null = null;
        let stableSince = Date.now();
        const timer = window.setInterval(() => {
            const video = camera.videoRef.current;

            if (!ctx || !video || video.readyState < 2 || document.hidden) {
                return;
            }

            ctx.drawImage(video, 0, 0, 32, 24);
            const pixels = ctx.getImageData(0, 0, 32, 24).data;
            const difference = (other: Uint8ClampedArray) => {
                let total = 0;

                for (let i = 0; i < pixels.length; i += 4) {
                    total += Math.abs(pixels[i] - other[i]);
                }

                return total / (pixels.length / 4);
            };

            if (!previous || difference(previous) > 12) {
                stableSince = Date.now();
            }

            previous = pixels;

            if (captured && difference(captured) < 30) {
                return;
            }

            if (Date.now() - stableSince < 1500 || captureBusyRef.current) {
                return;
            }

            captured = pixels;
            void takePhotoRef.current();
        }, 300);

        return () => window.clearInterval(timer);
    }, [autoActive, open, scanner.reviewing, camera.ready, camera.videoRef, scanMode]);

    const dismiss = () => {
        if (savingPhoto) {
            return;
        }

        setPendingPhoto(null);
        setRetakeCaptureId(null);
        setBarcodeTarget(null);
        setScanMode('photo');
        setBarcodeError('');
        setBarcodeLimitReached(false);
        setBarcodeStatus('idle');
        barcodeBusyRef.current = false;
        onOpenChange(false);
    };
    const complete = () => {
        scanner.reset();
        dismiss();
    };

    const startScanningAgain = () => {
        setRetakeCaptureId(null);
        setBarcodeError('');
        setBarcodeLimitReached(false);
        setBarcodeStatus('idle');
        barcodeBusyRef.current = false;
        scanner.setReviewing(false);
    };

    const closeCamera = dismiss;

    const gallery = (event: ChangeEvent<HTMLInputElement>) => {
        if (scanMode === 'photo' && (purpose === 'product' ? !productCanCapture : scanner.pendingCount >= 10)) {
            event.target.value = '';

            return;
        }

        const selectedFiles = Array.from(event.target.files ?? []);
        const files = selectedFiles.filter((file) => file.type.startsWith('image/') && file.size <= 20 * 1024 * 1024);

        if (files.length !== selectedFiles.length) {
            setBarcodeError('Foto tidak dapat diproses. Pilih JPG, PNG, atau WebP di bawah 20 MB.');
        }

        event.target.value = '';

        if (files.length === 0) {
            return;
        }

        if (scanMode === 'barcode') {
            setBarcodeError('');

            void (async () => {
                for (const file of files) {
                    const barcode = await decodeBarcodeImage(file);

                    if (barcode) {
                        handleBarcode(barcode);
                    } else {
                        setBarcodeError('Barcode belum terbaca. Pilih foto yang menampilkan seluruh kode.');
                    }
                }
            })().catch((error: unknown) => setBarcodeError(error instanceof Error ? error.message : 'Foto gagal disiapkan. Coba lagi.'));

            return;
        }

        if (retakeCaptureId) {
            void scanner
                .replaceBlob(retakeCaptureId, files[0])
                .then(() => setRetakeCaptureId(null))
                .catch((error: unknown) => setBarcodeError(error instanceof Error ? error.message : 'Foto gagal disiapkan. Coba lagi.'));

            return;
        }

        if (purpose === 'product' && onProductCapture) {
            void (async () => {
                for (const file of files.slice(0, singleCapture ? 1 : Math.max(0, 10 - productPendingPhotos))) {
                    const normalized = await normalizeImage(file, 1280, 0.82);
                    const photo = new File([normalized], 'produk.jpg', { type: 'image/jpeg' });

                    if (singleCapture) {
                        setPendingPhoto(photo);
                    } else {
                        await onProductCapture(photo);
                    }
                }
            })().catch((error: unknown) => setBarcodeError(error instanceof Error ? error.message : 'Foto gagal disiapkan. Coba lagi.'));

            return;
        }

        const existingCapture = singleCapture ? scanner.captures[0] : null;

        if (existingCapture) {
            void scanner.replaceBlob(existingCapture.id, files[0]);

            return;
        }

        void scanner
            .addBlobs(singleCapture ? files.slice(0, 1) : files)
            .catch((error: unknown) => setBarcodeError(error instanceof Error ? error.message : 'Foto gagal disiapkan. Coba lagi.'));
    };

    const cameraCaptures = scanner.captures;
    const latestCameraCapture = cameraCaptures.at(-1);
    const photoStatus =
        latestCameraCapture?.status === 'queued' || latestCameraCapture?.status === 'recognizing'
            ? 'reading'
            : latestCameraCapture?.status === 'failed'
              ? 'failed'
              : latestCameraCapture?.status === 'recognized' && latestCameraCapture.results.some((result) => result.match !== null)
                ? 'success'
                : latestCameraCapture?.status === 'recognized'
                  ? 'not_found'
                  : 'idle';

    const cancelCameraCapture = (id: string) => {
        scanner.removeCapture(id);

        if (purpose === 'product') {
            return;
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
            <DialogContent
                aria-describedby={undefined}
                className="!inset-0 z-[70] block !h-[100dvh] !w-auto !max-w-none !translate-x-0 !translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-[var(--app-ink)] p-0 shadow-none duration-300 [&>button]:hidden"
            >
                <DialogTitle className="sr-only">{title}</DialogTitle>
                {pendingPhoto ? (
                    <div className="flex h-full flex-col bg-black p-4 text-white">
                        <img ref={attachPhotoPreview} alt={title} className="min-h-0 flex-1 object-contain" />
                        {barcodeError && (
                            <p role="alert" className="py-2 text-center text-white">
                                {translate(barcodeError)}
                            </p>
                        )}
                        <div className="flex flex-wrap justify-center gap-3 pt-4 pb-[env(safe-area-inset-bottom)]">
                            <button
                                type="button"
                                disabled={savingPhoto}
                                onClick={dismiss}
                                className="min-h-11 rounded-xl border border-white px-5 text-white"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={savingPhoto}
                                onClick={() => {
                                    setPendingPhoto(null);
                                    setBarcodeError('');
                                }}
                                className="min-h-11 rounded-xl border border-white px-5 text-white"
                            >
                                Ulangi
                            </button>
                            <button
                                type="button"
                                disabled={savingPhoto}
                                className="min-h-11 rounded-xl bg-white px-5 font-semibold text-black disabled:opacity-60"
                                onClick={async () => {
                                    if (applyingRef.current) {
                                        return;
                                    }

                                    applyingRef.current = true;
                                    setSavingPhoto(true);
                                    setBarcodeError('');

                                    try {
                                        await onProductCapture?.(pendingPhoto);
                                        setPendingPhoto(null);
                                        onOpenChange(false);
                                    } catch {
                                        setBarcodeError('Foto gagal disiapkan. Coba lagi.');
                                    } finally {
                                        applyingRef.current = false;
                                        setSavingPhoto(false);
                                    }
                                }}
                            >
                                {savingPhoto ? 'Memproses foto…' : 'Gunakan foto'}
                            </button>
                        </div>
                    </div>
                ) : scanner.reviewing ? (
                    <ScanReview
                        captures={scanner.captures}
                        applyErrors={applyErrors}
                        onScanBarcode={(captureId, itemIndex) => {
                            setBarcodeTarget({ captureId, itemIndex });
                            setScanMode('barcode');
                            scanner.setReviewing(false);
                        }}
                        selections={scanner.selections}
                        purpose={purpose}
                        onBack={dismiss}
                        onScanAgain={startScanningAgain}
                        onRemove={scanner.removeCapture}
                        onRemoveResult={scanner.removeResult}
                        onRetry={scanner.retry}
                        onRetake={(captureId) => {
                            setRetakeCaptureId(captureId);
                            scanner.setReviewing(false);
                        }}
                        onSelectProduct={scanner.selectProductCandidate}
                        onSelectOption={scanner.selectSaleOption}
                        onClearProduct={scanner.clearProductSelection}
                        onSetSkipped={scanner.setResultSkipped}
                        onQuantityChange={scanner.setResultQuantity}
                        manualProducts={manualProducts}
                        onConfirm={(selections) => {
                            if (applyingRef.current) {
                                return;
                            }

                            applyingRef.current = true;

                            try {
                                const outcome = onConfirm?.(selections) ?? { applied: [], failures: [] };
                                setApplyErrors(outcome.failures);

                                if (!outcome.failures.length) {
                                    complete();
                                } else {
                                    outcome.applied.forEach((item) => scanner.removeResult(item.captureId, item.itemIndex));
                                }
                            } finally {
                                applyingRef.current = false;
                            }
                        }}
                    />
                ) : (
                    <CameraViewport
                        barcodeEnabled={purpose !== 'product'}
                        autoActive={autoActive}
                        onToggleAuto={() => setAutoActive((value) => !value)}
                        onReviewPhoto={(id) => {
                            onReviewProducts?.(id);
                            onOpenChange(false);
                        }}
                        videoRef={camera.videoRef}
                        captures={cameraCaptures}
                        canCapture={
                            scanMode === 'barcode' ||
                            !!retakeCaptureId ||
                            (purpose === 'product' ? productCanCapture : scanner.pendingCount < 10)
                        }
                        pendingCount={purpose === 'product' ? productPendingPhotos : scanner.pendingCount}
                        productPhotos={productPhotos}
                        productDraftCount={productDraftCount}
                        onRemoveProductPhoto={onRemoveProductPhoto}
                        ready={camera.ready}
                        error={camera.error}
                        torchAvailable={camera.torchAvailable}
                        torchOn={camera.torchOn}
                        onClose={closeCamera}
                        onCapture={() => void takePhoto()}
                        onGallery={gallery}
                        onRemove={cancelCameraCapture}
                        onFinish={() => {
                            setRetakeCaptureId(null);

                            if (purpose === 'product') {
                                onReviewProducts?.();
                                onOpenChange(false);

                                return;
                            }

                            scanner.setReviewing(true);
                        }}
                        scanMode={scanMode}
                        barcodeError={barcodeError}
                        barcodeLimitReached={barcodeLimitReached}
                        barcodeStatus={barcodeStatus}
                        photoStatus={photoStatus}
                        photoError={barcodeError || latestCameraCapture?.error || ''}
                        onToggleScanMode={() => {
                            setBarcodeError('');
                            setBarcodeLimitReached(false);
                            setBarcodeStatus('idle');
                            barcodeBusyRef.current = false;
                            setScanMode((mode) => {
                                const nextMode = mode === 'photo' ? 'barcode' : 'photo';

                                return nextMode;
                            });
                        }}
                        onToggleTorch={() => void camera.toggleTorch()}
                        onRetry={camera.retry}
                        onManualSearch={scanner.captures.length === 0 ? onManualSearch : undefined}
                        manualActionLabel={manualActionLabel ?? (purpose === 'product' ? 'Isi tanpa foto' : 'Cari manual')}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function scannerErrorCode(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return null;
    }

    return typeof error.code === 'string' ? error.code : null;
}
