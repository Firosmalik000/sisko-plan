import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { SubscriptionLimitContactDialog } from '@/components/subscription-limit-contact-dialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { translate } from '@/lib/i18n';
import { barcodeStatusResetDelay } from './barcode-scanner-feedback';
import type { AutoCaptureStatus, BarcodeScanStatus } from './barcode-scanner-feedback';
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
    const aiPhotoAvailable = config.visual_recognition_enabled && config.ai_scan_available;
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
    const [autoCaptureStatus, setAutoCaptureStatus] = useState<AutoCaptureStatus>('idle');
    const [autoCaptureProgress, setAutoCaptureProgress] = useState(0);
    const [retakeCaptureId, setRetakeCaptureId] = useState<string | null>(null);

    const [scanMode, setScanMode] = useState<ScanMode>('photo');
    const [barcodeError, setBarcodeError] = useState('');
    const [barcodeLimitReached, setBarcodeLimitReached] = useState(false);
    const [scanLimitOpen, setScanLimitOpen] = useState(false);
    const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'reading' | 'success' | 'not_found'>('idle');
    const barcodeBusyRef = useRef(false);
    const captureBusyRef = useRef(false);
    useEffect(() => {
        if (!open || purpose === 'product' || aiPhotoAvailable) {
            return;
        }

        queueMicrotask(() => {
            setAutoActive(false);
            setScanMode('barcode');
        });
    }, [aiPhotoAvailable, open, purpose]);
    useEffect(() => {
        if (purpose === 'product' || !scanner.captures.some((capture) => capture.errorCode === 'SCAN_LIMIT_REACHED')) {
            return;
        }

        queueMicrotask(() => {
            setAutoActive(false);
            setScanMode('barcode');
        });
    }, [purpose, scanner.captures]);
    useEffect(() => {
        const resetDelay = barcodeStatusResetDelay(barcodeStatus);

        if (resetDelay === null || barcodeTarget || barcodeError) {
            return;
        }

        const timer = window.setTimeout(() => setBarcodeStatus('scanning'), resetDelay);

        return () => window.clearTimeout(timer);
    }, [barcodeError, barcodeStatus, barcodeTarget]);
    const handleBarcode = useCallback(
        (value: string) => {
            if (barcodeBusyRef.current) {
                return false;
            }

            barcodeBusyRef.current = true;
            playScannerSuccessTone();
            setBarcodeError('');
            setBarcodeStatus('reading');

            if (purpose === 'product' && onBarcodeDetected) {
                void consumeBarcode()
                    .then(() => {
                        onBarcodeDetected(value);
                        setBarcodeStatus('success');
                        scanner.reset();
                        setCameraCaptureStart(0);
                        onOpenChange(false);
                    })
                    .catch((error: unknown) => {
                        setBarcodeStatus('not_found');
                        setBarcodeLimitReached(scannerErrorCode(error) === 'SCAN_LIMIT_REACHED');
                        setBarcodeError(error instanceof Error ? error.message : 'Pencatatan scan gagal. Coba lagi.');
                    })
                    .finally(() => {
                        barcodeBusyRef.current = false;
                    });

                return;
            }

            void lookupBarcode(value)
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
                        scanner.setReviewing(true);
                    }
                })
                .catch((error: unknown) => {
                    setBarcodeStatus('not_found');
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

            setAutoCaptureProgress(100);
            setAutoCaptureStatus('captured');
            window.setTimeout(() => {
                setAutoCaptureStatus(autoActive ? 'processing' : 'idle');

                if (!autoActive) {
                    setAutoCaptureProgress(0);
                }
            }, 500);

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
    }, [
        autoActive,
        camera,
        handleBarcode,
        onProductCapture,
        productCanCapture,
        purpose,
        retakeCaptureId,
        scanMode,
        scanner,
        singleCapture,
    ]);

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

            const moved = !previous || difference(previous) > 12;
            previous = pixels;

            if (moved) {
                stableSince = Date.now();
                setAutoCaptureStatus('positioning');
                setAutoCaptureProgress(0);

                return;
            }

            if (captured && difference(captured) < 30) {
                if (!captureBusyRef.current) {
                    setAutoCaptureStatus('processing');
                }

                return;
            }

            const stableFor = Date.now() - stableSince;

            if (stableFor < 1500 || captureBusyRef.current) {
                if (!captureBusyRef.current) {
                    setAutoCaptureStatus('stabilizing');
                    setAutoCaptureProgress(Math.min(100, Math.round((stableFor / 1500) * 100)));
                }

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
        setScanMode(purpose !== 'product' && !aiPhotoAvailable ? 'barcode' : 'photo');
        setBarcodeError('');
        setBarcodeStatus('scanning');
        barcodeBusyRef.current = false;
        onOpenChange(false);
    };
    const complete = () => {
        scanner.reset();
        dismiss();
    };
    const openScanLimitContact = () => {
        dismiss();
        setScanLimitOpen(true);
    };

    const startScanningAgain = () => {
        setRetakeCaptureId(null);
        setBarcodeError('');
        setBarcodeStatus('scanning');
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
        <>
            <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
                <DialogContent
                    aria-describedby={undefined}
                    className="!inset-0 z-[70] block !h-[100dvh] !w-auto !max-w-none !translate-x-0 !translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-[var(--app-ink)] p-0 shadow-none duration-300 [&>button]:hidden"
                >
                    <DialogTitle className="sr-only">{title}</DialogTitle>
                    {scanner.reviewing ? (
                        <ScanReview
                            captures={scanner.captures}
                            selections={scanner.selections}
                            purpose={purpose}
                            onBack={startScanningAgain}
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
                            onScanLimitContact={openScanLimitContact}
                            onConfirm={(selections) => {
                                onConfirm(selections);
                                complete();
                            }}
                        />
                    ) : (
                        <CameraViewport
                            videoRef={camera.videoRef}
                            captures={cameraCaptures}
                            ready={camera.ready}
                            error={camera.error}
                            autoPaused={autoPaused}
                            torchAvailable={camera.torchAvailable}
                            torchOn={camera.torchOn}
                            onClose={closeCamera}
                            onCapture={() => void takePhoto()}
                            onGallery={gallery}
                            onRemove={cancelCameraCapture}
                            onFinish={() => {
                                setRetakeCaptureId(null);

                                if (purpose === 'product' && onProductCaptures) {
                                    const captures = scanner.captures
                                        .filter((capture) => capture.blob.size > 0)
                                        .slice(singleCapture ? -1 : 0);
                                    onProductCaptures(
                                        captures.map(
                                            (capture, index) => new File([capture.blob], `produk-${index + 1}.jpg`, { type: 'image/jpeg' }),
                                        ),
                                    );
                                    complete();

                                    return;
                                }

                                scanner.setReviewing(true);
                            }}
                            onToggleAuto={() => setAutoPaused((value) => !value)}
                            scanMode={scanMode}
                            barcodeError={barcodeError}
                            barcodeLimitReached={barcodeLimitReached}
                            barcodeStatus={barcodeStatus}
                            photoStatus={photoStatus}
                            photoError={latestCameraCapture?.error ?? ''}
                            onToggleScanMode={() => {
                                setBarcodeError('');
                                setBarcodeLimitReached(false);
                                setBarcodeStatus('idle');
                                barcodeBusyRef.current = false;
                                stableRef.current.pixels = new Uint8ClampedArray();
                                stableRef.current.lastMotionAt = Date.now();
                                stableRef.current.armed = true;
                                stableRef.current.motionFrames = 0;
                                setScanMode((mode) => {
                                    const nextMode = mode === 'photo' ? 'barcode' : 'photo';
                                    setAutoPaused(nextMode === 'barcode' || !config.auto_capture_enabled);

                                    return nextMode;
                                });
                            }}
                            onToggleTorch={() => void camera.toggleTorch()}
                            onRetry={camera.retry}
                            onManualSearch={scanner.captures.length === 0 ? onManualSearch : undefined}
                            manualActionLabel={manualActionLabel ?? (purpose === 'product' ? 'Isi tanpa foto' : 'Cari manual')}
                            onScanLimitContact={openScanLimitContact}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <SubscriptionLimitContactDialog kind="scan" open={scanLimitOpen} onOpenChange={setScanLimitOpen} />
        </>
    );
}
