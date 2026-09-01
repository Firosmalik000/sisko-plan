import { useCallback, useEffect, useRef, useState } from 'react';
import { decodeBarcodeImage } from './decode-barcode-image';

type BarcodeDetectorResult = { rawValue: string };
type BarcodeDetectorInstance = {
    detect(source: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
};
type BarcodeDetectorConstructor = new (options?: {
    formats?: string[];
}) => BarcodeDetectorInstance;

declare global {
    interface Window {
        BarcodeDetector?: BarcodeDetectorConstructor;
    }
}

const cameraConstraints: MediaStreamConstraints = {
    audio: false,
    video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
    },
};

export async function normalizeImage(source: Blob): Promise<Blob> {
    let image: CanvasImageSource;
    let width: number;
    let height: number;
    let release: () => void = () => undefined;

    if ('createImageBitmap' in window) {
        const bitmap = await createImageBitmap(source);
        image = bitmap;
        width = bitmap.width;
        height = bitmap.height;
        release = () => bitmap.close();
    } else {
        const url = URL.createObjectURL(source);
        const element = new Image();
        element.src = url;
        await element.decode();
        image = element;
        width = element.naturalWidth;
        height = element.naturalHeight;
        release = () => URL.revokeObjectURL(url);
    }

    const scale = Math.min(1, 1280 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    canvas
        .getContext('2d')
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    release();

    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('encode'))),
            'image/jpeg',
            0.82,
        ),
    );
}

export function useCamera(
    open: boolean,
    onBarcode: (value: string) => void,
    barcodeEnabled = true,
) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [torchAvailable, setTorchAvailable] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const agreementRef = useRef({ value: '', count: 0, lastSent: 0 });

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setReady(false);
        setTorchAvailable(false);
        setTorchOn(false);
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        let cancelled = false;
        const start = async () => {
            setError(null);

            if (!window.isSecureContext) {
                setError(
                    'Akses kamera memerlukan HTTPS. Buka halaman ini melalui alamat HTTPS.',
                );

                return;
            }

            if (!navigator.mediaDevices?.getUserMedia) {
                setError(
                    'Browser ini tidak menyediakan akses kamera. Gunakan browser terbaru atau pilih foto dari galeri.',
                );

                return;
            }

            try {
                const stream =
                    await navigator.mediaDevices.getUserMedia(
                        cameraConstraints,
                    );

                if (cancelled) {
                    stream.getTracks().forEach((track) => track.stop());

                    return;
                }

                streamRef.current = stream;
                const video = videoRef.current;

                if (video) {
                    video.srcObject = stream;
                    await video.play();
                }

                const capabilities = stream
                    .getVideoTracks()[0]
                    ?.getCapabilities() as
                    (MediaTrackCapabilities & { torch?: boolean }) | undefined;
                setTorchAvailable(Boolean(capabilities?.torch));
                setReady(true);
                setError(null);
            } catch (reason: unknown) {
                if (cancelled) {
                    return;
                }

                stop();
                setError(cameraErrorMessage(reason));
            }
        };

        void start();

        return () => {
            cancelled = true;
            stop();
        };
    }, [open, retryCount, stop]);

    useEffect(() => {
        if (!open || !ready || !barcodeEnabled) {
            return;
        }

        let cancelled = false;
        let detectionBusy = false;
        const detector = window.BarcodeDetector
            ? new window.BarcodeDetector()
            : null;

        if (!detector) {
            // Older browsers do not expose BarcodeDetector. The frame decoder
            // keeps barcode mode useful without changing the default photo mode.
        }

        const timer = window.setInterval(
            async () => {
                const video = videoRef.current;

                if (
                    !video ||
                    video.readyState < 2 ||
                    cancelled ||
                    detectionBusy
                ) {
                    return;
                }

                detectionBusy = true;
                let value = '';

                try {
                    value = detector
                        ? ((await detector.detect(video))[0]?.rawValue ?? '')
                        : await decodeBarcodeImage(
                              await captureVideoFrame(video),
                          );
                } catch {
                    value = '';
                } finally {
                    detectionBusy = false;
                }

                if (!value) {
                    return;
                }

                const agreement = agreementRef.current;
                agreement.count =
                    agreement.value === value ? agreement.count + 1 : 1;
                agreement.value = value;

                if (
                    agreement.count >= 2 &&
                    Date.now() - agreement.lastSent > 1800
                ) {
                    agreement.lastSent = Date.now();
                    onBarcode(value);
                }
            },
            detector ? 260 : 900,
        );

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [barcodeEnabled, open, ready, onBarcode]);

    const capture = useCallback(
        async (maxDimension = 1280, quality = 0.82): Promise<Blob | null> => {
            const video = videoRef.current;

            if (!video || video.readyState < 2) {
                return null;
            }

            const canvas = document.createElement('canvas');
            const scale = Math.min(
                1,
                maxDimension / Math.max(video.videoWidth, video.videoHeight),
            );
            canvas.width = Math.round(video.videoWidth * scale);
            canvas.height = Math.round(video.videoHeight * scale);
            canvas
                .getContext('2d')
                ?.drawImage(video, 0, 0, canvas.width, canvas.height);

            return new Promise((resolve) =>
                canvas.toBlob(resolve, 'image/jpeg', quality),
            );
        },
        [],
    );

    const toggleTorch = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];

        if (!track || !torchAvailable) {
            return;
        }

        const next = !torchOn;
        await track.applyConstraints({
            advanced: [{ torch: next } as MediaTrackConstraintSet],
        });
        setTorchOn(next);
    }, [torchAvailable, torchOn]);

    const retry = useCallback(() => {
        stop();
        setError(null);
        setRetryCount((count) => count + 1);
    }, [stop]);

    return {
        videoRef,
        ready,
        error,
        capture,
        torchAvailable,
        torchOn,
        toggleTorch,
        retry,
    };
}

async function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const scale = Math.min(
        1,
        1280 / Math.max(video.videoWidth, video.videoHeight),
    );
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas
        .getContext('2d')
        ?.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) =>
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('capture'))),
            'image/jpeg',
            0.82,
        ),
    );
}

function cameraErrorMessage(reason: unknown): string {
    const name = reason instanceof DOMException ? reason.name : '';

    if (name === 'NotAllowedError' || name === 'SecurityError') {
        return 'Izin kamera ditolak. Izinkan kamera di pengaturan situs, lalu coba lagi.';
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        return 'Kamera tidak ditemukan pada perangkat ini. Pilih foto dari galeri untuk melanjutkan.';
    }

    if (
        name === 'NotReadableError' ||
        name === 'TrackStartError' ||
        name === 'AbortError'
    ) {
        return 'Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut, lalu coba lagi.';
    }

    return 'Kamera tidak dapat dibuka. Periksa izin kamera, lalu coba lagi atau pilih foto dari galeri.';
}
