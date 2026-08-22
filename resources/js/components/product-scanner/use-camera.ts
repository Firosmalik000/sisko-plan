import { useCallback, useEffect, useRef, useState } from 'react';

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

export function useCamera(open: boolean, onBarcode: (value: string) => void) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [torchAvailable, setTorchAvailable] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const agreementRef = useRef({ value: '', count: 0, lastSent: 0 });

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setReady(false);
        setTorchOn(false);
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        let cancelled = false;
        navigator.mediaDevices
            ?.getUserMedia(cameraConstraints)
            .then(async (stream) => {
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
            })
            .catch(() =>
                setError(
                    'Kamera tidak dapat dibuka. Izinkan akses kamera atau pilih foto dari galeri.',
                ),
            );

        return () => {
            cancelled = true;
            stop();
        };
    }, [open, stop]);

    useEffect(() => {
        if (!open || !ready) {
            return;
        }

        let cancelled = false;
        let detectionBusy = false;
        const detector = window.BarcodeDetector
            ? new window.BarcodeDetector({
                  formats: [
                      'ean_13',
                      'ean_8',
                      'code_128',
                      'code_39',
                      'upc_a',
                      'upc_e',
                  ],
              })
            : null;

        if (!detector) {
            return;
        }

        const timer = window.setInterval(async () => {
            const video = videoRef.current;

            if (!video || video.readyState < 2 || cancelled || detectionBusy) {
                return;
            }

            detectionBusy = true;
            let value = '';

            try {
                value = (await detector.detect(video))[0]?.rawValue ?? '';
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
        }, 260);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [open, ready, onBarcode]);

    const capture = useCallback(async (): Promise<Blob | null> => {
        const video = videoRef.current;

        if (!video || video.readyState < 2) {
            return null;
        }

        const canvas = document.createElement('canvas');
        const scale = Math.min(
            1,
            1280 / Math.max(video.videoWidth, video.videoHeight),
        );
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas
            .getContext('2d')
            ?.drawImage(video, 0, 0, canvas.width, canvas.height);

        return new Promise((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.82),
        );
    }, []);

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

    return {
        videoRef,
        ready,
        error,
        capture,
        torchAvailable,
        torchOn,
        toggleTorch,
    };
}
