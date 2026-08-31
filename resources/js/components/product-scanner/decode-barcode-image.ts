import type { ReaderOptions } from 'zxing-wasm/reader';
import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

const locateZxingWasm = () => zxingReaderWasmUrl;

const decodeWithNativeDetector = async (image: Blob): Promise<string> => {
    if (!window.BarcodeDetector || !('createImageBitmap' in window)) {
        return '';
    }

    const bitmap = await createImageBitmap(image);

    try {
        const results = await new window.BarcodeDetector().detect(bitmap);

        return results[0]?.rawValue?.trim() ?? '';
    } catch {
        return '';
    } finally {
        bitmap.close();
    }
};

type Crop = { x: number; y: number; width: number; height: number };

const scanCrops: Crop[] = [
    { x: 0, y: 0, width: 1, height: 1 },
    { x: 0.3, y: 0, width: 0.4, height: 1 },
    { x: 0.15, y: 0.1, width: 0.7, height: 0.8 },
    { x: 0.3, y: 0.25, width: 0.4, height: 0.65 },
    { x: 0.35, y: 0.3, width: 0.3, height: 0.5 },
    { x: 0, y: 0.2, width: 1, height: 0.6 },
];

const createScanImages = async (image: Blob): Promise<Blob[]> => {
    const bitmap = await createImageBitmap(image);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const sourceWidth = Math.round(bitmap.width * scale);
    const sourceHeight = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const images: Blob[] = [];

    if (!context) {
        bitmap.close();

        return [image];
    }

    for (const crop of scanCrops) {
        const x = Math.round(sourceWidth * crop.x);
        const y = Math.round(sourceHeight * crop.y);
        const width = Math.round(sourceWidth * crop.width);
        const height = Math.round(sourceHeight * crop.height);
        canvas.width = width;
        canvas.height = height;
        context.filter = 'none';
        context.drawImage(bitmap, -x, -y, sourceWidth, sourceHeight);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/jpeg', 0.94),
        );

        if (blob) {
            images.push(blob);
        }
    }

    bitmap.close();

    return images;
};

const decodeWithZxingWasm = async (images: Blob[]): Promise<string> => {
    const { prepareZXingModule, readBarcodes } =
        await import('zxing-wasm/reader');
    prepareZXingModule({
        overrides: { locateFile: locateZxingWasm },
    });
    const options: ReaderOptions = {
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
        tryDownscale: true,
        tryDenoise: true,
        formats: ['Linear-Codes', 'Matrix-Codes'],
        maxNumberOfSymbols: 1,
    };
    const results = await Promise.all(
        images.map((image) => readBarcodes(image, options)),
    );

    return results.flat()[0]?.text.trim() ?? '';
};

export async function decodeBarcodeImage(image: Blob): Promise<string> {
    const nativeValue = await decodeWithNativeDetector(image);

    if (nativeValue) {
        return nativeValue;
    }

    const images = await createScanImages(image);

    return Promise.race([
        decodeWithZxingWasm(images),
        new Promise<string>((resolve) =>
            window.setTimeout(() => resolve(''), 12000),
        ),
    ]);
}
