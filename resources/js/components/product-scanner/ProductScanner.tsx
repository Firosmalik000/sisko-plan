import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CameraViewport } from './CameraViewport';
import { decodeBarcodeImage } from './decode-barcode-image';
import { ScanReview } from './ScanReview';
import type {
    ScannerConfig,
    ScannerProductCandidate,
    ScannerPurpose,
    ScannerSelection,
} from './types';
import { useCamera } from './use-camera';
import { useProductScanner } from './use-product-scanner';

type ProductScannerProps = {
    purpose: ScannerPurpose;
    title: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (selections: ScannerSelection[]) => void;
    onManualSearch?: () => void;
    manualProducts?: ScannerProductCandidate[];
    onProductCaptures?: (photos: File[]) => void;
    onBarcodeDetected?: (value: string) => void;
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
    onManualSearch,
    manualProducts = [],
    onProductCaptures,
    onBarcodeDetected,
    manualActionLabel,
    singleCapture = false,
}: ProductScannerProps) {
    const { scanner: config } = usePage<{ scanner: ScannerConfig }>().props;
    const scanner = useProductScanner(open, purpose, config);
    const lookupBarcode = scanner.lookupBarcode;
    const [autoPaused, setAutoPaused] = useState(!config.auto_capture_enabled);
    const [retakeCaptureId, setRetakeCaptureId] = useState<string | null>(null);
    const [cameraCaptureStart, setCameraCaptureStart] = useState(0);
    const [scanMode, setScanMode] = useState<ScanMode>('photo');
    const [barcodeError, setBarcodeError] = useState('');
    const [barcodeStatus, setBarcodeStatus] = useState<
        'idle' | 'reading' | 'success' | 'not_found'
    >('idle');
    const barcodeBusyRef = useRef(false);
    const captureBusyRef = useRef(false);
    const stableRef = useRef({
        pixels: new Uint8ClampedArray(),
        lastMotionAt: 0,
        armed: true,
        motionFrames: 0,
    });
    const handleBarcode = useCallback(
        (value: string) => {
            if (barcodeBusyRef.current) {
                return;
            }

            barcodeBusyRef.current = true;
            setBarcodeError('');
            setBarcodeStatus('reading');

            if (purpose === 'product' && onBarcodeDetected) {
                onBarcodeDetected(value);
                setBarcodeStatus('success');
                scanner.reset();
                setCameraCaptureStart(0);
                barcodeBusyRef.current = false;
                onOpenChange(false);

                return;
            }

            void lookupBarcode(value)
                .then((found) => {
                    setBarcodeStatus(found ? 'success' : 'not_found');

                    if (found) {
                        scanner.setReviewing(true);
                    }
                })
                .catch(() => {
                    setBarcodeStatus('not_found');
                    setBarcodeError('Pencarian barcode gagal. Coba lagi.');
                })
                .finally(() => {
                    window.setTimeout(() => {
                        barcodeBusyRef.current = false;
                    }, 1200);
                });
        },
        [lookupBarcode, onBarcodeDetected, onOpenChange, purpose, scanner],
    );
    const camera = useCamera(
        open && !scanner.reviewing,
        handleBarcode,
        scanMode === 'barcode',
    );

    const takePhoto = useCallback(
        async (fromAuto = false) => {
            if (captureBusyRef.current) {
                return;
            }

            captureBusyRef.current = true;

            try {
                const blob = await camera.capture(
                    scanMode === 'barcode' ? 1280 : 768,
                    scanMode === 'barcode' ? 0.82 : 0.66,
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
                        setBarcodeError(
                            'Barcode belum terbaca. Dekatkan dan ratakan kode.',
                        );

                        return;
                    }

                    handleBarcode(barcode);

                    return;
                }

                if (purpose === 'product' && onProductCaptures) {
                    onProductCaptures([
                        new File([blob], 'produk-1.jpg', {
                            type: 'image/jpeg',
                        }),
                    ]);
                    scanner.reset();
                    setCameraCaptureStart(0);
                    onOpenChange(false);

                    return;
                }

                if (fromAuto) {
                    setAutoPaused(true);
                }

                if (retakeCaptureId) {
                    await scanner.replaceBlob(retakeCaptureId, blob, false);
                    setRetakeCaptureId(null);
                    scanner.setReviewing(true);

                    return;
                }

                const existingCapture = singleCapture
                    ? scanner.captures[0]
                    : null;

                if (existingCapture) {
                    await scanner.replaceBlob(existingCapture.id, blob, false);
                } else {
                    await scanner.addBlobs([blob], false);
                }

                // Move to the review drawer immediately; recognition continues
                // there and exposes its loading state instead of holding the
                // camera open while the service responds.
                scanner.setReviewing(true);
            } finally {
                captureBusyRef.current = false;
            }
        },
        [
            camera,
            handleBarcode,
            onOpenChange,
            onProductCaptures,
            purpose,
            retakeCaptureId,
            scanMode,
            scanner,
            singleCapture,
        ],
    );

    useEffect(() => {
        if (
            !open ||
            scanMode === 'barcode' ||
            autoPaused ||
            scanner.reviewing ||
            !camera.ready
        ) {
            return;
        }

        const timer = window.setInterval(() => {
            const video = camera.videoRef.current;

            if (!video || video.readyState < 2) {
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 36;
            const context = canvas.getContext('2d', {
                willReadFrequently: true,
            });

            if (!context) {
                return;
            }

            context.drawImage(video, 0, 0, 48, 36);
            const pixels = context.getImageData(0, 0, 48, 36).data;
            let brightness = 0;
            let delta = 0;

            for (let index = 0; index < pixels.length; index += 16) {
                const luminance =
                    (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
                brightness += luminance;

                if (stableRef.current.pixels.length === pixels.length) {
                    delta += Math.abs(
                        luminance - stableRef.current.pixels[index],
                    );
                }
            }

            const samples = pixels.length / 16;
            brightness /= samples;
            delta = stableRef.current.pixels.length ? delta / samples : 999;
            stableRef.current.pixels = pixels;
            const now = Date.now();
            const acceptableBrightness = brightness > 15 && brightness < 250;

            // Camera sensors naturally fluctuate by a few luminance points.
            // Only a meaningful scene change should restart the debounce.
            if (delta > 45) {
                stableRef.current.motionFrames += 1;

                if (stableRef.current.armed) {
                    stableRef.current.lastMotionAt = now;
                } else if (stableRef.current.motionFrames >= 3) {
                    stableRef.current.armed = true;
                    stableRef.current.lastMotionAt = now;
                    stableRef.current.motionFrames = 0;
                }
            } else if (stableRef.current.motionFrames > 0) {
                stableRef.current.motionFrames = 0;
            }

            if (
                acceptableBrightness &&
                stableRef.current.armed &&
                stableRef.current.lastMotionAt > 0 &&
                now - stableRef.current.lastMotionAt >= 1500 &&
                !captureBusyRef.current
            ) {
                stableRef.current.armed = false;
                stableRef.current.motionFrames = 0;
                void takePhoto(true);
            }
        }, 250);

        return () => window.clearInterval(timer);
    }, [
        autoPaused,
        camera.ready,
        camera.videoRef,
        open,
        scanner.reviewing,
        scanMode,
        takePhoto,
    ]);

    useEffect(() => {
        if (!open || scanner.reviewing || !camera.ready) {
            return;
        }

        stableRef.current.pixels = new Uint8ClampedArray();
        stableRef.current.lastMotionAt = Date.now();
        stableRef.current.armed = true;
        stableRef.current.motionFrames = 0;
    }, [camera.ready, open, scanMode, scanner.reviewing]);

    useEffect(() => {
        if (!open || scanner.reviewing || purpose === 'product') {
            return;
        }

        const latestCapture = scanner.captures.slice(cameraCaptureStart).at(-1);
        const completed =
            latestCapture?.status === 'recognized' ||
            latestCapture?.status === 'failed';

        if (completed) {
            scanner.setReviewing(true);
        }
    }, [
        cameraCaptureStart,
        open,
        purpose,
        scanner,
        scanner.captures,
        scanner.reviewing,
    ]);

    const dismiss = () => {
        setRetakeCaptureId(null);
        setCameraCaptureStart(0);
        setScanMode('photo');
        setBarcodeError('');
        setBarcodeStatus('idle');
        barcodeBusyRef.current = false;
        setAutoPaused(!config.auto_capture_enabled);
        onOpenChange(false);
    };
    const complete = () => {
        scanner.reset();
        dismiss();
    };

    const startScanningAgain = () => {
        setCameraCaptureStart(scanner.captures.length);
        setRetakeCaptureId(null);
        setBarcodeError('');
        setBarcodeStatus('idle');
        barcodeBusyRef.current = false;
        stableRef.current.pixels = new Uint8ClampedArray();
        stableRef.current.lastMotionAt = Date.now();
        stableRef.current.armed = true;
        stableRef.current.motionFrames = 0;
        setAutoPaused(false);
        scanner.setReviewing(false);
    };

    const closeCamera = () => {
        if (scanner.captures.length > 0) {
            setRetakeCaptureId(null);
            scanner.setReviewing(true);

            return;
        }

        dismiss();
    };

    const gallery = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []).filter(
            (file) =>
                file.type.startsWith('image/') && file.size <= 8 * 1024 * 1024,
        );
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
                        setBarcodeError(
                            'Barcode belum terbaca. Pilih foto yang menampilkan seluruh kode.',
                        );
                    }
                }
            })();

            return;
        }

        if (retakeCaptureId) {
            void scanner
                .replaceBlob(retakeCaptureId, files[0])
                .then(() => setRetakeCaptureId(null));

            return;
        }

        if (purpose === 'product' && onProductCaptures) {
            onProductCaptures(singleCapture ? files.slice(0, 1) : files);
            scanner.reset();
            setCameraCaptureStart(0);
            onOpenChange(false);

            return;
        }

        const existingCapture = singleCapture ? scanner.captures[0] : null;

        if (existingCapture) {
            void scanner.replaceBlob(existingCapture.id, files[0]);

            return;
        }

        void scanner.addBlobs(singleCapture ? files.slice(0, 1) : files);
    };

    const cameraCaptures = scanner.captures.slice(cameraCaptureStart);
    const latestCameraCapture = cameraCaptures.at(-1);
    const photoStatus =
        latestCameraCapture?.status === 'queued' ||
        latestCameraCapture?.status === 'recognizing'
            ? 'reading'
            : latestCameraCapture?.status === 'failed'
              ? 'failed'
              : latestCameraCapture?.status === 'recognized' &&
                  latestCameraCapture.results.some(
                      (result) => result.match !== null,
                  )
                ? 'success'
                : latestCameraCapture?.status === 'recognized'
                  ? 'not_found'
                  : 'idle';

    const cancelCameraCapture = (id: string) => {
        scanner.removeCapture(id);

        if (purpose === 'product') {
            return;
        }

        stableRef.current.pixels = new Uint8ClampedArray();
        stableRef.current.lastMotionAt = Date.now();
        stableRef.current.armed = true;
        stableRef.current.motionFrames = 0;
        setAutoPaused(false);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
            <DialogContent
                aria-describedby={undefined}
                className="inset-0 top-0 left-0 z-[70] block h-svh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-[var(--app-ink)] p-0 shadow-none duration-300 [&>button]:hidden"
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
                                        (capture, index) =>
                                            new File(
                                                [capture.blob],
                                                `produk-${index + 1}.jpg`,
                                                { type: 'image/jpeg' },
                                            ),
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
                        barcodeStatus={barcodeStatus}
                        photoStatus={photoStatus}
                        photoError={latestCameraCapture?.error ?? ''}
                        onToggleScanMode={() => {
                            setBarcodeError('');
                            setBarcodeStatus('idle');
                            barcodeBusyRef.current = false;
                            stableRef.current.pixels = new Uint8ClampedArray();
                            stableRef.current.lastMotionAt = Date.now();
                            stableRef.current.armed = true;
                            stableRef.current.motionFrames = 0;
                            setScanMode((mode) => {
                                const nextMode =
                                    mode === 'photo' ? 'barcode' : 'photo';
                                setAutoPaused(
                                    nextMode === 'barcode' ||
                                        !config.auto_capture_enabled,
                                );

                                return nextMode;
                            });
                        }}
                        onToggleTorch={() => void camera.toggleTorch()}
                        onRetry={camera.retry}
                        onManualSearch={
                            scanner.captures.length === 0
                                ? onManualSearch
                                : undefined
                        }
                        manualActionLabel={
                            manualActionLabel ??
                            (purpose === 'product'
                                ? 'Isi tanpa foto'
                                : 'Cari manual')
                        }
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
