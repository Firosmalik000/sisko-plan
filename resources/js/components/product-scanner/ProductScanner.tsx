import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CameraViewport } from './CameraViewport';
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
    manualActionLabel?: string;
    singleCapture?: boolean;
};

export default function ProductScanner({
    purpose,
    title,
    open,
    onOpenChange,
    onConfirm,
    onManualSearch,
    manualProducts = [],
    onProductCaptures,
    manualActionLabel,
    singleCapture = false,
}: ProductScannerProps) {
    const { scanner: config } = usePage<{ scanner: ScannerConfig }>().props;
    const scanner = useProductScanner(open, purpose, config);
    const [autoPaused, setAutoPaused] = useState(
        singleCapture || !config.auto_capture_enabled,
    );
    const [retakeCaptureId, setRetakeCaptureId] = useState<string | null>(null);
    const [cameraCaptureStart, setCameraCaptureStart] = useState(0);
    const stableRef = useRef({
        pixels: new Uint8ClampedArray(),
        count: 0,
        lastCapture: 0,
        fingerprint: '',
    });
    const camera = useCamera(open, scanner.lookupBarcode);

    const takePhoto = useCallback(async () => {
        const blob = await camera.capture();

        if (!blob) {
            return;
        }

        navigator.vibrate?.(30);

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
    }, [camera, retakeCaptureId, scanner, singleCapture]);

    useEffect(() => {
        if (!open || autoPaused || scanner.reviewing || !camera.ready) {
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
            let sharpness = 0;
            let delta = 0;

            for (let index = 0; index < pixels.length; index += 16) {
                const luminance =
                    (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
                brightness += luminance;

                if (index >= 16) {
                    sharpness += Math.abs(luminance - pixels[index - 16]);
                }

                if (stableRef.current.pixels.length === pixels.length) {
                    delta += Math.abs(
                        luminance - stableRef.current.pixels[index],
                    );
                }
            }

            const samples = pixels.length / 16;
            brightness /= samples;
            sharpness /= samples;
            delta = stableRef.current.pixels.length ? delta / samples : 999;
            stableRef.current.pixels = pixels;
            const acceptable =
                brightness > 45 &&
                brightness < 220 &&
                sharpness > 8 &&
                delta < 9;
            stableRef.current.count = acceptable
                ? stableRef.current.count + 1
                : 0;
            const fingerprint = `${Math.round(brightness / 8)}:${Math.round(sharpness / 5)}`;

            if (
                stableRef.current.count >= 4 &&
                Date.now() - stableRef.current.lastCapture > 2800 &&
                fingerprint !== stableRef.current.fingerprint
            ) {
                stableRef.current.lastCapture = Date.now();
                stableRef.current.fingerprint = fingerprint;
                stableRef.current.count = 0;
                void takePhoto();
            }
        }, 350);

        return () => window.clearInterval(timer);
    }, [
        autoPaused,
        camera.ready,
        camera.videoRef,
        open,
        scanner.reviewing,
        takePhoto,
    ]);

    const close = () => {
        setRetakeCaptureId(null);
        setCameraCaptureStart(0);
        scanner.reset();
        onOpenChange(false);
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

        if (retakeCaptureId) {
            void scanner.replaceBlob(retakeCaptureId, files[0]).then(() => {
                setRetakeCaptureId(null);
                scanner.setReviewing(true);
            });

            return;
        }

        const existingCapture = singleCapture ? scanner.captures[0] : null;

        if (existingCapture) {
            void scanner.replaceBlob(existingCapture.id, files[0]);

            return;
        }

        void scanner.addBlobs(singleCapture ? files.slice(0, 1) : files);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && close()}>
            <DialogContent
                aria-describedby={undefined}
                className="inset-0 top-0 left-0 z-[70] block h-svh w-screen max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-none border-0 bg-[#102a25] p-0 shadow-none duration-300 [&>button]:hidden"
            >
                <DialogTitle className="sr-only">{title}</DialogTitle>
                {scanner.reviewing ? (
                    <ScanReview
                        captures={scanner.captures}
                        selections={scanner.selections}
                        purpose={purpose}
                        onBack={() => scanner.setReviewing(false)}
                        onScanAgain={() => {
                            setCameraCaptureStart(scanner.captures.length);
                            setRetakeCaptureId(null);
                            scanner.setReviewing(false);
                            camera.retry();
                        }}
                        onRemove={scanner.removeCapture}
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
                            close();
                        }}
                    />
                ) : (
                    <CameraViewport
                        videoRef={camera.videoRef}
                        captures={scanner.captures.slice(cameraCaptureStart)}
                        ready={camera.ready}
                        error={camera.error}
                        autoPaused={autoPaused}
                        torchAvailable={camera.torchAvailable}
                        torchOn={camera.torchOn}
                        onClose={close}
                        onCapture={() => void takePhoto()}
                        onGallery={gallery}
                        onRemove={scanner.removeCapture}
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
                                close();

                                return;
                            }

                            scanner.setReviewing(true);
                        }}
                        onToggleAuto={() => setAutoPaused((value) => !value)}
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
